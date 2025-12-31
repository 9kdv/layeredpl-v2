# Layered Backend API

Backend API dla sklepu Layered.pl

## Szybki start

### Docker (zalecane)

1. Ustaw zmienne środowiskowe w `docker-compose.yml`:
   - `JWT_SECRET` - sekretny klucz do JWT (zmień na własny!)
   - `STRIPE_SECRET_KEY` - klucz sekretny Stripe (sk_test_... lub sk_live_...)
   - `STRIPE_WEBHOOK_SECRET` - sekret webhooka Stripe
   - `STRIPE_PUBLISHABLE_KEY` - klucz publiczny Stripe

2. Uruchom:
```bash
docker-compose up -d
```

### Bez Dockera

1. Zainstaluj zależności:
```bash
npm install
```

2. Ustaw zmienne środowiskowe:
```bash
export JWT_SECRET="your-secret-key"
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export STRIPE_PUBLISHABLE_KEY="pk_test_..."
export FRONTEND_URL="https://layered.pl"
```

3. Uruchom:
```bash
npm start
```

## Konfiguracja Nginx

Dodaj do konfiguracji Nginx:

```nginx
location /api/ {
    proxy_pass http://localhost:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Domyślne konto admina

- Email: `admin@layered.pl`
- Hasło: `admin123`

**WAŻNE:** Zmień hasło po pierwszym logowaniu!

## API Endpoints

### Auth
- `POST /auth/login` - logowanie
- `POST /auth/register` - rejestracja
- `GET /auth/me` - dane zalogowanego użytkownika

### Produkty
- `GET /products` - lista produktów
- `GET /products/:id` - pojedynczy produkt
- `POST /products` - dodaj produkt (admin)
- `PUT /products/:id` - edytuj produkt (admin)
- `DELETE /products/:id` - usuń produkt (admin)

### Kategorie
- `GET /categories` - lista kategorii

### Zamówienia
- `GET /orders` - lista zamówień (admin)
- `GET /orders/:id` - szczegóły zamówienia
- `PUT /orders/:id/status` - zmień status (admin)

### Płatności
- `GET /checkout/config` - konfiguracja Stripe
- `POST /checkout/create-payment-intent` - utwórz płatność

### Admin
- `GET /admin/stats` - statystyki (admin)

### Webhook
- `POST /webhook` - webhook Stripe

## Stripe - obsługiwane metody płatności

- Karta (Visa, Mastercard, etc.)
- Apple Pay / Google Pay (przez Link)
- BLIK
- PayPal
- Klarna
- Bancontact
- EPS
- Link
- Przelewy24 (P24)
