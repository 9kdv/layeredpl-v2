const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_...';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// SMTP Config (Brevo)
const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '9b2973001@smtp-brevo.com';
const SMTP_PASS = process.env.SMTP_PASSWORD || '';
const MAIL_FROM = process.env.MAIL_FROM || 'sklep@layered.pl';

// MySQL config
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'layered',
  waitForConnections: true,
  connectionLimit: 10,
};

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Database pool
let pool;

async function initDatabase() {
  const tempConnection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });

  await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await tempConnection.end();

  pool = mysql.createPool(DB_CONFIG);

  // Create tables
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS saved_addresses (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      label VARCHAR(100),
      street VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      phone VARCHAR(50),
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS saved_payments (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      stripe_payment_method_id VARCHAR(255) NOT NULL,
      brand VARCHAR(50),
      last4 VARCHAR(4),
      exp_month INT,
      exp_year INT,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      long_description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100),
      availability ENUM('available', 'low_stock', 'unavailable') DEFAULT 'available',
      images JSON,
      specifications JSON,
      customization JSON,
      featured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      items JSON NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'paid', 'processing', 'awaiting_info', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded') DEFAULT 'pending',
      payment_intent_id VARCHAR(255),
      shipping_address JSON,
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      delivery_method VARCHAR(50),
      delivery_cost DECIMAL(10, 2) DEFAULT 0,
      admin_notes TEXT,
      tracking_number VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customization_files (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36),
      product_id VARCHAR(36),
      cart_item_id VARCHAR(36),
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size INT,
      file_type VARCHAR(100),
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // Create default admin if not exists
  const [admins] = await pool.execute('SELECT id FROM users WHERE role = ?', ['admin']);
  if (admins.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
      [uuidv4(), 'admin@layered.pl', hashedPassword, 'admin']
    );
    console.log('Default admin created: admin@layered.pl / admin123');
  }

  console.log('Database initialized successfully');
}

// Email sending function
async function sendOrderEmail(type, order, customerEmail) {
  if (!SMTP_PASS) {
    console.log('SMTP not configured, skipping email');
    return;
  }

  const subjects = {
    confirmation: `Potwierdzenie zamówienia #${order.id.slice(0, 8).toUpperCase()}`,
    shipped: `Twoje zamówienie zostało wysłane #${order.id.slice(0, 8).toUpperCase()}`,
    delivered: `Zamówienie dostarczone #${order.id.slice(0, 8).toUpperCase()}`,
    awaiting_info: `Wymagane działanie - zamówienie #${order.id.slice(0, 8).toUpperCase()}`,
  };

  const formatCustomizations = (items) => {
    return items.map(item => {
      let customInfo = '';
      if (item.customizations && item.customizations.length > 0) {
        customInfo = item.customizations.map(c => {
          let value = '';
          if (c.selectedColors?.length) value = c.selectedColors.map(col => col.name).join(', ');
          else if (c.selectedMaterial) value = c.selectedMaterial.name;
          else if (c.selectedSize) value = c.selectedSize.name;
          else if (c.textValue) value = c.textValue;
          else if (c.uploadedFiles?.length) value = `${c.uploadedFiles.length} plik(ów)`;
          else if (c.selectedOption) value = c.selectedOption.label;
          return `${c.optionLabel}: ${value}`;
        }).join(', ');
      }
      const itemPrice = (item.price + (item.customizationPrice || 0)) * item.quantity;
      return `<li>${item.name} x${item.quantity} - ${itemPrice.toFixed(2)} zł${customInfo ? ` (${customInfo})` : ''}${item.nonRefundable ? ' <em style="color:#888;">(bez zwrotu)</em>' : ''}</li>`;
    }).join('');
  };

  const templates = {
    confirmation: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8B5CF6;">Dziękujemy za zamówienie!</h1>
        <p>Twoje zamówienie <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> zostało przyjęte.</p>
        <h3>Podsumowanie:</h3>
        <ul>${formatCustomizations(order.items)}</ul>
        <p><strong>Suma: ${order.total.toFixed(2)} zł</strong></p>
        <p style="margin-top: 20px;">Powiadomimy Cię, gdy zamówienie zostanie wysłane.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">layered.pl - Produkty drukowane w 3D</p>
      </div>
    `,
    shipped: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8B5CF6;">Twoje zamówienie jest w drodze!</h1>
        <p>Zamówienie <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> zostało wysłane.</p>
        ${order.tracking_number ? `<p>Numer śledzenia: <strong>${order.tracking_number}</strong></p>` : ''}
        <p>Spodziewaj się dostawy w ciągu 1-3 dni roboczych.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">layered.pl - Produkty drukowane w 3D</p>
      </div>
    `,
    delivered: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8B5CF6;">Zamówienie dostarczone!</h1>
        <p>Zamówienie <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> zostało dostarczone.</p>
        <p>Dziękujemy za zakupy w layered.pl!</p>
        <p>Jeśli masz pytania, skontaktuj się z nami.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">layered.pl - Produkty drukowane w 3D</p>
      </div>
    `,
    awaiting_info: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #F59E0B;">Wymagane działanie</h1>
        <p>Zamówienie <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> wymaga Twojej uwagi.</p>
        ${order.admin_notes ? `<p><strong>Uwaga od nas:</strong> ${order.admin_notes}</p>` : ''}
        <p>Prosimy o kontakt pod adresem <a href="mailto:kontakt@layered.pl">kontakt@layered.pl</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">layered.pl - Produkty drukowane w 3D</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail({
      from: `"Layered.pl" <${MAIL_FROM}>`,
      to: customerEmail,
      bcc: 'admin@layered.pl',
      subject: subjects[type],
      html: templates[type],
    });
    console.log(`Email sent: ${type} to ${customerEmail}`);
  } catch (err) {
    console.error('Email error:', err);
  }
}

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Parse JSON for all routes
app.use(express.json());

// File upload setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak autoryzacji' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Nieprawidłowy token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Brak uprawnień administratora' });
  }
  next();
};

// Rate limiting (simple in-memory)
const rateLimit = {};
const rateLimiter = (limit = 100, windowMs = 60000) => (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (!rateLimit[ip]) rateLimit[ip] = { count: 0, start: now };
  
  if (now - rateLimit[ip].start > windowMs) {
    rateLimit[ip] = { count: 0, start: now };
  }
  
  rateLimit[ip].count++;
  
  if (rateLimit[ip].count > limit) {
    return res.status(429).json({ error: 'Zbyt wiele żądań' });
  }
  
  next();
};

// Input validation helpers
const sanitize = (str) => str?.toString().trim().slice(0, 1000) || '';
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ============ AUTH ROUTES ============

app.post('/auth/login', rateLimiter(10, 60000), async (req, res) => {
  const email = sanitize(req.body.email);
  const password = sanitize(req.body.password);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i hasło są wymagane' });
  }

  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/auth/register', rateLimiter(5, 60000), async (req, res) => {
  const email = sanitize(req.body.email);
  const password = sanitize(req.body.password);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i hasło są wymagane' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Nieprawidłowy format email' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
    }

    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    await pool.execute('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [id, email, hashedPassword]);

    // Create empty profile
    await pool.execute('INSERT INTO user_profiles (id, user_id) VALUES (?, ?)', [uuidv4(), id]);

    const token = jwt.sign({ id, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id, email, role: 'user' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/auth/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/auth/change-password', authenticate, async (req, res) => {
  const currentPassword = sanitize(req.body.currentPassword);
  const newPassword = sanitize(req.body.newPassword);

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Obecne i nowe hasło są wymagane' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Nowe hasło musi mieć co najmniej 6 znaków' });
  }

  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

    const user = users[0];
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Nieprawidłowe obecne hasło' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/auth/request-reset', rateLimiter(3, 60000), async (req, res) => {
  const email = sanitize(req.body.email);

  if (!email) {
    return res.status(400).json({ error: 'Email jest wymagany' });
  }

  // TODO: Implement actual password reset with email
  res.json({ success: true, message: 'Jeśli konto istnieje, email z linkiem do resetowania hasła został wysłany.' });
});

// ============ USER PROFILE ROUTES ============

app.get('/user/profile', authenticate, async (req, res) => {
  try {
    const [profiles] = await pool.execute('SELECT * FROM user_profiles WHERE user_id = ?', [req.user.id]);
    if (profiles.length === 0) {
      // Create profile if doesn't exist
      const id = uuidv4();
      await pool.execute('INSERT INTO user_profiles (id, user_id) VALUES (?, ?)', [id, req.user.id]);
      return res.json({ id, user_id: req.user.id });
    }
    res.json(profiles[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/user/profile', authenticate, async (req, res) => {
  const first_name = sanitize(req.body.first_name);
  const last_name = sanitize(req.body.last_name);
  const phone = sanitize(req.body.phone);

  try {
    const [profiles] = await pool.execute('SELECT id FROM user_profiles WHERE user_id = ?', [req.user.id]);
    
    if (profiles.length === 0) {
      const id = uuidv4();
      await pool.execute(
        'INSERT INTO user_profiles (id, user_id, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)',
        [id, req.user.id, first_name, last_name, phone]
      );
    } else {
      await pool.execute(
        'UPDATE user_profiles SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?',
        [first_name, last_name, phone, req.user.id]
      );
    }

    const [updated] = await pool.execute('SELECT * FROM user_profiles WHERE user_id = ?', [req.user.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ SAVED ADDRESSES ROUTES ============

app.get('/user/addresses', authenticate, async (req, res) => {
  try {
    const [addresses] = await pool.execute(
      'SELECT * FROM saved_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(addresses);
  } catch (err) {
    console.error('Get addresses error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/user/addresses', authenticate, async (req, res) => {
  const { label, street, city, postal_code, phone, is_default } = req.body;

  if (!street || !city || !postal_code) {
    return res.status(400).json({ error: 'Ulica, miasto i kod pocztowy są wymagane' });
  }

  try {
    const id = uuidv4();

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.execute('UPDATE saved_addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }

    await pool.execute(
      'INSERT INTO saved_addresses (id, user_id, label, street, city, postal_code, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.id, sanitize(label), sanitize(street), sanitize(city), sanitize(postal_code), sanitize(phone), !!is_default]
    );

    const [addresses] = await pool.execute('SELECT * FROM saved_addresses WHERE id = ?', [id]);
    res.status(201).json(addresses[0]);
  } catch (err) {
    console.error('Add address error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/user/addresses/:id', authenticate, async (req, res) => {
  const { label, street, city, postal_code, phone, is_default } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM saved_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Adres nie znaleziony' });

    if (is_default) {
      await pool.execute('UPDATE saved_addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
    }

    await pool.execute(
      'UPDATE saved_addresses SET label = ?, street = ?, city = ?, postal_code = ?, phone = ?, is_default = ? WHERE id = ?',
      [sanitize(label), sanitize(street), sanitize(city), sanitize(postal_code), sanitize(phone), !!is_default, req.params.id]
    );

    const [updated] = await pool.execute('SELECT * FROM saved_addresses WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update address error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/user/addresses/:id', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM saved_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Adres nie znaleziony' });

    await pool.execute('DELETE FROM saved_addresses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ SAVED PAYMENTS ROUTES ============

app.get('/user/payments', authenticate, async (req, res) => {
  try {
    const [payments] = await pool.execute(
      'SELECT id, brand, last4, exp_month, exp_year, is_default, created_at FROM saved_payments WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(payments);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ PRODUCTS ROUTES ============

app.get('/products', async (req, res) => {
  const { category, search, featured } = req.query;

  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category && category !== 'all' && category !== 'Wszystkie') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (featured === 'true') {
      query += ' AND featured = TRUE';
    }

    query += ' ORDER BY created_at DESC';
    const [products] = await pool.execute(query, params);

    const parsed = products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
      specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications) : (p.specifications || []),
      customization: p.customization ? (typeof p.customization === 'string' ? JSON.parse(p.customization) : p.customization) : null
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const product = products[0];
    res.json({
      ...product,
      price: parseFloat(product.price),
      images: typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []),
      specifications: typeof product.specifications === 'string' ? JSON.parse(product.specifications) : (product.specifications || []),
      customization: product.customization ? (typeof product.customization === 'string' ? JSON.parse(product.customization) : product.customization) : null
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/products', authenticate, requireAdmin, upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, specifications, customization, featured } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Nazwa i cena są wymagane' });
  }

  try {
    const id = uuidv4();
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    // Parse customization
    let customizationData = null;
    if (customization) {
      try {
        customizationData = typeof customization === 'string' ? customization : JSON.stringify(customization);
      } catch (e) {
        customizationData = null;
      }
    }

    await pool.execute(`
      INSERT INTO products (id, name, description, long_description, price, category, availability, images, specifications, customization, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      sanitize(name),
      sanitize(description),
      sanitize(long_description),
      parseFloat(price),
      sanitize(category) || 'Inne',
      availability || 'available',
      JSON.stringify(images),
      specifications || '[]',
      customizationData,
      featured === 'true' || featured === true
    ]);

    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    const product = products[0];

    res.status(201).json({
      ...product,
      price: parseFloat(product.price),
      images: JSON.parse(product.images || '[]'),
      specifications: JSON.parse(product.specifications || '[]'),
      customization: product.customization ? JSON.parse(product.customization) : null
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/products/:id', authenticate, requireAdmin, upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, specifications, customization, existingImages, featured } = req.body;

  try {
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const product = products[0];
    let images = existingImages ? JSON.parse(existingImages) : JSON.parse(product.images || '[]');
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/${f.filename}`);
      images = [...images, ...newImages];
    }

    // Parse customization
    let customizationData = product.customization;
    if (customization !== undefined) {
      try {
        customizationData = customization === null ? null : (typeof customization === 'string' ? customization : JSON.stringify(customization));
      } catch (e) {
        // Keep existing
      }
    }

    await pool.execute(`
      UPDATE products 
      SET name = ?, description = ?, long_description = ?, price = ?, category = ?, availability = ?, images = ?, specifications = ?, customization = ?, featured = ?
      WHERE id = ?
    `, [
      sanitize(name) || product.name,
      description !== undefined ? sanitize(description) : product.description,
      long_description !== undefined ? sanitize(long_description) : product.long_description,
      price ? parseFloat(price) : product.price,
      sanitize(category) || product.category,
      availability || product.availability,
      JSON.stringify(images),
      specifications || product.specifications,
      customizationData,
      featured === 'true' || featured === true,
      req.params.id
    ]);

    const [updated] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const updatedProduct = updated[0];

    res.json({
      ...updatedProduct,
      price: parseFloat(updatedProduct.price),
      images: JSON.parse(updatedProduct.images || '[]'),
      specifications: JSON.parse(updatedProduct.specifications || '[]'),
      customization: updatedProduct.customization ? JSON.parse(updatedProduct.customization) : null
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/products/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT images FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const images = JSON.parse(products[0].images || '[]');
    images.forEach(img => {
      const filePath = path.join(__dirname, img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ CATEGORIES ============

app.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL');
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ ORDERS ROUTES ============

app.get('/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders ORDER BY created_at DESC');
    const parsed = orders.map(o => ({
      ...o,
      total: parseFloat(o.total),
      items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
      shipping_address: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {})
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/orders/my', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE customer_email = (SELECT email FROM users WHERE id = ?) OR user_id = ? ORDER BY created_at DESC', 
      [req.user.id, req.user.id]
    );
    const parsed = orders.map(o => ({
      ...o,
      total: parseFloat(o.total),
      items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
      shipping_address: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {})
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Zamówienie nie znalezione' });

    const order = orders[0];
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Brak dostępu' });
    }

    res.json({
      ...order,
      total: parseFloat(order.total),
      items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
      shipping_address: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {})
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/orders/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { status, admin_notes, tracking_number } = req.body;
  const validStatuses = ['pending', 'paid', 'processing', 'awaiting_info', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Nieprawidłowy status' });
  }

  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Zamówienie nie znalezione' });

    const order = orders[0];
    const previousStatus = order.status;

    await pool.execute(
      'UPDATE orders SET status = ?, admin_notes = ?, tracking_number = ? WHERE id = ?', 
      [status, admin_notes || order.admin_notes, tracking_number || order.tracking_number, req.params.id]
    );

    // Send email notifications on status change
    if (previousStatus !== status && order.customer_email) {
      order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      order.total = parseFloat(order.total);
      order.tracking_number = tracking_number || order.tracking_number;
      order.admin_notes = admin_notes || order.admin_notes;

      if (status === 'shipped') {
        await sendOrderEmail('shipped', order, order.customer_email);
      } else if (status === 'delivered') {
        await sendOrderEmail('delivered', order, order.customer_email);
      } else if (status === 'awaiting_info') {
        await sendOrderEmail('awaiting_info', order, order.customer_email);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Upload customization files
app.post('/upload/customization', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Brak plików' });
    }

    const uploadedFiles = req.files.map(f => ({
      id: uuidv4(),
      name: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size,
      type: f.mimetype
    }));

    res.json({ files: uploadedFiles });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Błąd podczas przesyłania pliku' });
  }
});

// Get order customization files (admin)
app.get('/orders/:id/files', authenticate, requireAdmin, async (req, res) => {
  try {
    const [files] = await pool.execute('SELECT * FROM customization_files WHERE order_id = ?', [req.params.id]);
    res.json(files);
  } catch (err) {
    console.error('Get order files error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ INPOST SEARCH & VERIFICATION ============

app.get('/inpost/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 3) {
    return res.json([]);
  }

  // In production, use InPost ShipX API:
  // GET https://api-shipx-pl.easypack24.net/v1/points?name={query}&type=parcel_locker
  
  // Mock response for testing
  const mockLockers = [
    { name: 'KRA010', address: 'ul. Przykładowa 1', city: 'Kraków', latitude: 50.0647, longitude: 19.9450 },
    { name: 'KRA015', address: 'ul. Główna 15', city: 'Kraków', latitude: 50.0614, longitude: 19.9372 },
    { name: 'WAW001', address: 'ul. Centralna 15', city: 'Warszawa', latitude: 52.2297, longitude: 21.0122 },
    { name: 'WAW002', address: 'ul. Nowa 23', city: 'Warszawa', latitude: 52.2370, longitude: 21.0175 },
    { name: 'POZ005', address: 'ul. Główna 7', city: 'Poznań', latitude: 52.4064, longitude: 16.9252 },
    { name: 'GDA003', address: 'ul. Morska 12', city: 'Gdańsk', latitude: 54.3520, longitude: 18.6466 },
    { name: 'WRO008', address: 'ul. Rynek 5', city: 'Wrocław', latitude: 51.1079, longitude: 17.0385 },
    { name: 'KAT002', address: 'ul. Przemysłowa 8', city: 'Katowice', latitude: 50.2649, longitude: 19.0238 },
    { name: 'LDZ004', address: 'ul. Piotrkowska 100', city: 'Łódź', latitude: 51.7592, longitude: 19.4560 },
  ];

  const query = q.toLowerCase();
  const results = mockLockers.filter(l => 
    l.name.toLowerCase().includes(query) || 
    l.city.toLowerCase().includes(query) || 
    l.address.toLowerCase().includes(query)
  ).slice(0, 10);

  res.json(results);
});

app.get('/inpost/verify/:code', async (req, res) => {
  const { code } = req.params;
  
  const lockerPattern = /^[A-Z]{3}\d{2,3}[A-Z]?$/i;
  
  if (!lockerPattern.test(code)) {
    return res.json({ valid: false });
  }

  // Mock response for testing - in production use InPost API
  const mockLockers = {
    'KRA010': 'Kraków, ul. Przykładowa 1',
    'KRA015': 'Kraków, ul. Główna 15',
    'WAW001': 'Warszawa, ul. Centralna 15',
    'WAW002': 'Warszawa, ul. Nowa 23',
    'POZ005': 'Poznań, ul. Główna 7',
    'GDA003': 'Gdańsk, ul. Morska 12',
    'WRO008': 'Wrocław, ul. Rynek 5',
    'KAT002': 'Katowice, ul. Przemysłowa 8',
    'LDZ004': 'Łódź, ul. Piotrkowska 100',
  };

  const upperCode = code.toUpperCase();
  if (mockLockers[upperCode]) {
    return res.json({
      valid: true,
      name: upperCode,
      address: mockLockers[upperCode]
    });
  }

  if (lockerPattern.test(code)) {
    return res.json({
      valid: true,
      name: upperCode,
      address: `Paczkomat ${upperCode}`
    });
  }

  res.json({ valid: false });
});

// ============ STRIPE PAYMENTS ============

// Create payment intent WITHOUT creating order
// Order is created only after successful payment verification
app.post('/checkout/create-payment-intent', async (req, res) => {
  const { items, shipping_address, customer_email, customer_name, customer_phone, shipping_cost, delivery_method } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Koszyk jest pusty' });
  }

  if (!shipping_address || !shipping_address.street) {
    return res.status(400).json({ error: 'Adres dostawy jest wymagany' });
  }

  if (!customer_email || !validateEmail(customer_email)) {
    return res.status(400).json({ error: 'Prawidłowy email jest wymagany' });
  }

  try {
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const [products] = await pool.execute('SELECT id, name, price, availability FROM products WHERE id = ?', [item.id]);
      
      if (products.length === 0) {
        return res.status(400).json({ error: `Produkt "${item.name}" nie istnieje` });
      }

      const product = products[0];
      
      if (product.availability === 'unavailable') {
        return res.status(400).json({ error: `Produkt "${product.name}" jest niedostępny` });
      }

      const dbPrice = parseFloat(product.price);
      const customizationPrice = parseFloat(item.customizationPrice) || 0;
      const itemTotal = (dbPrice + customizationPrice) * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        id: item.id,
        cartItemId: item.cartItemId,
        name: product.name,
        price: dbPrice,
        quantity: item.quantity,
        image: item.image,
        customizations: item.customizations || [],
        customizationPrice: customizationPrice,
        nonRefundable: item.nonRefundable || false,
        nonRefundableAccepted: item.nonRefundableAccepted || false
      });
    }

    const shippingAmount = parseFloat(shipping_cost) || 0;
    const finalTotal = calculatedTotal + shippingAmount;
    const amountInCents = Math.round(finalTotal * 100);

    // Store order data in payment intent metadata for later order creation
    const orderData = {
      items: JSON.stringify(validatedItems),
      shipping_address: JSON.stringify({ ...shipping_address, shipping_cost: shippingAmount }),
      customer_email: sanitize(customer_email),
      customer_name: sanitize(customer_name) || '',
      customer_phone: sanitize(customer_phone) || '',
      delivery_method: delivery_method || 'courier',
      delivery_cost: shippingAmount.toString(),
      total: finalTotal.toString()
    };

    // Create payment intent with order data in metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'pln',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customer_email: orderData.customer_email,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        shipping_cost: shippingAmount.toString(),
        delivery_method: orderData.delivery_method,
        // Items and address stored as metadata (limited to 500 chars each, so we'll retrieve from frontend)
      }
    });

    // Return client secret - NO order created yet
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      calculatedTotal: finalTotal,
      validatedItems: validatedItems
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Błąd tworzenia płatności' });
  }
});

// Create order AFTER verifying payment was successful
// This is the correct flow - order is only created when payment is confirmed
app.post('/checkout/create-order', async (req, res) => {
  const { 
    payment_intent_id, 
    items, 
    shipping_address, 
    customer_email, 
    customer_name, 
    customer_phone, 
    shipping_cost,
    delivery_method,
    save_address
  } = req.body;

  if (!payment_intent_id) {
    return res.status(400).json({ error: 'payment_intent_id jest wymagany' });
  }

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Brak produktów w zamówieniu' });
  }

  try {
    // CRITICAL: Verify payment status with Stripe BEFORE creating order
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Płatność nie została zakończona. Zamówienie nie zostało utworzone.',
        status: paymentIntent.status 
      });
    }

    // Check if order with this payment intent already exists (idempotency)
    const [existingOrders] = await pool.execute(
      'SELECT id FROM orders WHERE payment_intent_id = ?', 
      [payment_intent_id]
    );

    if (existingOrders.length > 0) {
      // Order already exists, return it
      return res.json({ 
        success: true, 
        orderId: existingOrders[0].id,
        status: 'paid',
        message: 'Zamówienie już istnieje'
      });
    }

    // Validate all products exist and calculate prices
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const [products] = await pool.execute('SELECT id, name, price FROM products WHERE id = ?', [item.id]);
      
      if (products.length === 0) {
        return res.status(400).json({ error: `Produkt "${item.name}" nie istnieje` });
      }

      const product = products[0];
      const dbPrice = parseFloat(product.price);
      const customizationPrice = parseFloat(item.customizationPrice) || 0;
      const itemTotal = (dbPrice + customizationPrice) * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        id: item.id,
        cartItemId: item.cartItemId,
        name: product.name,
        price: dbPrice,
        quantity: item.quantity,
        image: item.image,
        customizations: item.customizations || [],
        customizationPrice: customizationPrice,
        nonRefundable: item.nonRefundable || false,
        nonRefundableAccepted: item.nonRefundableAccepted || false
      });
    }

    const shippingAmount = parseFloat(shipping_cost) || 0;
    const finalTotal = calculatedTotal + shippingAmount;

    // Verify amount matches what was charged
    const chargedAmount = paymentIntent.amount / 100; // Convert from cents
    if (Math.abs(chargedAmount - finalTotal) > 0.01) {
      console.error(`Price mismatch! Charged: ${chargedAmount}, Calculated: ${finalTotal}`);
      return res.status(400).json({ 
        error: 'Niezgodność kwoty. Skontaktuj się z obsługą.',
        charged: chargedAmount,
        calculated: finalTotal
      });
    }

    // Create order
    const orderId = uuidv4();
    
    // Get user ID if logged in
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;

        // Save address if requested
        if (save_address && shipping_address && shipping_address.street && !shipping_address.street.startsWith('Paczkomat')) {
          await pool.execute(
            'INSERT INTO saved_addresses (id, user_id, label, street, city, postal_code, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), userId, 'Zamówienie', sanitize(shipping_address.street), sanitize(shipping_address.city), sanitize(shipping_address.postalCode || ''), sanitize(shipping_address.phone || customer_phone || ''), false]
          );
        }
      } catch (e) {
        // Invalid token, continue without user
      }
    }

    // Insert order with status 'paid' (since we verified payment)
    await pool.execute(`
      INSERT INTO orders (id, user_id, items, total, status, payment_intent_id, shipping_address, customer_email, customer_name, customer_phone, delivery_method, delivery_cost)
      VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      userId,
      JSON.stringify(validatedItems),
      finalTotal,
      payment_intent_id,
      JSON.stringify({ ...shipping_address, shipping_cost: shippingAmount }),
      sanitize(customer_email),
      sanitize(customer_name) || '',
      sanitize(customer_phone) || '',
      delivery_method || 'courier',
      shippingAmount
    ]);

    // Save customization files to database
    for (const item of validatedItems) {
      if (item.customizations) {
        for (const customization of item.customizations) {
          if (customization.uploadedFiles) {
            for (const file of customization.uploadedFiles) {
              await pool.execute(`
                INSERT INTO customization_files (id, order_id, product_id, cart_item_id, file_name, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                file.id || uuidv4(),
                orderId,
                item.id,
                item.cartItemId,
                file.name,
                file.url,
                file.size || 0,
                file.type || 'image'
              ]);
            }
          }
        }
      }
    }

    // Prepare order object for email
    const orderForEmail = {
      id: orderId,
      items: validatedItems,
      total: finalTotal,
      customer_email: sanitize(customer_email),
      shipping_address: shipping_address
    };

    // Send confirmation email
    await sendOrderEmail('confirmation', orderForEmail, customer_email);

    console.log(`✅ Order ${orderId} created after verified payment ${payment_intent_id}`);

    res.json({ 
      success: true, 
      orderId: orderId,
      status: 'paid'
    });
  } catch (err) {
    console.error('Create order error:', err);
    
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Nieprawidłowy payment intent' });
    }
    
    res.status(500).json({ error: 'Błąd tworzenia zamówienia' });
  }
});

// Legacy endpoint - redirect to new flow
app.post('/checkout/verify-payment', async (req, res) => {
  const { payment_intent_id } = req.body;

  if (!payment_intent_id) {
    return res.status(400).json({ error: 'payment_intent_id jest wymagany' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Płatność nie została zakończona',
        status: paymentIntent.status 
      });
    }

    // Check if order exists
    const [orders] = await pool.execute(
      'SELECT id, status FROM orders WHERE payment_intent_id = ?', 
      [payment_intent_id]
    );

    if (orders.length === 0) {
      // Order doesn't exist yet - client needs to call create-order
      return res.status(404).json({ 
        error: 'Zamówienie nie zostało utworzone. Użyj /checkout/create-order.',
        paymentVerified: true,
        needsOrderCreation: true
      });
    }

    res.json({ 
      success: true, 
      orderId: orders[0].id,
      status: orders[0].status
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Nieprawidłowy payment intent' });
    }
    
    res.status(500).json({ error: 'Błąd weryfikacji płatności' });
  }
});

// Get order status by payment intent (for redirects from Stripe)
app.get('/checkout/order-status', async (req, res) => {
  const { payment_intent } = req.query;

  if (!payment_intent) {
    return res.status(400).json({ error: 'payment_intent jest wymagany' });
  }

  try {
    const [orders] = await pool.execute(
      'SELECT id, status, customer_email FROM orders WHERE payment_intent_id = ?',
      [payment_intent]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Zamówienie nie znalezione' });
    }

    const order = orders[0];
    res.json({ 
      orderId: order.id, 
      status: order.status,
      email: order.customer_email
    });
  } catch (err) {
    console.error('Get order status error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/checkout/config', (req, res) => {
  res.json({
    publishableKey: STRIPE_PUBLISHABLE_KEY
  });
});

// ============ PUBLIC STATS ============

app.get('/stats/public', async (req, res) => {
  try {
    const [[{ count: totalProducts }]] = await pool.execute('SELECT COUNT(*) as count FROM products');
    const [[{ count: totalOrders }]] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered')");
    
    res.json({
      totalProducts,
      totalOrders,
      avgRating: 4.9,
      happyCustomers: Math.max(totalOrders * 2, 150)
    });
  } catch (err) {
    console.error('Public stats error:', err);
    res.json({ totalProducts: 24, totalOrders: 500, avgRating: 4.9, happyCustomers: 150 });
  }
});

// ============ ADMIN STATS ============

app.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [[{ count: totalProducts }]] = await pool.execute('SELECT COUNT(*) as count FROM products');
    const [[{ count: totalOrders }]] = await pool.execute('SELECT COUNT(*) as count FROM orders');
    const [[{ count: totalUsers }]] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [[{ sum: revenue }]] = await pool.execute("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered')");
    const [[{ count: pendingOrders }]] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      revenue: parseFloat(revenue) || 0,
      pendingOrders
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ START SERVER ============

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Layered API running on port ${PORT}`);
    console.log(`📦 Database: ${DB_CONFIG.database}@${DB_CONFIG.host}`);
    console.log(`📧 SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});