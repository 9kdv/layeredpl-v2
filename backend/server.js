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
      is_active BOOLEAN DEFAULT TRUE,
      is_blocked BOOLEAN DEFAULT FALSE,
      failed_login_attempts INT DEFAULT 0,
      last_login_at TIMESTAMP NULL,
      password_changed_at TIMESTAMP NULL,
      must_change_password BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) UNIQUE NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      avatar_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ============ ROLES AND PERMISSIONS SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      priority INT DEFAULT 0,
      is_system BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      category VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id VARCHAR(36) NOT NULL,
      permission_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      role_id VARCHAR(36) NOT NULL,
      assigned_by VARCHAR(36),
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_role (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_groups (
      user_id VARCHAR(36) NOT NULL,
      group_id VARCHAR(36) NOT NULL,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(36),
      details JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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
      availability_reason TEXT,
      estimated_production_days INT DEFAULT 3,
      images JSON,
      specifications JSON,
      customization JSON,
      featured BOOLEAN DEFAULT FALSE,
      is_archived BOOLEAN DEFAULT FALSE,
      is_visible BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      related_products JSON,
      upsell_products JSON,
      crosssell_products JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Add missing columns to products if they don't exist
  try {
    await pool.execute(`ALTER TABLE products ADD COLUMN is_visible BOOLEAN DEFAULT TRUE`);
  } catch (e) { /* column exists */ }
  try {
    await pool.execute(`ALTER TABLE products ADD COLUMN related_products JSON`);
  } catch (e) { /* column exists */ }
  try {
    await pool.execute(`ALTER TABLE products ADD COLUMN upsell_products JSON`);
  } catch (e) { /* column exists */ }
  try {
    await pool.execute(`ALTER TABLE products ADD COLUMN crosssell_products JSON`);
  } catch (e) { /* column exists */ }

  // Product versions for history
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS product_versions (
      id VARCHAR(36) PRIMARY KEY,
      product_id VARCHAR(36) NOT NULL,
      version INT NOT NULL,
      data JSON NOT NULL,
      changed_by VARCHAR(36),
      change_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      assigned_to VARCHAR(36),
      items JSON NOT NULL,
      total DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'paid', 'processing', 'awaiting_info', 'approved', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded') DEFAULT 'pending',
      payment_intent_id VARCHAR(255),
      shipping_address JSON,
      customer_email VARCHAR(255),
      customer_name VARCHAR(255),
      customer_phone VARCHAR(50),
      delivery_method VARCHAR(50),
      delivery_cost DECIMAL(10, 2) DEFAULT 0,
      tracking_number VARCHAR(255),
      is_archived BOOLEAN DEFAULT FALSE,
      admin_notes TEXT,
      priority INT DEFAULT 0,
      promo_code_id VARCHAR(36),
      discount_amount DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Add missing columns to orders
  try {
    await pool.execute(`ALTER TABLE orders ADD COLUMN priority INT DEFAULT 0`);
  } catch (e) { /* column exists */ }
  try {
    await pool.execute(`ALTER TABLE orders ADD COLUMN promo_code_id VARCHAR(36)`);
  } catch (e) { /* column exists */ }
  try {
    await pool.execute(`ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0`);
  } catch (e) { /* column exists */ }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_notes (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      note TEXT NOT NULL,
      is_internal BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      old_status VARCHAR(50),
      new_status VARCHAR(50) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
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
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      status_note TEXT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // ============ PROMOTIONS SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      type ENUM('percentage', 'fixed', 'free_shipping') NOT NULL,
      value DECIMAL(10, 2) NOT NULL,
      min_order_amount DECIMAL(10, 2) DEFAULT 0,
      max_uses INT DEFAULT NULL,
      uses_count INT DEFAULT 0,
      uses_per_user INT DEFAULT 1,
      valid_from TIMESTAMP NULL,
      valid_until TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE,
      is_archived BOOLEAN DEFAULT FALSE,
      applies_to ENUM('all', 'products', 'categories', 'customized', 'non_customized') DEFAULT 'all',
      excluded_products JSON,
      included_products JSON,
      included_categories JSON,
      for_roles JSON,
      priority INT DEFAULT 0,
      is_automatic BOOLEAN DEFAULT FALSE,
      created_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS promo_code_uses (
      id VARCHAR(36) PRIMARY KEY,
      promo_code_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      order_id VARCHAR(36),
      discount_amount DECIMAL(10, 2) NOT NULL,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    )
  `);

  // ============ MESSAGES SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      thread_id VARCHAR(36),
      order_id VARCHAR(36),
      user_id VARCHAR(36),
      sender_email VARCHAR(255),
      sender_name VARCHAR(255),
      subject VARCHAR(500),
      content TEXT NOT NULL,
      is_from_customer BOOLEAN DEFAULT TRUE,
      status ENUM('new', 'in_progress', 'closed', 'spam') DEFAULT 'new',
      assigned_to VARCHAR(36),
      tags JSON,
      priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
      read_at TIMESTAMP NULL,
      is_archived BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      subject VARCHAR(500),
      content TEXT NOT NULL,
      category VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // ============ PRODUCTION SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS locations (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      address TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS printers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      model VARCHAR(100),
      location_id VARCHAR(36),
      status ENUM('available', 'busy', 'maintenance', 'offline') DEFAULT 'available',
      current_job_order_id VARCHAR(36),
      assigned_to VARCHAR(36),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS materials (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type ENUM('PLA', 'PETG', 'ABS', 'TPU', 'Resin', 'Other') NOT NULL,
      color VARCHAR(50),
      color_hex VARCHAR(7),
      location_id VARCHAR(36),
      quantity_available DECIMAL(10, 2) DEFAULT 0,
      quantity_unit VARCHAR(20) DEFAULT 'kg',
      min_stock_level DECIMAL(10, 2) DEFAULT 0,
      status ENUM('available', 'low_stock', 'out_of_stock') DEFAULT 'available',
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS production_queue (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      order_item_index INT DEFAULT 0,
      printer_id VARCHAR(36),
      assigned_to VARCHAR(36),
      status ENUM('pending', 'preparing', 'printing', 'post_processing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
      priority INT DEFAULT 0,
      estimated_time_minutes INT,
      actual_time_minutes INT,
      material_id VARCHAR(36),
      notes TEXT,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
    )
  `);

  // ============ RETURNS/CLAIMS SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS returns (
      id VARCHAR(36) PRIMARY KEY,
      order_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      reason ENUM('defect', 'wrong_item', 'not_as_described', 'changed_mind', 'damaged', 'other') NOT NULL,
      description TEXT,
      decision ENUM('pending', 'approved_refund', 'approved_reprint', 'partial_refund', 'rejected') DEFAULT 'pending',
      refund_amount DECIMAL(10, 2) DEFAULT 0,
      status ENUM('submitted', 'under_review', 'awaiting_return', 'received', 'resolved', 'closed') DEFAULT 'submitted',
      assigned_to VARCHAR(36),
      internal_notes TEXT,
      customer_notes TEXT,
      images JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS return_history (
      id VARCHAR(36) PRIMARY KEY,
      return_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36),
      action VARCHAR(100) NOT NULL,
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // ============ SETTINGS SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(36) PRIMARY KEY,
      key_name VARCHAR(100) UNIQUE NOT NULL,
      value_text TEXT,
      value_json JSON,
      category VARCHAR(50),
      description TEXT,
      updated_by VARCHAR(36),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // ============ NOTIFICATIONS SYSTEM ============

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      type ENUM('system', 'order', 'message', 'production', 'alert') NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      link VARCHAR(500),
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Seed default roles and permissions
  const defaultRoles = [
    { id: uuidv4(), name: 'superadmin', display_name: 'Super Admin', description: 'Pełny dostęp do wszystkich funkcji', priority: 100, is_system: true },
    { id: uuidv4(), name: 'admin', display_name: 'Administrator', description: 'Zarządzanie sklepem, zamówieniami, produktami', priority: 90, is_system: true },
    { id: uuidv4(), name: 'producer', display_name: 'Producent', description: 'Dostęp do kolejki produkcji i materiałów', priority: 50, is_system: false },
    { id: uuidv4(), name: 'support', display_name: 'Obsługa klienta', description: 'Dostęp do zamówień i wiadomości', priority: 40, is_system: false },
    { id: uuidv4(), name: 'user', display_name: 'Użytkownik', description: 'Standardowy użytkownik sklepu', priority: 10, is_system: true }
  ];

  const defaultPermissions = [
    // Orders
    { id: uuidv4(), name: 'orders.view', display_name: 'Podgląd zamówień', category: 'orders' },
    { id: uuidv4(), name: 'orders.edit', display_name: 'Edycja zamówień', category: 'orders' },
    { id: uuidv4(), name: 'orders.status', display_name: 'Zmiana statusu', category: 'orders' },
    { id: uuidv4(), name: 'orders.delete', display_name: 'Usuwanie zamówień', category: 'orders' },
    { id: uuidv4(), name: 'orders.archive', display_name: 'Archiwizacja zamówień', category: 'orders' },
    { id: uuidv4(), name: 'orders.notes', display_name: 'Notatki wewnętrzne', category: 'orders' },
    { id: uuidv4(), name: 'orders.assign', display_name: 'Przypisywanie zamówień', category: 'orders' },
    // Products
    { id: uuidv4(), name: 'products.view', display_name: 'Podgląd produktów', category: 'products' },
    { id: uuidv4(), name: 'products.create', display_name: 'Tworzenie produktów', category: 'products' },
    { id: uuidv4(), name: 'products.edit', display_name: 'Edycja produktów', category: 'products' },
    { id: uuidv4(), name: 'products.delete', display_name: 'Usuwanie produktów', category: 'products' },
    // Users
    { id: uuidv4(), name: 'users.view', display_name: 'Podgląd użytkowników', category: 'users' },
    { id: uuidv4(), name: 'users.create', display_name: 'Tworzenie użytkowników', category: 'users' },
    { id: uuidv4(), name: 'users.edit', display_name: 'Edycja użytkowników', category: 'users' },
    { id: uuidv4(), name: 'users.delete', display_name: 'Usuwanie użytkowników', category: 'users' },
    { id: uuidv4(), name: 'users.roles', display_name: 'Zarządzanie rolami', category: 'users' },
    // Finance
    { id: uuidv4(), name: 'finance.view', display_name: 'Podgląd finansów', category: 'finance' },
    { id: uuidv4(), name: 'finance.reports', display_name: 'Raporty finansowe', category: 'finance' },
    // Production
    { id: uuidv4(), name: 'production.view', display_name: 'Podgląd produkcji', category: 'production' },
    { id: uuidv4(), name: 'production.manage', display_name: 'Zarządzanie produkcją', category: 'production' },
    { id: uuidv4(), name: 'production.materials', display_name: 'Zarządzanie materiałami', category: 'production' },
    { id: uuidv4(), name: 'production.printers', display_name: 'Zarządzanie drukarkami', category: 'production' },
    // Messages
    { id: uuidv4(), name: 'messages.view', display_name: 'Podgląd wiadomości', category: 'messages' },
    { id: uuidv4(), name: 'messages.reply', display_name: 'Odpowiadanie na wiadomości', category: 'messages' },
    { id: uuidv4(), name: 'messages.manage', display_name: 'Zarządzanie wiadomościami', category: 'messages' },
    // Promotions
    { id: uuidv4(), name: 'promotions.view', display_name: 'Podgląd promocji', category: 'promotions' },
    { id: uuidv4(), name: 'promotions.manage', display_name: 'Zarządzanie promocjami', category: 'promotions' },
    // Returns
    { id: uuidv4(), name: 'returns.view', display_name: 'Podgląd reklamacji', category: 'returns' },
    { id: uuidv4(), name: 'returns.manage', display_name: 'Zarządzanie reklamacjami', category: 'returns' },
    // Settings
    { id: uuidv4(), name: 'settings.view', display_name: 'Podgląd ustawień', category: 'settings' },
    { id: uuidv4(), name: 'settings.edit', display_name: 'Edycja ustawień', category: 'settings' },
    // Logs
    { id: uuidv4(), name: 'logs.view', display_name: 'Podgląd logów', category: 'system' },
    { id: uuidv4(), name: 'logs.export', display_name: 'Eksport logów', category: 'system' }
  ];

  // Insert roles if not exist
  for (const role of defaultRoles) {
    const [existing] = await pool.execute('SELECT id FROM roles WHERE name = ?', [role.name]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO roles (id, name, display_name, description, priority, is_system) VALUES (?, ?, ?, ?, ?, ?)',
        [role.id, role.name, role.display_name, role.description, role.priority, role.is_system]
      );
    }
  }

  // Insert permissions if not exist
  for (const perm of defaultPermissions) {
    const [existing] = await pool.execute('SELECT id FROM permissions WHERE name = ?', [perm.name]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO permissions (id, name, display_name, description, category) VALUES (?, ?, ?, ?, ?)',
        [perm.id, perm.name, perm.display_name, perm.description || '', perm.category]
      );
    }
  }

  // Assign all permissions to superadmin and admin roles
  const [superadminRole] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['superadmin']);
  const [adminRole] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['admin']);
  const [allPermissions] = await pool.execute('SELECT id FROM permissions');

  for (const perm of allPermissions) {
    if (superadminRole.length > 0) {
      await pool.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [superadminRole[0].id, perm.id]);
    }
    if (adminRole.length > 0) {
      await pool.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [adminRole[0].id, perm.id]);
    }
  }

  // Assign subset permissions to producer
  const [producerRole] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['producer']);
  const producerPerms = ['orders.view', 'orders.status', 'orders.notes', 'products.view', 'production.view', 'production.manage', 'production.materials', 'production.printers'];
  if (producerRole.length > 0) {
    for (const permName of producerPerms) {
      const [perm] = await pool.execute('SELECT id FROM permissions WHERE name = ?', [permName]);
      if (perm.length > 0) {
        await pool.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [producerRole[0].id, perm[0].id]);
      }
    }
  }

  // Assign subset permissions to support
  const [supportRole] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['support']);
  const supportPerms = ['orders.view', 'orders.status', 'orders.notes', 'products.view', 'users.view', 'messages.view', 'messages.reply', 'returns.view', 'returns.manage'];
  if (supportRole.length > 0) {
    for (const permName of supportPerms) {
      const [perm] = await pool.execute('SELECT id FROM permissions WHERE name = ?', [permName]);
      if (perm.length > 0) {
        await pool.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [supportRole[0].id, perm[0].id]);
      }
    }
  }

  // Default groups
  const defaultGroups = [
    { name: 'production', display_name: 'Produkcja', description: 'Zespół produkcyjny' },
    { name: 'support', display_name: 'Obsługa', description: 'Zespół obsługi klienta' },
    { name: 'management', display_name: 'Management', description: 'Kadra zarządzająca' }
  ];

  for (const group of defaultGroups) {
    const [existing] = await pool.execute('SELECT id FROM groups WHERE name = ?', [group.name]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO groups (id, name, display_name, description) VALUES (?, ?, ?, ?)',
        [uuidv4(), group.name, group.display_name, group.description]
      );
    }
  }

  // Seed default location
  const [locations] = await pool.execute('SELECT id FROM locations LIMIT 1');
  if (locations.length === 0) {
    await pool.execute(
      'INSERT INTO locations (id, name, description) VALUES (?, ?, ?)',
      [uuidv4(), 'Hala główna', 'Główna lokalizacja produkcyjna']
    );
  }

  // Seed default settings
  const defaultSettings = [
    { key_name: 'company_name', value_text: 'layered.pl', category: 'company' },
    { key_name: 'company_email', value_text: 'kontakt@layered.pl', category: 'company' },
    { key_name: 'company_phone', value_text: '+48 123 456 789', category: 'company' },
    { key_name: 'company_address', value_text: 'ul. Przykładowa 1, 00-001 Warszawa', category: 'company' },
    { key_name: 'company_nip', value_text: '1234567890', category: 'company' },
    { key_name: 'working_days', value_json: JSON.stringify([1, 2, 3, 4, 5]), category: 'production' },
    { key_name: 'max_orders_per_day', value_text: '50', category: 'production' },
    { key_name: 'maintenance_mode', value_text: 'false', category: 'system' },
    { key_name: 'maintenance_message', value_text: 'Strona w trakcie konserwacji. Wrócimy wkrótce!', category: 'system' },
  ];

  for (const setting of defaultSettings) {
    const [existing] = await pool.execute('SELECT id FROM settings WHERE key_name = ?', [setting.key_name]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO settings (id, key_name, value_text, value_json, category) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), setting.key_name, setting.value_text || null, setting.value_json || null, setting.category]
      );
    }
  }

  // Seed message templates
  const defaultTemplates = [
    { name: 'Potwierdzenie zamówienia', subject: 'Twoje zamówienie zostało przyjęte', content: 'Dziękujemy za złożenie zamówienia! Twoje zamówienie #{order_id} zostało przyjęte do realizacji.', category: 'order' },
    { name: 'Wysyłka zamówienia', subject: 'Twoje zamówienie zostało wysłane', content: 'Twoje zamówienie #{order_id} zostało wysłane. Numer śledzenia: {tracking_number}', category: 'shipping' },
    { name: 'Prośba o uzupełnienie', subject: 'Potrzebujemy dodatkowych informacji', content: 'W związku z Twoim zamówieniem #{order_id} potrzebujemy dodatkowych informacji. Prosimy o kontakt.', category: 'support' },
    { name: 'Odpowiedź na zapytanie', subject: 'Re: Twoje zapytanie', content: 'Dziękujemy za kontakt. W odpowiedzi na Twoje pytanie...', category: 'support' },
  ];

  for (const template of defaultTemplates) {
    const [existing] = await pool.execute('SELECT id FROM message_templates WHERE name = ?', [template.name]);
    if (existing.length === 0) {
      await pool.execute(
        'INSERT INTO message_templates (id, name, subject, content, category) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), template.name, template.subject, template.content, template.category]
      );
    }
  }

  // Create default admin if not exists
  const [admins] = await pool.execute('SELECT id FROM users WHERE email = ?', ['admin@layered.pl']);
  if (admins.length === 0) {
    const adminId = uuidv4();
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      'INSERT INTO users (id, email, password, is_active) VALUES (?, ?, ?, TRUE)',
      [adminId, 'admin@layered.pl', hashedPassword]
    );
    
    // Assign superadmin role
    const [superadmin] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['superadmin']);
    if (superadmin.length > 0) {
      await pool.execute(
        'INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)',
        [uuidv4(), adminId, superadmin[0].id]
      );
    }
    
    // Create profile
    await pool.execute('INSERT INTO user_profiles (id, user_id, first_name, last_name) VALUES (?, ?, ?, ?)', [uuidv4(), adminId, 'Admin', 'Layered']);
    
    console.log('Default admin created: admin@layered.pl / admin123');
  } else {
    // Ensure the default admin is usable in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      const adminId = admins[0].id;
      await pool.execute(
        'UPDATE users SET is_active = TRUE, is_blocked = FALSE, failed_login_attempts = 0 WHERE id = ?',
        [adminId]
      );

      // Ensure superadmin role is assigned
      const [superadmin] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['superadmin']);
      if (superadmin.length > 0) {
        await pool.execute(
          'INSERT IGNORE INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)',
          [uuidv4(), adminId, superadmin[0].id]
        );
      }

      // Ensure profile exists
      const [profiles] = await pool.execute('SELECT id FROM user_profiles WHERE user_id = ?', [adminId]);
      if (profiles.length === 0) {
        await pool.execute(
          'INSERT INTO user_profiles (id, user_id, first_name, last_name) VALUES (?, ?, ?, ?)',
          [uuidv4(), adminId, 'Admin', 'Layered']
        );
      }
    }
  }

  console.log('Database initialized successfully with all modules');
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
        <h1 style="color: #F59E0B;">Potrzebujemy Twojej pomocy</h1>
        <p>W sprawie zamówienia <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> potrzebujemy dodatkowych informacji.</p>
        ${order.admin_notes ? `<p style="background: #FEF3C7; padding: 15px; border-radius: 8px;">${order.admin_notes}</p>` : ''}
        <p>Prosimy o kontakt lub odpowiedź na tę wiadomość.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 12px;">layered.pl - Produkty drukowane w 3D</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail({
      from: `"layered.pl" <${MAIL_FROM}>`,
      to: customerEmail,
      subject: subjects[type] || 'Aktualizacja zamówienia',
      html: templates[type] || templates.confirmation,
    });
    console.log(`Email sent: ${type} to ${customerEmail}`);
  } catch (err) {
    console.error('Email error:', err);
  }
}

// ============ MIDDLEWARE ============

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// JWT Auth middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user with roles
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0 || !users[0].is_active || users[0].is_blocked) {
      return res.status(401).json({ error: 'Konto nieaktywne lub zablokowane' });
    }

    // Get user roles and permissions
    const [userRoles] = await pool.execute(`
      SELECT r.name as role_name, r.display_name, r.priority
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
      ORDER BY r.priority DESC
    `, [decoded.id]);

    const roles = userRoles.map(r => r.role_name);
    const isAdmin = roles.some(r => ['superadmin', 'admin'].includes(r));

    // Get all permissions for user's roles
    const [userPerms] = await pool.execute(`
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `, [decoded.id]);

    const permissions = userPerms.map(p => p.name);

    req.user = { 
      id: decoded.id, 
      email: decoded.email,
      role: isAdmin ? 'admin' : 'user',
      roles: roles,
      primaryRole: roles.length > 0 ? roles[0] : 'user',
      permissions: permissions
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token nieprawidłowy lub wygasł' });
  }
};

// Admin check middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Wymagane uprawnienia administratora' });
  }
  next();
};

// Permission check middleware
const requirePermission = (...requiredPermissions) => (req, res, next) => {
  // Superadmin always has access
  if (req.user.roles.includes('superadmin')) return next();
  
  // Check if user has any of the required permissions
  const hasPermission = requiredPermissions.some(perm => req.user.permissions.includes(perm));
  if (!hasPermission) {
    return res.status(403).json({ error: 'Brak wymaganych uprawnień' });
  }
  next();
};

// Superadmin check
const requireSuperAdmin = (req, res, next) => {
  if (!req.user.roles.includes('superadmin')) {
    return res.status(403).json({ error: 'Wymagane uprawnienia superadmina' });
  }
  next();
};

// Activity logging helper
const logActivity = async (userId, action, entityType, entityId, details, req) => {
  try {
    await pool.execute(
      'INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, action, entityType, entityId, JSON.stringify(details), req?.ip || null, req?.headers?.['user-agent']?.slice(0, 500) || null]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
};

// Create notification helper
const createNotification = async (userId, type, title, content, link) => {
  try {
    await pool.execute(
      'INSERT INTO notifications (id, user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), userId, type, title, content, link]
    );
  } catch (err) {
    console.error('Notification error:', err);
  }
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

    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }

    // Check if blocked
    if (user.is_blocked) {
      return res.status(401).json({ error: 'Konto zostało zablokowane. Skontaktuj się z administratorem.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Konto jest nieaktywne' });
    }

    // Check password with failed attempts tracking
    if (!bcrypt.compareSync(password, user.password)) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      await pool.execute('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [newAttempts, user.id]);
      
      // Block after 5 failed attempts
      if (newAttempts >= 5) {
        await pool.execute('UPDATE users SET is_blocked = TRUE WHERE id = ?', [user.id]);
        return res.status(401).json({ error: 'Konto zostało zablokowane po zbyt wielu nieudanych próbach logowania.' });
      }
      
      return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
    }

    // Reset failed attempts and update last login
    await pool.execute(
      'UPDATE users SET failed_login_attempts = 0, last_login_at = NOW() WHERE id = ?', 
      [user.id]
    );

    // Get user roles
    const [userRoles] = await pool.execute(`
      SELECT r.name as role_name, r.display_name, r.priority
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
      ORDER BY r.priority DESC
    `, [user.id]);

    const roles = userRoles.map(r => r.role_name);
    const primaryRole = roles.length > 0 ? roles[0] : 'user';
    const isAdmin = roles.some(r => ['superadmin', 'admin'].includes(r));

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log activity
    await logActivity(user.id, 'login', 'user', user.id, { ip: req.ip }, req);

    res.json({
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        role: isAdmin ? 'admin' : 'user',
        roles: roles,
        primaryRole: primaryRole,
        mustChangePassword: user.must_change_password
      }
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

    // Assign default user role
    const [userRole] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['user']);
    if (userRole.length > 0) {
      await pool.execute('INSERT INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)', [uuidv4(), id, userRole[0].id]);
    }

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
    const [users] = await pool.execute(
      'SELECT id, email, is_active, is_blocked, must_change_password, last_login_at, created_at FROM users WHERE id = ?', 
      [req.user.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    
    const user = users[0];
    
    res.json({
      id: user.id,
      email: user.email,
      role: req.user.role,
      roles: req.user.roles,
      primaryRole: req.user.primaryRole,
      permissions: req.user.permissions,
      mustChangePassword: user.must_change_password,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at
    });
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
    await pool.execute(
      'UPDATE users SET password = ?, must_change_password = FALSE, password_changed_at = NOW() WHERE id = ?', 
      [hashedPassword, req.user.id]
    );

    await logActivity(req.user.id, 'password_change', 'user', req.user.id, {}, req);

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

// ============ ENHANCED ADMIN STATS (DASHBOARD) ============

app.get('/admin/dashboard/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString().slice(0, 19).replace('T', ' ');
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 19).replace('T', ' ');
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 19).replace('T', ' ');
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 19).replace('T', ' ');

    // Revenue stats
    const [[{ todayRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(total), 0) as todayRevenue FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered') AND created_at >= ?",
      [startOfDay]
    );
    const [[{ weekRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(total), 0) as weekRevenue FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered') AND created_at >= ?",
      [startOfWeek]
    );
    const [[{ monthRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(total), 0) as monthRevenue FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered') AND created_at >= ?",
      [startOfMonth]
    );
    const [[{ lastMonthRevenue }]] = await pool.execute(
      "SELECT COALESCE(SUM(total), 0) as lastMonthRevenue FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered') AND created_at >= ? AND created_at <= ?",
      [startOfLastMonth, endOfLastMonth]
    );

    // Order counts
    const [[{ todayOrders }]] = await pool.execute("SELECT COUNT(*) as todayOrders FROM orders WHERE created_at >= ?", [startOfDay]);
    const [[{ weekOrders }]] = await pool.execute("SELECT COUNT(*) as weekOrders FROM orders WHERE created_at >= ?", [startOfWeek]);
    const [[{ monthOrders }]] = await pool.execute("SELECT COUNT(*) as monthOrders FROM orders WHERE created_at >= ?", [startOfMonth]);
    const [[{ totalOrders }]] = await pool.execute("SELECT COUNT(*) as totalOrders FROM orders");

    // Average cart value
    const [[{ avgOrderValue }]] = await pool.execute(
      "SELECT COALESCE(AVG(total), 0) as avgOrderValue FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered')"
    );

    // Orders needing attention
    const [[{ pendingOrders }]] = await pool.execute("SELECT COUNT(*) as pendingOrders FROM orders WHERE status = 'paid'");
    const [[{ awaitingInfo }]] = await pool.execute("SELECT COUNT(*) as awaitingInfo FROM orders WHERE status = 'awaiting_info'");
    const [[{ inProduction }]] = await pool.execute("SELECT COUNT(*) as inProduction FROM orders WHERE status = 'in_production'");

    // Unread messages
    const [[{ unreadMessages }]] = await pool.execute("SELECT COUNT(*) as unreadMessages FROM messages WHERE status = 'new'");

    // Materials alerts
    const [[{ lowStockMaterials }]] = await pool.execute("SELECT COUNT(*) as lowStockMaterials FROM materials WHERE status IN ('low_stock', 'out_of_stock')");

    // Stale orders (no status change in 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const [[{ staleOrders }]] = await pool.execute(
      "SELECT COUNT(*) as staleOrders FROM orders WHERE status NOT IN ('delivered', 'cancelled', 'refunded') AND updated_at < ?",
      [threeDaysAgo]
    );

    // Top products (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const [topProducts] = await pool.execute(`
      SELECT p.id, p.name, p.price, 
             COUNT(*) as order_count,
             SUM(JSON_LENGTH(o.items)) as total_quantity
      FROM orders o
      JOIN products p ON JSON_CONTAINS(o.items, JSON_OBJECT('id', p.id))
      WHERE o.created_at >= ? AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT 5
    `, [thirtyDaysAgo]).catch(() => [[]]);

    // Revenue chart data (last 7 days)
    const revenueChart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString().slice(0, 19).replace('T', ' ');
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString().slice(0, 19).replace('T', ' ');
      
      const [[{ revenue }]] = await pool.execute(
        "SELECT COALESCE(SUM(total), 0) as revenue FROM orders WHERE status IN ('paid', 'processing', 'shipped', 'delivered') AND created_at >= ? AND created_at <= ?",
        [dayStart, dayEnd]
      );
      const [[{ orders }]] = await pool.execute(
        "SELECT COUNT(*) as orders FROM orders WHERE created_at >= ? AND created_at <= ?",
        [dayStart, dayEnd]
      );
      
      revenueChart.push({
        date: new Date(date).toISOString().slice(0, 10),
        revenue: parseFloat(revenue),
        orders: parseInt(orders)
      });
    }

    // Pending returns
    const [[{ pendingReturns }]] = await pool.execute("SELECT COUNT(*) as pendingReturns FROM returns WHERE status IN ('submitted', 'under_review')");

    res.json({
      revenue: {
        today: parseFloat(todayRevenue),
        week: parseFloat(weekRevenue),
        month: parseFloat(monthRevenue),
        lastMonth: parseFloat(lastMonthRevenue),
        monthChange: lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0
      },
      orders: {
        today: parseInt(todayOrders),
        week: parseInt(weekOrders),
        month: parseInt(monthOrders),
        total: parseInt(totalOrders),
        avgValue: parseFloat(avgOrderValue).toFixed(2)
      },
      alerts: {
        pendingOrders: parseInt(pendingOrders),
        awaitingInfo: parseInt(awaitingInfo),
        inProduction: parseInt(inProduction),
        unreadMessages: parseInt(unreadMessages),
        lowStockMaterials: parseInt(lowStockMaterials),
        staleOrders: parseInt(staleOrders),
        pendingReturns: parseInt(pendingReturns)
      },
      topProducts: topProducts || [],
      revenueChart
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ ROLES & PERMISSIONS API ============

// Get all roles
app.get('/admin/roles', authenticate, requireAdmin, async (req, res) => {
  try {
    const [roles] = await pool.execute('SELECT * FROM roles ORDER BY priority DESC');
    
    // Get permissions for each role
    for (const role of roles) {
      const [perms] = await pool.execute(`
        SELECT p.* FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `, [role.id]);
      role.permissions = perms;
    }
    
    res.json(roles);
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Create role
app.post('/admin/roles', authenticate, requireSuperAdmin, async (req, res) => {
  const { name, display_name, description, priority, permissions } = req.body;

  if (!name || !display_name) {
    return res.status(400).json({ error: 'Nazwa i nazwa wyświetlana są wymagane' });
  }

  try {
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO roles (id, name, display_name, description, priority) VALUES (?, ?, ?, ?, ?)',
      [id, sanitize(name), sanitize(display_name), sanitize(description), priority || 0]
    );

    // Assign permissions
    if (permissions && Array.isArray(permissions)) {
      for (const permId of permissions) {
        await pool.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, permId]);
      }
    }

    await logActivity(req.user.id, 'create_role', 'role', id, { name }, req);

    const [roles] = await pool.execute('SELECT * FROM roles WHERE id = ?', [id]);
    res.status(201).json(roles[0]);
  } catch (err) {
    console.error('Create role error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Update role
app.put('/admin/roles/:id', authenticate, requireSuperAdmin, async (req, res) => {
  const { display_name, description, priority, permissions } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Rola nie znaleziona' });

    const role = existing[0];
    if (role.is_system && role.name === 'superadmin') {
      return res.status(400).json({ error: 'Nie można modyfikować roli superadmin' });
    }

    await pool.execute(
      'UPDATE roles SET display_name = ?, description = ?, priority = ? WHERE id = ?',
      [sanitize(display_name) || role.display_name, sanitize(description), priority ?? role.priority, req.params.id]
    );

    // Update permissions
    if (permissions && Array.isArray(permissions)) {
      await pool.execute('DELETE FROM role_permissions WHERE role_id = ?', [req.params.id]);
      for (const permId of permissions) {
        await pool.execute('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [req.params.id, permId]);
      }
    }

    await logActivity(req.user.id, 'update_role', 'role', req.params.id, { display_name }, req);

    const [updated] = await pool.execute('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Delete role
app.delete('/admin/roles/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Rola nie znaleziona' });

    if (existing[0].is_system) {
      return res.status(400).json({ error: 'Nie można usunąć roli systemowej' });
    }

    await pool.execute('DELETE FROM roles WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete_role', 'role', req.params.id, { name: existing[0].name }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Get all permissions
app.get('/admin/permissions', authenticate, requireAdmin, async (req, res) => {
  try {
    const [permissions] = await pool.execute('SELECT * FROM permissions ORDER BY category, name');
    res.json(permissions);
  } catch (err) {
    console.error('Get permissions error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Get all groups
app.get('/admin/groups', authenticate, requireAdmin, async (req, res) => {
  try {
    const [groups] = await pool.execute('SELECT * FROM groups ORDER BY name');
    
    // Get member count for each group
    for (const group of groups) {
      const [[{ count }]] = await pool.execute('SELECT COUNT(*) as count FROM user_groups WHERE group_id = ?', [group.id]);
      group.memberCount = count;
    }
    
    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Create group
app.post('/admin/groups', authenticate, requireAdmin, async (req, res) => {
  const { name, display_name, description } = req.body;

  if (!name || !display_name) {
    return res.status(400).json({ error: 'Nazwa jest wymagana' });
  }

  try {
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO groups (id, name, display_name, description) VALUES (?, ?, ?, ?)',
      [id, sanitize(name), sanitize(display_name), sanitize(description)]
    );

    await logActivity(req.user.id, 'create_group', 'group', id, { name }, req);

    const [groups] = await pool.execute('SELECT * FROM groups WHERE id = ?', [id]);
    res.status(201).json(groups[0]);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ ADMIN USERS MANAGEMENT ============

// Get all users (admin)
app.get('/admin/users', authenticate, requirePermission('users.view'), async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.id, u.email, u.is_active, u.is_blocked, u.last_login_at, u.created_at,
             up.first_name, up.last_name, up.phone
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY u.created_at DESC
    `);

    // Get roles for each user
    for (const user of users) {
      const [roles] = await pool.execute(`
        SELECT r.id, r.name, r.display_name, r.priority
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
        ORDER BY r.priority DESC
      `, [user.id]);
      user.roles = roles;
      
      const [groups] = await pool.execute(`
        SELECT g.id, g.name, g.display_name
        FROM user_groups ug
        JOIN groups g ON ug.group_id = g.id
        WHERE ug.user_id = ?
      `, [user.id]);
      user.groups = groups;
    }

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Get single user (admin)
app.get('/admin/users/:id', authenticate, requirePermission('users.view'), async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.*, up.first_name, up.last_name, up.phone
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `, [req.params.id]);

    if (users.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

    const user = users[0];
    delete user.password;

    // Get roles
    const [roles] = await pool.execute(`
      SELECT r.*, ur.assigned_at, 
             (SELECT email FROM users WHERE id = ur.assigned_by) as assigned_by_email
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
      ORDER BY r.priority DESC
    `, [user.id]);
    user.roles = roles;

    // Get groups
    const [groups] = await pool.execute(`
      SELECT g.* FROM user_groups ug
      JOIN groups g ON ug.group_id = g.id
      WHERE ug.user_id = ?
    `, [user.id]);
    user.groups = groups;

    // Get order count
    const [[{ orderCount }]] = await pool.execute(
      'SELECT COUNT(*) as orderCount FROM orders WHERE user_id = ?', 
      [user.id]
    );
    user.orderCount = orderCount;

    // Get recent activity
    const [activity] = await pool.execute(`
      SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `, [user.id]);
    user.recentActivity = activity;

    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Create user (admin)
app.post('/admin/users', authenticate, requirePermission('users.create'), async (req, res) => {
  const { email, password, first_name, last_name, phone, roles, groups, sendActivationEmail } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Prawidłowy email jest wymagany' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Użytkownik z tym emailem już istnieje' });
    }

    const id = uuidv4();
    const tempPassword = password || Math.random().toString(36).slice(-12);
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);

    await pool.execute(
      'INSERT INTO users (id, email, password, must_change_password) VALUES (?, ?, ?, ?)',
      [id, sanitize(email), hashedPassword, !password]
    );

    // Create profile
    await pool.execute(
      'INSERT INTO user_profiles (id, user_id, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), id, sanitize(first_name), sanitize(last_name), sanitize(phone)]
    );

    // Assign roles
    if (roles && Array.isArray(roles)) {
      for (const roleId of roles) {
        await pool.execute(
          'INSERT INTO user_roles (id, user_id, role_id, assigned_by) VALUES (?, ?, ?, ?)',
          [uuidv4(), id, roleId, req.user.id]
        );
      }
    } else {
      // Assign default user role
      const [userRole] = await pool.execute('SELECT id FROM roles WHERE name = ?', ['user']);
      if (userRole.length > 0) {
        await pool.execute(
          'INSERT INTO user_roles (id, user_id, role_id, assigned_by) VALUES (?, ?, ?, ?)',
          [uuidv4(), id, userRole[0].id, req.user.id]
        );
      }
    }

    // Assign groups
    if (groups && Array.isArray(groups)) {
      for (const groupId of groups) {
        await pool.execute('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', [id, groupId]);
      }
    }

    await logActivity(req.user.id, 'create_user', 'user', id, { email }, req);

    // TODO: Send activation email if requested

    res.status(201).json({ success: true, id, tempPassword: !password ? tempPassword : undefined });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Update user (admin)
app.put('/admin/users/:id', authenticate, requirePermission('users.edit'), async (req, res) => {
  const { email, first_name, last_name, phone, is_active, is_blocked, must_change_password, roles, groups } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

    // Update user
    await pool.execute(`
      UPDATE users SET 
        email = ?, is_active = ?, is_blocked = ?, must_change_password = ?
      WHERE id = ?
    `, [
      sanitize(email) || existing[0].email,
      is_active !== undefined ? is_active : existing[0].is_active,
      is_blocked !== undefined ? is_blocked : existing[0].is_blocked,
      must_change_password !== undefined ? must_change_password : existing[0].must_change_password,
      req.params.id
    ]);

    // Update profile
    await pool.execute(`
      UPDATE user_profiles SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?
    `, [sanitize(first_name), sanitize(last_name), sanitize(phone), req.params.id]);

    // Update roles if provided (requires users.roles permission)
    if (roles && Array.isArray(roles) && req.user.permissions.includes('users.roles')) {
      await pool.execute('DELETE FROM user_roles WHERE user_id = ?', [req.params.id]);
      for (const roleId of roles) {
        await pool.execute(
          'INSERT INTO user_roles (id, user_id, role_id, assigned_by) VALUES (?, ?, ?, ?)',
          [uuidv4(), req.params.id, roleId, req.user.id]
        );
      }
    }

    // Update groups
    if (groups && Array.isArray(groups)) {
      await pool.execute('DELETE FROM user_groups WHERE user_id = ?', [req.params.id]);
      for (const groupId of groups) {
        await pool.execute('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', [req.params.id, groupId]);
      }
    }

    await logActivity(req.user.id, 'update_user', 'user', req.params.id, { email }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Reset user password (admin)
app.post('/admin/users/:id/reset-password', authenticate, requirePermission('users.edit'), async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT email FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

    const newPassword = Math.random().toString(36).slice(-12);
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    await pool.execute(
      'UPDATE users SET password = ?, must_change_password = TRUE, failed_login_attempts = 0, is_blocked = FALSE WHERE id = ?',
      [hashedPassword, req.params.id]
    );

    await logActivity(req.user.id, 'reset_password', 'user', req.params.id, { email: existing[0].email }, req);

    res.json({ success: true, temporaryPassword: newPassword });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Block/unblock user
app.post('/admin/users/:id/toggle-block', authenticate, requirePermission('users.edit'), async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT is_blocked FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

    const newStatus = !existing[0].is_blocked;
    await pool.execute('UPDATE users SET is_blocked = ?, failed_login_attempts = 0 WHERE id = ?', [newStatus, req.params.id]);

    await logActivity(req.user.id, newStatus ? 'block_user' : 'unblock_user', 'user', req.params.id, {}, req);

    res.json({ success: true, isBlocked: newStatus });
  } catch (err) {
    console.error('Toggle block error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Delete user (requires superadmin)
app.delete('/admin/users/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const [existing] = await pool.execute('SELECT email FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Nie możesz usunąć własnego konta' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete_user', 'user', req.params.id, { email: existing[0].email }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ ACTIVITY LOGS ============

app.get('/admin/logs', authenticate, requirePermission('logs.view'), async (req, res) => {
  const { user_id, action, entity_type, start_date, end_date, limit = 100, offset = 0 } = req.query;

  try {
    let query = `
      SELECT al.*, u.email as user_email 
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }
    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }
    if (entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(entity_type);
    }
    if (start_date) {
      query += ' AND al.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND al.created_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
    const countParams = [];
    if (user_id) { countQuery += ' AND user_id = ?'; countParams.push(user_id); }
    if (action) { countQuery += ' AND action = ?'; countParams.push(action); }
    if (entity_type) { countQuery += ' AND entity_type = ?'; countParams.push(entity_type); }
    
    const [[{ total }]] = await pool.execute(countQuery, countParams);

    res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('Get logs error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ NOTIFICATIONS ============

app.get('/admin/notifications', authenticate, async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/notifications/mark-all-read', authenticate, async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
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
  const { category, search, featured, include_archived } = req.query;

  try {
    let query = 'SELECT * FROM products WHERE is_visible = TRUE';
    const params = [];

    if (include_archived !== 'true') {
      query += ' AND is_archived = FALSE';
    }

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

// Admin products (includes hidden/archived)
app.get('/admin/products', authenticate, requirePermission('products.view'), async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC');

    const parsed = products.map(p => ({
      ...p,
      price: parseFloat(p.price),
      images: typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []),
      specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications) : (p.specifications || []),
      customization: p.customization ? (typeof p.customization === 'string' ? JSON.parse(p.customization) : p.customization) : null,
      related_products: p.related_products ? (typeof p.related_products === 'string' ? JSON.parse(p.related_products) : p.related_products) : [],
      upsell_products: p.upsell_products ? (typeof p.upsell_products === 'string' ? JSON.parse(p.upsell_products) : p.upsell_products) : [],
      crosssell_products: p.crosssell_products ? (typeof p.crosssell_products === 'string' ? JSON.parse(p.crosssell_products) : p.crosssell_products) : []
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Get admin products error:', err);
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

app.post('/products', authenticate, requirePermission('products.create'), upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, specifications, customization, featured, estimated_production_days } = req.body;

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
      INSERT INTO products (id, name, description, long_description, price, category, availability, images, specifications, customization, featured, estimated_production_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      featured === 'true' || featured === true,
      parseInt(estimated_production_days) || 3
    ]);

    await logActivity(req.user.id, 'create_product', 'product', id, { name }, req);

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

app.put('/products/:id', authenticate, requirePermission('products.edit'), upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, availability_reason, specifications, customization, existingImages, featured, is_visible, is_archived, estimated_production_days, related_products, upsell_products, crosssell_products } = req.body;

  try {
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const product = products[0];
    
    // Save version before update
    await pool.execute(
      'INSERT INTO product_versions (id, product_id, version, data, changed_by) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, product.version, JSON.stringify(product), req.user.id]
    );

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
      SET name = ?, description = ?, long_description = ?, price = ?, category = ?, availability = ?, availability_reason = ?, images = ?, specifications = ?, customization = ?, featured = ?, is_visible = ?, is_archived = ?, estimated_production_days = ?, related_products = ?, upsell_products = ?, crosssell_products = ?, version = version + 1
      WHERE id = ?
    `, [
      sanitize(name) || product.name,
      description !== undefined ? sanitize(description) : product.description,
      long_description !== undefined ? sanitize(long_description) : product.long_description,
      price ? parseFloat(price) : product.price,
      sanitize(category) || product.category,
      availability || product.availability,
      availability_reason !== undefined ? sanitize(availability_reason) : product.availability_reason,
      JSON.stringify(images),
      specifications || product.specifications,
      customizationData,
      featured === 'true' || featured === true,
      is_visible !== undefined ? (is_visible === 'true' || is_visible === true) : product.is_visible,
      is_archived !== undefined ? (is_archived === 'true' || is_archived === true) : product.is_archived,
      estimated_production_days ? parseInt(estimated_production_days) : product.estimated_production_days,
      related_products ? (typeof related_products === 'string' ? related_products : JSON.stringify(related_products)) : product.related_products,
      upsell_products ? (typeof upsell_products === 'string' ? upsell_products : JSON.stringify(upsell_products)) : product.upsell_products,
      crosssell_products ? (typeof crosssell_products === 'string' ? crosssell_products : JSON.stringify(crosssell_products)) : product.crosssell_products,
      req.params.id
    ]);

    await logActivity(req.user.id, 'update_product', 'product', req.params.id, { name }, req);

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

// Duplicate product
app.post('/products/:id/duplicate', authenticate, requirePermission('products.create'), async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const product = products[0];
    const newId = uuidv4();

    await pool.execute(`
      INSERT INTO products (id, name, description, long_description, price, category, availability, images, specifications, customization, featured, estimated_production_days, is_visible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)
    `, [
      newId,
      product.name + ' (kopia)',
      product.description,
      product.long_description,
      product.price,
      product.category,
      product.availability,
      product.images,
      product.specifications,
      product.customization,
      false,
      product.estimated_production_days
    ]);

    await logActivity(req.user.id, 'duplicate_product', 'product', newId, { original: req.params.id }, req);

    const [newProduct] = await pool.execute('SELECT * FROM products WHERE id = ?', [newId]);
    res.status(201).json({
      ...newProduct[0],
      price: parseFloat(newProduct[0].price),
      images: JSON.parse(newProduct[0].images || '[]'),
      specifications: JSON.parse(newProduct[0].specifications || '[]'),
      customization: newProduct[0].customization ? JSON.parse(newProduct[0].customization) : null
    });
  } catch (err) {
    console.error('Duplicate product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Get product versions
app.get('/products/:id/versions', authenticate, requirePermission('products.view'), async (req, res) => {
  try {
    const [versions] = await pool.execute(`
      SELECT pv.*, u.email as changed_by_email
      FROM product_versions pv
      LEFT JOIN users u ON pv.changed_by = u.id
      WHERE pv.product_id = ?
      ORDER BY pv.version DESC
    `, [req.params.id]);
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Restore product version
app.post('/products/:id/restore/:version', authenticate, requirePermission('products.edit'), async (req, res) => {
  try {
    const [versions] = await pool.execute(
      'SELECT * FROM product_versions WHERE product_id = ? AND version = ?',
      [req.params.id, req.params.version]
    );
    if (versions.length === 0) return res.status(404).json({ error: 'Wersja nie znaleziona' });

    const versionData = JSON.parse(versions[0].data);
    
    // Save current as new version first
    const [current] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (current.length > 0) {
      await pool.execute(
        'INSERT INTO product_versions (id, product_id, version, data, changed_by, change_note) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), req.params.id, current[0].version, JSON.stringify(current[0]), req.user.id, 'Przed przywróceniem wersji ' + req.params.version]
      );
    }

    // Restore
    await pool.execute(`
      UPDATE products SET name = ?, description = ?, price = ?, images = ?, specifications = ?, customization = ?, version = version + 1
      WHERE id = ?
    `, [
      versionData.name,
      versionData.description,
      versionData.price,
      versionData.images,
      versionData.specifications,
      versionData.customization,
      req.params.id
    ]);

    await logActivity(req.user.id, 'restore_product', 'product', req.params.id, { restored_version: req.params.version }, req);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/products/:id', authenticate, requirePermission('products.delete'), async (req, res) => {
  try {
    const [products] = await pool.execute('SELECT images FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) return res.status(404).json({ error: 'Produkt nie znaleziony' });

    const images = JSON.parse(products[0].images || '[]');
    images.forEach(img => {
      const filePath = path.join(__dirname, img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete_product', 'product', req.params.id, {}, req);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ CATEGORIES ============

app.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND is_visible = TRUE AND is_archived = FALSE');
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ PROMO CODES ============

app.get('/admin/promo-codes', authenticate, requirePermission('promotions.view'), async (req, res) => {
  try {
    const [codes] = await pool.execute(`
      SELECT pc.*, u.email as created_by_email
      FROM promo_codes pc
      LEFT JOIN users u ON pc.created_by = u.id
      ORDER BY pc.created_at DESC
    `);
    res.json(codes.map(c => ({
      ...c,
      value: parseFloat(c.value),
      min_order_amount: parseFloat(c.min_order_amount),
      excluded_products: c.excluded_products ? JSON.parse(c.excluded_products) : [],
      included_products: c.included_products ? JSON.parse(c.included_products) : [],
      included_categories: c.included_categories ? JSON.parse(c.included_categories) : [],
      for_roles: c.for_roles ? JSON.parse(c.for_roles) : []
    })));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/promo-codes', authenticate, requirePermission('promotions.manage'), async (req, res) => {
  const { code, type, value, min_order_amount, max_uses, uses_per_user, valid_from, valid_until, applies_to, excluded_products, included_products, included_categories, for_roles, priority, is_automatic } = req.body;

  if (!code || !type || value === undefined) {
    return res.status(400).json({ error: 'Kod, typ i wartość są wymagane' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM promo_codes WHERE code = ?', [code.toUpperCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Kod o takiej nazwie już istnieje' });
    }

    const id = uuidv4();
    await pool.execute(`
      INSERT INTO promo_codes (id, code, type, value, min_order_amount, max_uses, uses_per_user, valid_from, valid_until, applies_to, excluded_products, included_products, included_categories, for_roles, priority, is_automatic, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      code.toUpperCase(),
      type,
      parseFloat(value),
      parseFloat(min_order_amount) || 0,
      max_uses || null,
      uses_per_user || 1,
      valid_from || null,
      valid_until || null,
      applies_to || 'all',
      excluded_products ? JSON.stringify(excluded_products) : null,
      included_products ? JSON.stringify(included_products) : null,
      included_categories ? JSON.stringify(included_categories) : null,
      for_roles ? JSON.stringify(for_roles) : null,
      priority || 0,
      is_automatic || false,
      req.user.id
    ]);

    await logActivity(req.user.id, 'create_promo', 'promo_code', id, { code }, req);

    const [created] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Create promo code error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/promo-codes/:id', authenticate, requirePermission('promotions.manage'), async (req, res) => {
  const { code, type, value, min_order_amount, max_uses, uses_per_user, valid_from, valid_until, is_active, applies_to, excluded_products, included_products, included_categories, for_roles, priority, is_automatic } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Kod nie znaleziony' });

    await pool.execute(`
      UPDATE promo_codes SET code = ?, type = ?, value = ?, min_order_amount = ?, max_uses = ?, uses_per_user = ?, valid_from = ?, valid_until = ?, is_active = ?, applies_to = ?, excluded_products = ?, included_products = ?, included_categories = ?, for_roles = ?, priority = ?, is_automatic = ?
      WHERE id = ?
    `, [
      code ? code.toUpperCase() : existing[0].code,
      type || existing[0].type,
      value !== undefined ? parseFloat(value) : existing[0].value,
      min_order_amount !== undefined ? parseFloat(min_order_amount) : existing[0].min_order_amount,
      max_uses !== undefined ? max_uses : existing[0].max_uses,
      uses_per_user !== undefined ? uses_per_user : existing[0].uses_per_user,
      valid_from !== undefined ? valid_from : existing[0].valid_from,
      valid_until !== undefined ? valid_until : existing[0].valid_until,
      is_active !== undefined ? is_active : existing[0].is_active,
      applies_to || existing[0].applies_to,
      excluded_products ? JSON.stringify(excluded_products) : existing[0].excluded_products,
      included_products ? JSON.stringify(included_products) : existing[0].included_products,
      included_categories ? JSON.stringify(included_categories) : existing[0].included_categories,
      for_roles ? JSON.stringify(for_roles) : existing[0].for_roles,
      priority !== undefined ? priority : existing[0].priority,
      is_automatic !== undefined ? is_automatic : existing[0].is_automatic,
      req.params.id
    ]);

    await logActivity(req.user.id, 'update_promo', 'promo_code', req.params.id, { code }, req);

    const [updated] = await pool.execute('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/admin/promo-codes/:id', authenticate, requirePermission('promotions.manage'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete_promo', 'promo_code', req.params.id, {}, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Validate promo code (public)
app.post('/promo-codes/validate', async (req, res) => {
  const { code, cart_total, items } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Kod jest wymagany' });
  }

  try {
    const [codes] = await pool.execute('SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE', [code.toUpperCase()]);
    if (codes.length === 0) {
      return res.status(400).json({ error: 'Nieprawidłowy kod promocyjny' });
    }

    const promo = codes[0];
    const now = new Date();

    // Check validity dates
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return res.status(400).json({ error: 'Kod jeszcze nie jest aktywny' });
    }
    if (promo.valid_until && new Date(promo.valid_until) < now) {
      return res.status(400).json({ error: 'Kod wygasł' });
    }

    // Check usage limit
    if (promo.max_uses && promo.uses_count >= promo.max_uses) {
      return res.status(400).json({ error: 'Kod został wykorzystany maksymalną liczbę razy' });
    }

    // Check minimum order amount
    if (promo.min_order_amount > 0 && cart_total < promo.min_order_amount) {
      return res.status(400).json({ error: `Minimalna wartość zamówienia to ${promo.min_order_amount} zł` });
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === 'percentage') {
      discount = cart_total * (parseFloat(promo.value) / 100);
    } else if (promo.type === 'fixed') {
      discount = parseFloat(promo.value);
    } else if (promo.type === 'free_shipping') {
      discount = 0; // Handle shipping separately
    }

    res.json({
      valid: true,
      code: promo.code,
      type: promo.type,
      value: parseFloat(promo.value),
      discount: Math.min(discount, cart_total),
      message: promo.type === 'free_shipping' ? 'Darmowa dostawa!' : `Zniżka: ${discount.toFixed(2)} zł`
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ MESSAGES ============

app.get('/admin/messages', authenticate, requirePermission('messages.view'), async (req, res) => {
  const { status, order_id, assigned_to } = req.query;

  try {
    let query = `
      SELECT m.*, u.email as sender_user_email, a.email as assigned_email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN users a ON m.assigned_to = a.id
      WHERE m.is_archived = FALSE
    `;
    const params = [];

    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }
    if (order_id) {
      query += ' AND m.order_id = ?';
      params.push(order_id);
    }
    if (assigned_to) {
      query += ' AND m.assigned_to = ?';
      params.push(assigned_to);
    }

    query += ' ORDER BY m.created_at DESC';
    const [messages] = await pool.execute(query, params);

    res.json(messages.map(m => ({
      ...m,
      tags: m.tags ? JSON.parse(m.tags) : []
    })));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/admin/messages/:id', authenticate, requirePermission('messages.view'), async (req, res) => {
  try {
    const [messages] = await pool.execute(`
      SELECT m.*, u.email as sender_user_email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [req.params.id]);

    if (messages.length === 0) return res.status(404).json({ error: 'Wiadomość nie znaleziona' });

    // Mark as read
    if (!messages[0].read_at) {
      await pool.execute('UPDATE messages SET read_at = NOW() WHERE id = ?', [req.params.id]);
    }

    // Get thread messages if thread_id exists
    let thread = [];
    if (messages[0].thread_id) {
      const [threadMessages] = await pool.execute(
        'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC',
        [messages[0].thread_id]
      );
      thread = threadMessages;
    }

    res.json({
      ...messages[0],
      tags: messages[0].tags ? JSON.parse(messages[0].tags) : [],
      thread
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/messages/:id/reply', authenticate, requirePermission('messages.reply'), async (req, res) => {
  const { content, subject } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Treść wiadomości jest wymagana' });
  }

  try {
    const [original] = await pool.execute('SELECT * FROM messages WHERE id = ?', [req.params.id]);
    if (original.length === 0) return res.status(404).json({ error: 'Wiadomość nie znaleziona' });

    const threadId = original[0].thread_id || req.params.id;
    const replyId = uuidv4();

    await pool.execute(`
      INSERT INTO messages (id, thread_id, order_id, sender_email, sender_name, subject, content, is_from_customer, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, 'in_progress')
    `, [
      replyId,
      threadId,
      original[0].order_id,
      MAIL_FROM,
      'layered.pl',
      subject || 'Re: ' + (original[0].subject || 'Twoja wiadomość'),
      sanitize(content)
    ]);

    // Update original message status
    await pool.execute('UPDATE messages SET status = ?, thread_id = COALESCE(thread_id, id) WHERE id = ?', ['in_progress', req.params.id]);

    // Send email
    if (original[0].sender_email && SMTP_PASS) {
      await transporter.sendMail({
        from: `"layered.pl" <${MAIL_FROM}>`,
        to: original[0].sender_email,
        subject: subject || 'Re: ' + (original[0].subject || 'Twoja wiadomość'),
        html: `<div style="font-family: Arial, sans-serif;">${content.replace(/\n/g, '<br>')}<hr><p style="color:#888;">layered.pl</p></div>`
      });
    }

    await logActivity(req.user.id, 'reply_message', 'message', req.params.id, {}, req);

    res.json({ success: true, replyId });
  } catch (err) {
    console.error('Reply message error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/messages/:id', authenticate, requirePermission('messages.manage'), async (req, res) => {
  const { status, assigned_to, tags, priority } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM messages WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Wiadomość nie znaleziona' });

    await pool.execute(`
      UPDATE messages SET status = ?, assigned_to = ?, tags = ?, priority = ?
      WHERE id = ?
    `, [
      status || existing[0].status,
      assigned_to !== undefined ? assigned_to : existing[0].assigned_to,
      tags ? JSON.stringify(tags) : existing[0].tags,
      priority || existing[0].priority,
      req.params.id
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Contact form (public)
app.post('/contact', rateLimiter(5, 60000), async (req, res) => {
  const { name, email, subject, message, order_id } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: 'Email i wiadomość są wymagane' });
  }

  try {
    const id = uuidv4();
    await pool.execute(`
      INSERT INTO messages (id, order_id, sender_email, sender_name, subject, content, is_from_customer)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
    `, [id, order_id || null, sanitize(email), sanitize(name), sanitize(subject), sanitize(message)]);

    // Notify admins
    const [admins] = await pool.execute(`
      SELECT u.id FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('superadmin', 'admin', 'support')
    `);
    for (const admin of admins) {
      await createNotification(admin.id, 'message', 'Nowa wiadomość', `Od: ${email}`, `/admin/messages`);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Message templates
app.get('/admin/message-templates', authenticate, requirePermission('messages.view'), async (req, res) => {
  try {
    const [templates] = await pool.execute('SELECT * FROM message_templates WHERE is_active = TRUE ORDER BY category, name');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/message-templates', authenticate, requirePermission('messages.manage'), async (req, res) => {
  const { name, subject, content, category } = req.body;

  try {
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO message_templates (id, name, subject, content, category, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sanitize(name), sanitize(subject), content, category, req.user.id]
    );
    const [created] = await pool.execute('SELECT * FROM message_templates WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ PRODUCTION QUEUE ============

app.get('/admin/production/queue', authenticate, requirePermission('production.view'), async (req, res) => {
  try {
    const [queue] = await pool.execute(`
      SELECT pq.*, o.customer_name, o.customer_email, o.items, o.created_at as order_date,
             p.name as printer_name, m.name as material_name, m.color as material_color,
             u.email as assigned_email
      FROM production_queue pq
      JOIN orders o ON pq.order_id = o.id
      LEFT JOIN printers p ON pq.printer_id = p.id
      LEFT JOIN materials m ON pq.material_id = m.id
      LEFT JOIN users u ON pq.assigned_to = u.id
      WHERE pq.status NOT IN ('completed', 'cancelled')
      ORDER BY pq.priority DESC, pq.created_at ASC
    `);

    res.json(queue.map(q => ({
      ...q,
      items: typeof q.items === 'string' ? JSON.parse(q.items) : q.items
    })));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/production/queue/:id', authenticate, requirePermission('production.manage'), async (req, res) => {
  const { status, printer_id, assigned_to, material_id, priority, notes } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM production_queue WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Pozycja nie znaleziona' });

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'printing' && !existing[0].started_at) {
        updates.push('started_at = NOW()');
      }
      if (status === 'completed') {
        updates.push('completed_at = NOW()');
      }
    }
    if (printer_id !== undefined) { updates.push('printer_id = ?'); params.push(printer_id); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (material_id !== undefined) { updates.push('material_id = ?'); params.push(material_id); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length > 0) {
      params.push(req.params.id);
      await pool.execute(`UPDATE production_queue SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await logActivity(req.user.id, 'update_production', 'production_queue', req.params.id, { status }, req);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ PRINTERS ============

app.get('/admin/printers', authenticate, requirePermission('production.view'), async (req, res) => {
  try {
    const [printers] = await pool.execute(`
      SELECT p.*, l.name as location_name, u.email as assigned_email
      FROM printers p
      LEFT JOIN locations l ON p.location_id = l.id
      LEFT JOIN users u ON p.assigned_to = u.id
      ORDER BY p.name
    `);
    res.json(printers);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/printers', authenticate, requirePermission('production.printers'), async (req, res) => {
  const { name, model, location_id, status, assigned_to, notes } = req.body;

  try {
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO printers (id, name, model, location_id, status, assigned_to, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, sanitize(name), sanitize(model), location_id || null, status || 'available', assigned_to || null, sanitize(notes)]
    );
    const [created] = await pool.execute('SELECT * FROM printers WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/printers/:id', authenticate, requirePermission('production.printers'), async (req, res) => {
  const { name, model, location_id, status, assigned_to, notes } = req.body;

  try {
    await pool.execute(`
      UPDATE printers SET name = ?, model = ?, location_id = ?, status = ?, assigned_to = ?, notes = ?
      WHERE id = ?
    `, [sanitize(name), sanitize(model), location_id, status, assigned_to, sanitize(notes), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/admin/printers/:id', authenticate, requirePermission('production.printers'), async (req, res) => {
  try {
    await pool.execute('DELETE FROM printers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ MATERIALS ============

app.get('/admin/materials', authenticate, requirePermission('production.view'), async (req, res) => {
  try {
    const [materials] = await pool.execute(`
      SELECT m.*, l.name as location_name
      FROM materials m
      LEFT JOIN locations l ON m.location_id = l.id
      WHERE m.is_active = TRUE
      ORDER BY m.type, m.name
    `);
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/materials', authenticate, requirePermission('production.materials'), async (req, res) => {
  const { name, type, color, color_hex, location_id, quantity_available, quantity_unit, min_stock_level, notes } = req.body;

  try {
    const id = uuidv4();
    const status = quantity_available <= 0 ? 'out_of_stock' : quantity_available <= min_stock_level ? 'low_stock' : 'available';

    await pool.execute(`
      INSERT INTO materials (id, name, type, color, color_hex, location_id, quantity_available, quantity_unit, min_stock_level, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, sanitize(name), type, sanitize(color), color_hex, location_id, quantity_available || 0, quantity_unit || 'kg', min_stock_level || 0, status, sanitize(notes)]);

    const [created] = await pool.execute('SELECT * FROM materials WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/materials/:id', authenticate, requirePermission('production.materials'), async (req, res) => {
  const { name, type, color, color_hex, location_id, quantity_available, quantity_unit, min_stock_level, notes, is_active } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Materiał nie znaleziony' });

    const qty = quantity_available !== undefined ? quantity_available : existing[0].quantity_available;
    const minLevel = min_stock_level !== undefined ? min_stock_level : existing[0].min_stock_level;
    const status = qty <= 0 ? 'out_of_stock' : qty <= minLevel ? 'low_stock' : 'available';

    await pool.execute(`
      UPDATE materials SET name = ?, type = ?, color = ?, color_hex = ?, location_id = ?, quantity_available = ?, quantity_unit = ?, min_stock_level = ?, status = ?, notes = ?, is_active = ?
      WHERE id = ?
    `, [
      sanitize(name) || existing[0].name,
      type || existing[0].type,
      color !== undefined ? sanitize(color) : existing[0].color,
      color_hex !== undefined ? color_hex : existing[0].color_hex,
      location_id !== undefined ? location_id : existing[0].location_id,
      qty,
      quantity_unit || existing[0].quantity_unit,
      minLevel,
      status,
      notes !== undefined ? sanitize(notes) : existing[0].notes,
      is_active !== undefined ? is_active : existing[0].is_active,
      req.params.id
    ]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ LOCATIONS ============

app.get('/admin/locations', authenticate, requirePermission('production.view'), async (req, res) => {
  try {
    const [locations] = await pool.execute('SELECT * FROM locations WHERE is_active = TRUE ORDER BY name');
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/admin/locations', authenticate, requirePermission('production.manage'), async (req, res) => {
  const { name, description, address } = req.body;

  try {
    const id = uuidv4();
    await pool.execute('INSERT INTO locations (id, name, description, address) VALUES (?, ?, ?, ?)', [id, sanitize(name), sanitize(description), sanitize(address)]);
    const [created] = await pool.execute('SELECT * FROM locations WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ RETURNS ============

app.get('/admin/returns', authenticate, requirePermission('returns.view'), async (req, res) => {
  try {
    const [returns] = await pool.execute(`
      SELECT r.*, o.customer_name, o.customer_email, o.total as order_total,
             u.email as assigned_email
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      LEFT JOIN users u ON r.assigned_to = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(returns.map(r => ({
      ...r,
      refund_amount: parseFloat(r.refund_amount),
      images: r.images ? JSON.parse(r.images) : []
    })));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/admin/returns/:id', authenticate, requirePermission('returns.view'), async (req, res) => {
  try {
    const [returns] = await pool.execute(`
      SELECT r.*, o.customer_name, o.customer_email, o.items, o.total as order_total
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (returns.length === 0) return res.status(404).json({ error: 'Reklamacja nie znaleziona' });

    const [history] = await pool.execute(`
      SELECT rh.*, u.email as user_email
      FROM return_history rh
      LEFT JOIN users u ON rh.user_id = u.id
      WHERE rh.return_id = ?
      ORDER BY rh.created_at DESC
    `, [req.params.id]);

    res.json({
      ...returns[0],
      items: typeof returns[0].items === 'string' ? JSON.parse(returns[0].items) : returns[0].items,
      images: returns[0].images ? JSON.parse(returns[0].images) : [],
      history
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/returns/:id', authenticate, requirePermission('returns.manage'), async (req, res) => {
  const { decision, refund_amount, status, assigned_to, internal_notes, customer_notes } = req.body;

  try {
    const [existing] = await pool.execute('SELECT * FROM returns WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Reklamacja nie znaleziona' });

    const oldStatus = existing[0].status;

    await pool.execute(`
      UPDATE returns SET decision = ?, refund_amount = ?, status = ?, assigned_to = ?, internal_notes = ?, customer_notes = ?
      WHERE id = ?
    `, [
      decision || existing[0].decision,
      refund_amount !== undefined ? parseFloat(refund_amount) : existing[0].refund_amount,
      status || existing[0].status,
      assigned_to !== undefined ? assigned_to : existing[0].assigned_to,
      internal_notes !== undefined ? sanitize(internal_notes) : existing[0].internal_notes,
      customer_notes !== undefined ? sanitize(customer_notes) : existing[0].customer_notes,
      req.params.id
    ]);

    // Log history
    if (status && status !== oldStatus) {
      await pool.execute(
        'INSERT INTO return_history (id, return_id, user_id, action, old_status, new_status) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), req.params.id, req.user.id, 'status_change', oldStatus, status]
      );
    }

    await logActivity(req.user.id, 'update_return', 'return', req.params.id, { status }, req);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Submit return (customer)
app.post('/returns', authenticate, async (req, res) => {
  const { order_id, reason, description } = req.body;

  if (!order_id || !reason) {
    return res.status(400).json({ error: 'ID zamówienia i powód są wymagane' });
  }

  try {
    // Verify order belongs to user
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ? AND (user_id = ? OR customer_email = (SELECT email FROM users WHERE id = ?))', [order_id, req.user.id, req.user.id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Zamówienie nie znalezione' });
    }

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO returns (id, order_id, user_id, reason, description) VALUES (?, ?, ?, ?, ?)',
      [id, order_id, req.user.id, reason, sanitize(description)]
    );

    // Notify admins
    const [admins] = await pool.execute(`
      SELECT u.id FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('superadmin', 'admin', 'support')
    `);
    for (const admin of admins) {
      await createNotification(admin.id, 'alert', 'Nowa reklamacja', `Zamówienie: ${order_id.slice(0, 8)}`, `/admin/returns`);
    }

    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ SETTINGS ============

app.get('/admin/settings', authenticate, requirePermission('settings.view'), async (req, res) => {
  try {
    const [settings] = await pool.execute('SELECT * FROM settings ORDER BY category, key_name');
    res.json(settings.reduce((acc, s) => {
      acc[s.key_name] = s.value_json ? JSON.parse(s.value_json) : s.value_text;
      return acc;
    }, {}));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/settings', authenticate, requirePermission('settings.edit'), async (req, res) => {
  const updates = req.body;

  try {
    for (const [key, value] of Object.entries(updates)) {
      const isJson = typeof value === 'object';
      await pool.execute(`
        INSERT INTO settings (id, key_name, value_text, value_json, updated_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE value_text = ?, value_json = ?, updated_by = ?
      `, [
        uuidv4(),
        key,
        isJson ? null : String(value),
        isJson ? JSON.stringify(value) : null,
        req.user.id,
        isJson ? null : String(value),
        isJson ? JSON.stringify(value) : null,
        req.user.id
      ]);
    }

    await logActivity(req.user.id, 'update_settings', 'settings', null, { keys: Object.keys(updates) }, req);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ ORDERS ROUTES ============

app.get('/orders', authenticate, requireAdmin, async (req, res) => {
  const { status, has_customization, product_id, start_date, end_date, assigned_to, is_archived } = req.query;

  try {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (is_archived === 'true') {
      query += ' AND is_archived = TRUE';
    } else if (is_archived !== 'all') {
      query += ' AND is_archived = FALSE';
    }
    if (assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(assigned_to);
    }
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';
    const [orders] = await pool.execute(query, params);

    const parsed = orders.map(o => ({
      ...o,
      total: parseFloat(o.total),
      items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
      shipping_address: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : (o.shipping_address || {})
    }));

    // Filter by customization if needed
    let result = parsed;
    if (has_customization === 'true') {
      result = parsed.filter(o => o.items.some(i => i.customizations?.length > 0));
    } else if (has_customization === 'false') {
      result = parsed.filter(o => !o.items.some(i => i.customizations?.length > 0));
    }

    res.json(result);
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

    // Get notes
    const [notes] = await pool.execute(`
      SELECT n.*, u.email as user_email
      FROM order_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.order_id = ?
      ORDER BY n.created_at DESC
    `, [req.params.id]);

    // Get status history
    const [history] = await pool.execute(`
      SELECT h.*, u.email as user_email
      FROM order_status_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.order_id = ?
      ORDER BY h.created_at DESC
    `, [req.params.id]);

    // Get files
    const [files] = await pool.execute('SELECT * FROM customization_files WHERE order_id = ?', [req.params.id]);

    res.json({
      ...order,
      total: parseFloat(order.total),
      items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []),
      shipping_address: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : (order.shipping_address || {}),
      notes,
      status_history: history,
      files
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/orders/:id/status', authenticate, requirePermission('orders.status'), async (req, res) => {
  const { status, note, tracking_number } = req.body;
  const validStatuses = ['pending', 'paid', 'processing', 'awaiting_info', 'approved', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Nieprawidłowy status' });
  }

  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Zamówienie nie znalezione' });

    const order = orders[0];
    const previousStatus = order.status;

    await pool.execute(
      'UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number) WHERE id = ?', 
      [status, tracking_number, req.params.id]
    );

    // Log status change
    await pool.execute(
      'INSERT INTO order_status_history (id, order_id, user_id, old_status, new_status, note) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), req.params.id, req.user.id, previousStatus, status, sanitize(note)]
    );

    await logActivity(req.user.id, 'order_status_change', 'order', req.params.id, { old: previousStatus, new: status }, req);

    // Send email notifications on status change
    if (previousStatus !== status && order.customer_email) {
      order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      order.total = parseFloat(order.total);
      order.tracking_number = tracking_number || order.tracking_number;
      order.admin_notes = note;

      if (status === 'shipped') {
        await sendOrderEmail('shipped', order, order.customer_email);
      } else if (status === 'delivered') {
        await sendOrderEmail('delivered', order, order.customer_email);
      } else if (status === 'awaiting_info') {
        await sendOrderEmail('awaiting_info', order, order.customer_email);
      }
    }

    // Add to production queue if status is 'approved'
    if (status === 'approved' && previousStatus !== 'approved') {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      for (let i = 0; i < items.length; i++) {
        await pool.execute(
          'INSERT INTO production_queue (id, order_id, order_item_index, status) VALUES (?, ?, ?, ?)',
          [uuidv4(), req.params.id, i, 'pending']
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Add note to order
app.post('/orders/:id/notes', authenticate, requirePermission('orders.notes'), async (req, res) => {
  const { note, is_internal } = req.body;

  if (!note) {
    return res.status(400).json({ error: 'Notatka jest wymagana' });
  }

  try {
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO order_notes (id, order_id, user_id, note, is_internal) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.id, req.user.id, sanitize(note), is_internal !== false]
    );

    const [notes] = await pool.execute(`
      SELECT n.*, u.email as user_email
      FROM order_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = ?
    `, [id]);

    res.status(201).json(notes[0]);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Assign order
app.put('/orders/:id/assign', authenticate, requirePermission('orders.assign'), async (req, res) => {
  const { assigned_to } = req.body;

  try {
    await pool.execute('UPDATE orders SET assigned_to = ? WHERE id = ?', [assigned_to, req.params.id]);
    await logActivity(req.user.id, 'assign_order', 'order', req.params.id, { assigned_to }, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Archive order
app.put('/orders/:id/archive', authenticate, requirePermission('orders.archive'), async (req, res) => {
  try {
    await pool.execute('UPDATE orders SET is_archived = TRUE WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'archive_order', 'order', req.params.id, {}, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Duplicate order
app.post('/orders/:id/duplicate', authenticate, requirePermission('orders.edit'), async (req, res) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Zamówienie nie znalezione' });

    const order = orders[0];
    const newId = uuidv4();

    await pool.execute(`
      INSERT INTO orders (id, user_id, items, total, status, shipping_address, customer_email, customer_name, customer_phone, delivery_method, delivery_cost)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `, [newId, order.user_id, order.items, order.total, order.shipping_address, order.customer_email, order.customer_name, order.customer_phone, order.delivery_method, order.delivery_cost]);

    await logActivity(req.user.id, 'duplicate_order', 'order', newId, { original: req.params.id }, req);

    res.status(201).json({ success: true, orderId: newId });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Delete order (superadmin only)
app.delete('/orders/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, 'delete_order', 'order', req.params.id, {}, req);
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

// Update file status
app.put('/orders/:orderId/files/:fileId', authenticate, requireAdmin, async (req, res) => {
  const { status, status_note } = req.body;

  try {
    await pool.execute(
      'UPDATE customization_files SET status = ?, status_note = ? WHERE id = ? AND order_id = ?',
      [status, sanitize(status_note), req.params.fileId, req.params.orderId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ INPOST SEARCH & VERIFICATION ============

app.get('/inpost/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 3) {
    return res.json([]);
  }

  // In production, use InPost ShipX API
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

app.post('/checkout/create-payment-intent', async (req, res) => {
  const { items, shipping_address, customer_email, customer_name, customer_phone, shipping_cost, delivery_method, promo_code } = req.body;

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

    let shippingAmount = parseFloat(shipping_cost) || 0;
    let discountAmount = 0;
    let promoCodeId = null;

    // Apply promo code if provided
    if (promo_code) {
      const [codes] = await pool.execute('SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE', [promo_code.toUpperCase()]);
      if (codes.length > 0) {
        const promo = codes[0];
        promoCodeId = promo.id;
        
        if (promo.type === 'percentage') {
          discountAmount = calculatedTotal * (parseFloat(promo.value) / 100);
        } else if (promo.type === 'fixed') {
          discountAmount = parseFloat(promo.value);
        } else if (promo.type === 'free_shipping') {
          shippingAmount = 0;
        }
      }
    }

    const finalTotal = Math.max(0, calculatedTotal - discountAmount + shippingAmount);
    const amountInCents = Math.round(finalTotal * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'pln',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customer_email: sanitize(customer_email),
        customer_name: sanitize(customer_name) || '',
        customer_phone: sanitize(customer_phone) || '',
        shipping_cost: shippingAmount.toString(),
        delivery_method: delivery_method || 'courier',
        promo_code_id: promoCodeId || '',
        discount_amount: discountAmount.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      calculatedTotal: finalTotal,
      discountAmount,
      validatedItems: validatedItems
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Błąd tworzenia płatności' });
  }
});

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
    save_address,
    promo_code
  } = req.body;

  if (!payment_intent_id) {
    return res.status(400).json({ error: 'payment_intent_id jest wymagany' });
  }

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Brak produktów w zamówieniu' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Płatność nie została zakończona. Zamówienie nie zostało utworzone.',
        status: paymentIntent.status 
      });
    }

    const [existingOrders] = await pool.execute(
      'SELECT id FROM orders WHERE payment_intent_id = ?', 
      [payment_intent_id]
    );

    if (existingOrders.length > 0) {
      return res.json({ 
        success: true, 
        orderId: existingOrders[0].id,
        status: 'paid',
        message: 'Zamówienie już istnieje'
      });
    }

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

    let shippingAmount = parseFloat(shipping_cost) || 0;
    let discountAmount = 0;
    let promoCodeId = null;

    if (promo_code) {
      const [codes] = await pool.execute('SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE', [promo_code.toUpperCase()]);
      if (codes.length > 0) {
        const promo = codes[0];
        promoCodeId = promo.id;
        
        if (promo.type === 'percentage') {
          discountAmount = calculatedTotal * (parseFloat(promo.value) / 100);
        } else if (promo.type === 'fixed') {
          discountAmount = parseFloat(promo.value);
        } else if (promo.type === 'free_shipping') {
          shippingAmount = 0;
        }

        // Increment uses
        await pool.execute('UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = ?', [promo.id]);
      }
    }

    const finalTotal = Math.max(0, calculatedTotal - discountAmount + shippingAmount);

    const chargedAmount = paymentIntent.amount / 100;
    if (Math.abs(chargedAmount - finalTotal) > 0.01) {
      console.error(`Price mismatch! Charged: ${chargedAmount}, Calculated: ${finalTotal}`);
      return res.status(400).json({ 
        error: 'Niezgodność kwoty. Skontaktuj się z obsługą.',
        charged: chargedAmount,
        calculated: finalTotal
      });
    }

    const orderId = uuidv4();
    
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;

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

    await pool.execute(`
      INSERT INTO orders (id, user_id, items, total, status, payment_intent_id, shipping_address, customer_email, customer_name, customer_phone, delivery_method, delivery_cost, promo_code_id, discount_amount)
      VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      shippingAmount,
      promoCodeId,
      discountAmount
    ]);

    // Log promo code usage
    if (promoCodeId) {
      await pool.execute(
        'INSERT INTO promo_code_uses (id, promo_code_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), promoCodeId, userId, orderId, discountAmount]
      );
    }

    // Save customization files
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

    // Log initial status
    await pool.execute(
      'INSERT INTO order_status_history (id, order_id, old_status, new_status) VALUES (?, ?, ?, ?)',
      [uuidv4(), orderId, null, 'paid']
    );

    // Create notification for admins
    const [admins] = await pool.execute(`
      SELECT u.id FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('superadmin', 'admin')
    `);
    for (const admin of admins) {
      await createNotification(admin.id, 'order', 'Nowe zamówienie', `#${orderId.slice(0, 8)} - ${finalTotal.toFixed(2)} zł`, `/admin/orders`);
    }

    const orderForEmail = {
      id: orderId,
      items: validatedItems,
      total: finalTotal,
      customer_email: sanitize(customer_email),
      shipping_address: shipping_address
    };

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

    const [orders] = await pool.execute(
      'SELECT id, status FROM orders WHERE payment_intent_id = ?', 
      [payment_intent_id]
    );

    if (orders.length === 0) {
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

// ============ NOTIFICATIONS ============

app.get('/admin/notifications', authenticate, async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/admin/notifications/read-all', authenticate, async (req, res) => {
  try {
    await pool.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ============ PUBLIC STATS ============

app.get('/stats/public', async (req, res) => {
  try {
    const [[{ count: totalProducts }]] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE is_visible = TRUE AND is_archived = FALSE');
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
    const [[{ count: pendingOrders }]] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE status = 'paid'");

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

// ============ REPORTS ============

app.get('/admin/reports/sales', authenticate, requirePermission('finance.reports'), async (req, res) => {
  const { start_date, end_date, group_by } = req.query;

  try {
    let dateFormat = '%Y-%m-%d';
    if (group_by === 'month') dateFormat = '%Y-%m';
    if (group_by === 'week') dateFormat = '%Y-%u';

    const [data] = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, ?) as period,
        COUNT(*) as orders,
        SUM(total) as revenue,
        AVG(total) as avg_order,
        SUM(discount_amount) as total_discounts
      FROM orders
      WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
      ${start_date ? 'AND created_at >= ?' : ''}
      ${end_date ? 'AND created_at <= ?' : ''}
      GROUP BY period
      ORDER BY period DESC
    `, [dateFormat, ...(start_date ? [start_date] : []), ...(end_date ? [end_date] : [])]);

    res.json(data.map(d => ({
      ...d,
      revenue: parseFloat(d.revenue),
      avg_order: parseFloat(d.avg_order),
      total_discounts: parseFloat(d.total_discounts)
    })));
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/admin/reports/products', authenticate, requirePermission('finance.reports'), async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    // This is simplified - in production you'd parse JSON items properly
    const [products] = await pool.execute('SELECT id, name, price FROM products ORDER BY name');
    
    res.json(products);
  } catch (err) {
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
