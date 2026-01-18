# Backend Server.js - Wymagane aktualizacje dla personalizacji produktów

## 1. Zaktualizuj schemat tabeli `products` (około linii 125-140)

```sql
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
  customization JSON,  -- NOWE: opcje personalizacji produktu
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

## 2. Zaktualizuj schemat tabeli `orders` (około linii 143-157)

```sql
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
```

## 3. Dodaj tabelę na przesłane pliki personalizacji

```sql
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
```

## 4. Zaktualizuj endpoint POST /products (około linii 666-706)

```javascript
app.post('/products', authenticate, requireAdmin, upload.array('images', 5), async (req, res) => {
  const { name, description, long_description, price, category, availability, specifications, customization, featured } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Nazwa i cena są wymagane' });
  }

  try {
    const id = uuidv4();
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    // Parsowanie customization - może być string lub obiekt
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
```

## 5. Zaktualizuj endpoint PUT /products/:id (około linii 708-752)

```javascript
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

    // Parsowanie customization
    let customizationData = product.customization;
    if (customization !== undefined) {
      try {
        customizationData = typeof customization === 'string' ? customization : JSON.stringify(customization);
      } catch (e) {
        customizationData = null;
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
```

## 6. Zaktualizuj endpoint GET /products i GET /products/:id

Dodaj parsowanie pola `customization` w odpowiedzi:

```javascript
// W GET /products (około linii 640-665)
res.json(products.map(p => ({
  ...p,
  price: parseFloat(p.price),
  images: JSON.parse(p.images || '[]'),
  specifications: JSON.parse(p.specifications || '[]'),
  customization: p.customization ? JSON.parse(p.customization) : null
})));

// W GET /products/:id
res.json({
  ...product,
  price: parseFloat(product.price),
  images: JSON.parse(product.images || '[]'),
  specifications: JSON.parse(product.specifications || '[]'),
  customization: product.customization ? JSON.parse(product.customization) : null
});
```

## 7. Dodaj endpoint do uploadu plików personalizacji

```javascript
// Upload plików do personalizacji (przed złożeniem zamówienia)
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
```

## 8. Zaktualizuj endpoint checkout/create-payment-intent

Upewnij się, że items w zamówieniu zawierają pełne dane personalizacji:

```javascript
app.post('/checkout/create-payment-intent', async (req, res) => {
  const { items, customerEmail, customerName, customerPhone, shippingAddress, deliveryMethod, deliveryCost, userId, saveAddress } = req.body;

  try {
    // Walidacja produktów i cen
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [item.id]);
      if (products.length === 0) {
        return res.status(400).json({ error: `Produkt ${item.name} nie istnieje` });
      }

      const product = products[0];
      const basePrice = parseFloat(product.price);
      
      // Oblicz cenę z personalizacją
      const customizationPrice = item.customizationPrice || 0;
      const itemTotal = (basePrice + customizationPrice) * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        id: item.id,
        cartItemId: item.cartItemId,
        name: product.name,
        price: basePrice,
        quantity: item.quantity,
        image: item.image,
        customizations: item.customizations || [],
        customizationPrice: customizationPrice,
        nonRefundable: item.nonRefundable || false,
        nonRefundableAccepted: item.nonRefundableAccepted || false
      });
    }

    // Dodaj koszt dostawy
    const totalWithDelivery = calculatedTotal + (deliveryCost || 0);

    // Utwórz PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalWithDelivery * 100),
      currency: 'pln',
      payment_method_types: ['card', 'blik', 'p24'],
      metadata: {
        customerEmail,
        customerName
      }
    });

    // Zapisz zamówienie
    const orderId = uuidv4();
    await pool.execute(`
      INSERT INTO orders (id, user_id, items, total, status, payment_intent_id, shipping_address, customer_email, customer_name, customer_phone, delivery_method, delivery_cost)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      userId || null,
      JSON.stringify(validatedItems),
      totalWithDelivery,
      paymentIntent.id,
      JSON.stringify(shippingAddress),
      customerEmail,
      customerName,
      customerPhone,
      deliveryMethod || 'courier',
      deliveryCost || 0
    ]);

    // Zapisz pliki personalizacji do tabeli customization_files
    for (const item of validatedItems) {
      if (item.customizations) {
        for (const customization of item.customizations) {
          if (customization.uploadedFiles) {
            for (const file of customization.uploadedFiles) {
              await pool.execute(`
                INSERT INTO customization_files (id, order_id, product_id, cart_item_id, file_name, file_path, file_size, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                file.id,
                orderId,
                item.id,
                item.cartItemId,
                file.name,
                file.url,
                file.size || 0,
                'image'
              ]);
            }
          }
        }
      }
    }

    // Opcjonalnie zapisz adres
    if (saveAddress && userId) {
      const addressId = uuidv4();
      await pool.execute(`
        INSERT INTO saved_addresses (id, user_id, label, street, city, postal_code, country, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)
      `, [
        addressId,
        userId,
        'Adres dostawy',
        shippingAddress.street,
        shippingAddress.city,
        shippingAddress.postalCode,
        shippingAddress.country || 'Polska'
      ]);
    }

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId
    });
  } catch (err) {
    console.error('Payment intent error:', err);
    res.status(500).json({ error: 'Błąd tworzenia płatności' });
  }
});
```

## 9. Dodaj endpoint do pobierania plików personalizacji zamówienia (dla admina)

```javascript
app.get('/orders/:id/files', authenticate, requireAdmin, async (req, res) => {
  try {
    const [files] = await pool.execute(`
      SELECT * FROM customization_files WHERE order_id = ?
    `, [req.params.id]);

    res.json(files);
  } catch (err) {
    console.error('Get order files error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});
```

## 10. Zaktualizuj endpoint aktualizacji statusu zamówienia

```javascript
app.put('/orders/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { status, adminNotes, trackingNumber } = req.body;

  const validStatuses = ['pending', 'paid', 'processing', 'awaiting_info', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Nieprawidłowy status' });
  }

  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Zamówienie nie znalezione' });

    const order = orders[0];

    await pool.execute(`
      UPDATE orders SET status = ?, admin_notes = ?, tracking_number = ? WHERE id = ?
    `, [status, adminNotes || order.admin_notes, trackingNumber || order.tracking_number, req.params.id]);

    // Wysyłaj emaile w zależności od statusu
    if (status === 'shipped' && trackingNumber) {
      await sendOrderEmail(order.customer_email, 'shipped', { 
        ...order, 
        tracking_number: trackingNumber 
      });
    } else if (status === 'delivered') {
      await sendOrderEmail(order.customer_email, 'delivered', order);
    } else if (status === 'awaiting_info') {
      // Email z prośbą o kontakt/poprawę
      await sendOrderEmail(order.customer_email, 'awaiting_info', {
        ...order,
        admin_notes: adminNotes
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});
```

## 11. Zaktualizuj funkcję sendOrderEmail o nowy typ

```javascript
async function sendOrderEmail(email, type, orderData) {
  const subjects = {
    confirmation: `Potwierdzenie zamówienia #${orderData.id?.slice(0, 8)}`,
    shipped: `Twoje zamówienie zostało wysłane`,
    delivered: `Zamówienie dostarczone`,
    awaiting_info: `Wymagane działanie - zamówienie #${orderData.id?.slice(0, 8)}`
  };

  const templates = {
    confirmation: `
      <h1>Dziękujemy za zamówienie!</h1>
      <p>Numer zamówienia: <strong>${orderData.id}</strong></p>
      <p>Kwota: <strong>${orderData.total} PLN</strong></p>
      <p>Wkrótce rozpoczniemy realizację.</p>
    `,
    shipped: `
      <h1>Twoje zamówienie jest w drodze!</h1>
      <p>Numer zamówienia: <strong>${orderData.id}</strong></p>
      ${orderData.tracking_number ? `<p>Numer śledzenia: <strong>${orderData.tracking_number}</strong></p>` : ''}
      <p>Śledź przesyłkę na stronie przewoźnika.</p>
    `,
    delivered: `
      <h1>Zamówienie dostarczone!</h1>
      <p>Numer zamówienia: <strong>${orderData.id}</strong></p>
      <p>Dziękujemy za zakupy w Layered!</p>
    `,
    awaiting_info: `
      <h1>Wymagane działanie</h1>
      <p>Numer zamówienia: <strong>${orderData.id}</strong></p>
      <p>Napotkaliśmy problem z Twoim zamówieniem i potrzebujemy dodatkowych informacji.</p>
      ${orderData.admin_notes ? `<p><strong>Uwaga:</strong> ${orderData.admin_notes}</p>` : ''}
      <p>Prosimy o kontakt pod adresem kontakt@layered.pl</p>
    `
  };

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || 'noreply@layered.pl',
      to: email,
      subject: subjects[type],
      html: templates[type]
    });
  } catch (err) {
    console.error('Email send error:', err);
  }
}
```

---

## Migracja bazy danych

Jeśli masz już istniejące dane, wykonaj te komendy SQL aby dodać nowe kolumny:

```sql
-- Dodaj kolumnę customization do products
ALTER TABLE products ADD COLUMN customization JSON AFTER specifications;

-- Zaktualizuj ENUM statusów w orders
ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'paid', 'processing', 'awaiting_info', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded') DEFAULT 'pending';

-- Dodaj nowe kolumny do orders
ALTER TABLE orders ADD COLUMN delivery_method VARCHAR(50) AFTER customer_phone;
ALTER TABLE orders ADD COLUMN delivery_cost DECIMAL(10, 2) DEFAULT 0 AFTER delivery_method;
ALTER TABLE orders ADD COLUMN admin_notes TEXT AFTER delivery_cost;
ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255) AFTER admin_notes;
ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Utwórz tabelę na pliki personalizacji
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
);
```

---

## Struktura przykładowego obiektu customization w produkcie

```json
{
  "options": [
    {
      "id": "color",
      "type": "color",
      "label": "Kolor",
      "required": true,
      "priceType": "add",
      "colorOptions": [
        { "name": "Biały", "hex": "#FFFFFF", "priceModifier": 0 },
        { "name": "Czarny", "hex": "#000000", "priceModifier": 0 },
        { "name": "Złoty", "hex": "#FFD700", "priceModifier": 5 }
      ],
      "multipleColors": false,
      "colorLimit": 1
    },
    {
      "id": "material",
      "type": "material",
      "label": "Materiał",
      "required": true,
      "priceType": "add",
      "materialOptions": [
        { "name": "PLA", "code": "pla", "priceModifier": 0 },
        { "name": "PETG", "code": "petg", "priceModifier": 10 }
      ]
    },
    {
      "id": "text",
      "type": "text",
      "label": "Tekst do nadruku",
      "required": false,
      "priceType": "add",
      "textConfig": {
        "maxLength": 20,
        "allowEmoji": false,
        "allowProfanity": false,
        "placeholder": "Wpisz imię..."
      },
      "fontOptions": ["Arial", "Roboto", "Playfair Display"]
    },
    {
      "id": "photo",
      "type": "file",
      "label": "Zdjęcie do litofanu",
      "required": true,
      "priceType": "free_limit",
      "freeLimit": 1,
      "fileConfig": {
        "allowedFormats": ["jpg", "png", "heic"],
        "maxFiles": 3,
        "maxSizeMB": 10,
        "showPreview": true
      }
    }
  ],
  "nonRefundable": true,
  "nonRefundableReason": "Produkt personalizowany - nie podlega zwrotowi"
}
```
