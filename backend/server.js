const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Database setup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'layered.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    availability TEXT DEFAULT 'available',
    images TEXT,
    specifications TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_intent_id TEXT,
    shipping_address TEXT,
    customer_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create default admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)').run(
    uuidv4(),
    'admin@layered.pl',
    hashedPassword,
    'admin'
  );
  console.log('Default admin created: admin@layered.pl / admin123');
}

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Stripe webhook needs raw body
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
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
      db.prepare('UPDATE orders SET status = ? WHERE payment_intent_id = ?').run('paid', paymentIntent.id);
      console.log('Payment succeeded:', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      db.prepare('UPDATE orders SET status = ? WHERE payment_intent_id = ?').run('failed', failedPayment.id);
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

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i hasło są wymagane' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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
});

app.post('/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i hasło są wymagane' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
  }

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)').run(id, email, hashedPassword);

  const token = jwt.sign({ id, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: { id, email, role: 'user' }
  });
});

app.get('/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
  res.json(user);
});

// ============ PRODUCTS ROUTES ============

app.get('/products', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  const products = db.prepare(query).all(...params);
  
  // Parse JSON fields
  const parsed = products.map(p => ({
    ...p,
    images: JSON.parse(p.images || '[]'),
    specifications: JSON.parse(p.specifications || '{}')
  }));

  res.json(parsed);
});

app.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produkt nie znaleziony' });

  res.json({
    ...product,
    images: JSON.parse(product.images || '[]'),
    specifications: JSON.parse(product.specifications || '{}')
  });
});

app.post('/products', authenticate, requireAdmin, upload.array('images', 5), (req, res) => {
  const { name, description, price, category, availability, specifications } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Nazwa i cena są wymagane' });
  }

  const id = uuidv4();
  const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

  db.prepare(`
    INSERT INTO products (id, name, description, price, category, availability, images, specifications)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    description || '',
    parseFloat(price),
    category || 'Inne',
    availability || 'available',
    JSON.stringify(images),
    specifications || '{}'
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({
    ...product,
    images: JSON.parse(product.images || '[]'),
    specifications: JSON.parse(product.specifications || '{}')
  });
});

app.put('/products/:id', authenticate, requireAdmin, upload.array('images', 5), (req, res) => {
  const { name, description, price, category, availability, specifications, existingImages } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produkt nie znaleziony' });

  let images = existingImages ? JSON.parse(existingImages) : JSON.parse(product.images || '[]');
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(f => `/uploads/${f.filename}`);
    images = [...images, ...newImages];
  }

  db.prepare(`
    UPDATE products 
    SET name = ?, description = ?, price = ?, category = ?, availability = ?, images = ?, specifications = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name || product.name,
    description ?? product.description,
    price ? parseFloat(price) : product.price,
    category || product.category,
    availability || product.availability,
    JSON.stringify(images),
    specifications || product.specifications,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({
    ...updated,
    images: JSON.parse(updated.images || '[]'),
    specifications: JSON.parse(updated.specifications || '{}')
  });
});

app.delete('/products/:id', authenticate, requireAdmin, (req, res) => {
  const product = db.prepare('SELECT images FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produkt nie znaleziony' });

  // Delete associated images
  const images = JSON.parse(product.images || '[]');
  images.forEach(img => {
    const filePath = path.join(__dirname, img);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ CATEGORIES ============

app.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL').all();
  res.json(categories.map(c => c.category));
});

// ============ ORDERS ROUTES ============

app.get('/orders', authenticate, requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const parsed = orders.map(o => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
    shipping_address: JSON.parse(o.shipping_address || '{}')
  }));
  res.json(parsed);
});

app.get('/orders/:id', authenticate, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Zamówienie nie znalezione' });

  // Only admin or order owner can view
  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Brak dostępu' });
  }

  res.json({
    ...order,
    items: JSON.parse(order.items || '[]'),
    shipping_address: JSON.parse(order.shipping_address || '{}')
  });
});

app.put('/orders/:id/status', authenticate, requireAdmin, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Nieprawidłowy status' });
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// ============ STRIPE PAYMENTS ============

app.post('/checkout/create-payment-intent', async (req, res) => {
  const { items, shipping_address, customer_email } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Koszyk jest pusty' });
  }

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const amountInCents = Math.round(total * 100);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'pln',
      payment_method_types: [
        'card',
        'p24',
        'blik',
        'bancontact',
        'eps',
        'klarna',
        'link',
        'paypal'
      ],
      metadata: {
        customer_email: customer_email || ''
      }
    });

    // Create order
    const orderId = uuidv4();
    db.prepare(`
      INSERT INTO orders (id, items, total, payment_intent_id, shipping_address, customer_email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      JSON.stringify(items),
      total,
      paymentIntent.id,
      JSON.stringify(shipping_address || {}),
      customer_email || ''
    );

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
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_...'
  });
});

// ============ ADMIN STATS ============

app.get('/admin/stats', authenticate, requireAdmin, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const revenue = db.prepare("SELECT SUM(total) as sum FROM orders WHERE status = 'paid'").get().sum || 0;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;

  res.json({
    totalProducts,
    totalOrders,
    totalUsers,
    revenue,
    pendingOrders
  });
});

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`🚀 Layered API running on port ${PORT}`);
  console.log(`📦 Database: ${path.join(dataDir, 'layered.db')}`);
});
