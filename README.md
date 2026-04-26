# LuxeMart — Setup & Deployment Guide

Full-stack e-commerce platform built for XAMPP (PHP + MySQL).  
Payments via M-Pesa (Safaricom Daraja), Google Sign-In for auth.

---

## Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Vanilla HTML/CSS/JS (no build step) |
| Backend   | PHP 8.0+                            |
| Database  | MySQL 5.7+ / MariaDB 10.4+          |
| Auth      | Google Identity Services (JWT)      |
| Payments  | Safaricom Daraja STK Push           |
| Server    | Apache (XAMPP)                      |

---

## Local Setup (XAMPP)

### 1. Clone / Copy Files

```
C:\xampp\htdocs\LuxeMart\
├── api/
├── js/
├── css/
├── db.php
├── setup.sql
├── .htaccess
└── index.html  (+ all other HTML pages)
```

### 2. Start XAMPP

Open XAMPP Control Panel → Start **Apache** and **MySQL**.

### 3. Create the Database

1. Open `http://localhost/phpmyadmin`
2. Click **Import** → choose `setup.sql` → click **Go**
3. This creates `luxemart_db` with all tables and seed data

### 4. Configure the Database Connection

Open `db.php` and verify:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'luxemart_db');
define('DB_USER', 'root');
define('DB_PASS', '');       // XAMPP default is empty
```

### 5. Open the Site

```
http://localhost/LuxeMart/index.html
```

---

## Admin Access

The admin account is set by email address, hardcoded server-side.  
Edit `api/auth/login.php` line ~20 to change it:

```php
if ($email === 'your@email.com') {
    $role = 'admin';
}
```

Sign in with Google using that email → automatically redirected to `admin.html`.

---

## M-Pesa Setup

### Sandbox (Testing)

The sandbox credentials in `api/mpesa/stk_push.php` work for testing  
at [developer.safaricom.co.ke](https://developer.safaricom.co.ke).

To test locally with a real callback, use **ngrok**:

```bash
ngrok http 80
```

Then update `$callbackUrl` in `stk_push.php`:

```php
$callbackUrl = 'https://YOUR-NGROK-URL.ngrok.io/LuxeMart/api/mpesa/callback.php';
```

### Production

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app → get Consumer Key + Consumer Secret
3. Update `api/mpesa/stk_push.php`:

```php
$consumerKey    = 'YOUR_PRODUCTION_KEY';
$consumerSecret = 'YOUR_PRODUCTION_SECRET';
$shortCode      = 'YOUR_PAYBILL_OR_TILL';
$passkey        = 'YOUR_PRODUCTION_PASSKEY';
$callbackUrl    = 'https://yourdomain.co.ke/api/mpesa/callback.php';
$isSandbox      = false;
```

---

## Google Sign-In Setup

The Google Client ID is set in two places:

1. `js/common.js` — `const CLIENT_ID = '...'`
2. `api/auth/login.php` (receives the decoded payload, no key needed)

To use your own Google account for auth:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web application
4. Add `http://localhost` to Authorised JavaScript origins
5. Replace the Client ID in `js/common.js`

---

## File Structure

```
LuxeMart/
├── api/
│   ├── auth/
│   │   ├── login.php        ← Google JWT → session
│   │   ├── logout.php       ← destroy session
│   │   ├── me.php           ← return current user
│   │   └── set_role.php     ← buyer → seller upgrade
│   ├── cart/
│   │   └── index.php        ← GET/POST (add/set/remove/clear)
│   ├── orders/
│   │   ├── create.php       ← place order, decrement stock
│   │   ├── get.php          ← user order history
│   │   ├── cancel.php       ← cancel + restore stock
│   │   └── seller_orders.php← orders with seller's products
│   ├── products/
│   │   ├── get.php          ← list with filter/sort/paginate
│   │   ├── single.php       ← single product + reviews
│   │   ├── create.php       ← seller: add product
│   │   ├── update.php       ← seller: edit product
│   │   ├── delete.php       ← seller: delete product
│   │   ├── toggle.php       ← seller: activate/deactivate
│   │   ├── seller.php       ← list seller's own products
│   │   └── review.php       ← submit review + recalc rating
│   ├── wishlist/
│   │   └── index.php        ← GET/POST toggle
│   ├── discount/
│   │   └── check.php        ← validate promo code
│   ├── admin/
│   │   ├── stats.php        ← dashboard stats + chart data
│   │   ├── orders.php       ← all orders with filter
│   │   ├── update_order.php ← change order status
│   │   └── users.php        ← GET all users / POST update role
│   └── mpesa/
│       ├── stk_push.php     ← initiate STK push
│       ├── callback.php     ← Safaricom async callback
│       └── check_status.php ← poll payment status
│
├── js/
│   ├── common.js     ← API helper, auth, toast, theme, chatbot
│   ├── cart.js       ← server cart + guest fallback
│   ├── checkout.js   ← form, validation, order, M-Pesa
│   ├── orders.js     ← order history, filter, cancel
│   ├── seller.js     ← seller dashboard CRUD
│   ├── admin.js      ← admin dashboard + chart
│   ├── main2.js      ← product grid, filters, hero slider
│   └── products.js   ← static product array (fallback)
│
├── css/
│   ├── main.css
│   └── products-extra.css
│
├── db.php            ← PDO connection
├── setup.sql         ← database schema + seed data
├── .htaccess         ← security + caching
│
└── *.html            ← all page files
```

---

## API Response Format

All endpoints return JSON:

```json
{ "success": true,  "data": ... }
{ "success": false, "message": "Error description." }
```

Auth-protected endpoints return `401` if not logged in.  
Admin endpoints return `403` if role is insufficient.

---

## Roles

| Role   | Can Do                                          |
|--------|-------------------------------------------------|
| buyer  | Browse, cart, wishlist, place orders            |
| seller | Everything buyer can + manage own products       |
| admin  | Everything + manage all orders, users, products |

Role is enforced **server-side** in every protected endpoint.  
Client-sent role values are never trusted.

---

## Discount Codes (pre-seeded)

| Code     | Type    | Value | Min Order |
|----------|---------|-------|-----------|
| SAVE10   | percent | 10%   | Any       |
| LUXE20   | percent | 20%   | KSh 5,000 |
| FLAT500  | flat    | KSh 500 | KSh 2,000 |
| WELCOME  | percent | 15%   | Any       |

Add more in phpMyAdmin → `discount_codes` table.

---

## Production Deployment (InfinityFree / cPanel)

1. Upload all files via FTP
2. Create MySQL database in cPanel → import `setup.sql`
3. Update `db.php` with your hosting credentials
4. Update `stk_push.php` with production M-Pesa keys
5. Update `$callbackUrl` to your live domain
6. Add your live domain to Google OAuth Authorised Origins
7. Enable HTTPS and uncomment the HTTPS redirect in `.htaccess`
8. Remove `'debug' => $e->getMessage()` from `db.php`

---

## Common Issues

**White page / PHP errors**  
→ Enable error display temporarily: add `ini_set('display_errors', 1);` to `db.php`

**Google Sign-In not working**  
→ Make sure `localhost` is in Authorised JavaScript origins in Google Console

**M-Pesa callback not received locally**  
→ Use ngrok: `ngrok http 80` and set the forwarding URL as callback

**Cart not persisting after login**  
→ `mergeGuestCart()` is called in `common.js` after `completeLogin()` — check browser console for errors

**Images not uploading**  
→ Create `uploads/` folder in project root and set permissions to 755
