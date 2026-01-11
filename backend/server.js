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

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_...';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

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

// Database pool
let pool;

async function initDatabase() {
  // Create connection without database first
  const tempConnection = await mysql.createConnection({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
  });

  // Create database if not exists
  await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await tempConnection.end();

  // Create pool with database
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
      status ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
      payment_intent_id VARCHAR(255),
      shipping_address JSON,
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Stripe webhook needs raw body
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await pool.execute('UPDATE orders SET status = ? WHERE payment_intent_id = ?', ['paid', paymentIntent.id]);
      console.log('Payment succeeded:', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await pool.execute('UPDATE orders SET status = ? WHERE payment_intent_id = ?', ['failed', failedPayment.id]);
      console.log('Payment failed:', failedPayment.id);
      break;
  }

  res.json({ received: true });
});

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

// ============ AUTH ROUTES ============

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

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

app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i hasło są wymagane' });
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
  const { currentPassword, newPassword } = req.body;

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

app.post('/auth/request-reset', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email jest wymagany' });
  }

  // In production, this would send an email with a reset link
  // For now, just return success (you can implement email sending later)
  res.json({ success: true, message: 'Jeśli konto istnieje, email z linkiem do resetowania hasła został wysłany.' });
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

    // Parse JSON fields
    const parsed = products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
      specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications) : (p.specifications || [])
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
      specifications: typeof product.specifications === 'string' ? JSON.parse(product.specifications) : (product.specifications || [])
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/products', authenticate, requireAdmin, upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, specifications, featured } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Nazwa i cena są wymagane' });
  }

  try {
    const id = uuidv4();
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    await pool.execute(`
      INSERT INTO products (id, name, description, long_description, price, category, availability, images, specifications, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      name,
      description || '',
      long_description || '',
      parseFloat(price),
      category || 'Inne',
      availability || 'available',
      JSON.stringify(images),
      specifications || '[]',
      featured === 'true' || featured === true
    ]);

    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    const product = products[0];

    res.status(201).json({
      ...product,
      price: parseFloat(product.price),
      images: JSON.parse(product.images || '[]'),
      specifications: JSON.parse(product.specifications || '[]')
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/products/:id', authenticate, requireAdmin, upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, specifications, existingImages, featured } = req.body;

  try {
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const product = products[0];
    let images = existingImages ? JSON.parse(existingImages) : JSON.parse(product.images || '[]');
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/${f.filename}`);
      images = [...images, ...newImages];
    }

    await pool.execute(`
      UPDATE products 
      SET name = ?, description = ?, long_description = ?, price = ?, category = ?, availability = ?, images = ?, specifications = ?, featured = ?
      WHERE id = ?
    `, [
      name || product.name,
      description ?? product.description,
      long_description ?? product.long_description,
      price ? parseFloat(price) : product.price,
      category || product.category,
      availability || product.availability,
      JSON.stringify(images),
      specifications || product.specifications,
      featured === 'true' || featured === true,
      req.params.id
    ]);

    const [updated] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const updatedProduct = updated[0];

    res.json({
      ...updatedProduct,
      price: parseFloat(updatedProduct.price),
      images: JSON.parse(updatedProduct.images || '[]'),
      specifications: JSON.parse(updatedProduct.specifications || '[]')
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

    // Delete associated images
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
    // Only admin or order owner can view
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
  const { status } = req.body;
  const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Nieprawidłowy status' });
  }

  try {
    await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ STRIPE PAYMENTS ============

app.post('/checkout/create-payment-intent', async (req, res) => {
  const { items, shipping_address, customer_email, customer_name, customer_phone } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Koszyk jest pusty' });
  }

  if (!shipping_address || !shipping_address.street || !shipping_address.city || !shipping_address.postalCode) {
    return res.status(400).json({ error: 'Adres dostawy jest wymagany' });
  }

  if (!customer_email) {
    return res.status(400).json({ error: 'Email jest wymagany' });
  }

  try {
    // Validate products exist and prices are correct
    let calculatedTotal = 0;
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
      if (Math.abs(dbPrice - item.price) > 0.01) {
        return res.status(400).json({ error: `Cena produktu "${product.name}" uległa zmianie. Odśwież stronę.` });
      }

      calculatedTotal += dbPrice * item.quantity;
    }

    const amountInCents = Math.round(calculatedTotal * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'pln',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customer_email: customer_email || '',
        customer_name: customer_name || ''
      }
    });

    // Create order
    const orderId = uuidv4();
    await pool.execute(`
      INSERT INTO orders (id, items, total, payment_intent_id, shipping_address, customer_email, customer_name, customer_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      JSON.stringify(items),
      calculatedTotal,
      paymentIntent.id,
      JSON.stringify(shipping_address),
      customer_email || '',
      customer_name || '',
      customer_phone || ''
    ]);

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Błąd tworzenia płatności' });
  }
});

// Get Stripe publishable key
app.get('/checkout/config', (req, res) => {
  res.json({
    publishableKey: STRIPE_PUBLISHABLE_KEY
  });
});

// ============ ADMIN STATS ============

app.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [[{ count: totalProducts }]] = await pool.execute('SELECT COUNT(*) as count FROM products');
    const [[{ count: totalOrders }]] = await pool.execute('SELECT COUNT(*) as count FROM orders');
    const [[{ count: totalUsers }]] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [[{ sum: revenue }]] = await pool.execute("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE status = 'paid'");
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
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
