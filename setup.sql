-- ============================================================
-- LuxeMart — Full Database Schema
-- Run this once in phpMyAdmin or MySQL CLI:
--   mysql -u root -p < setup.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS luxemart_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE luxemart_db;

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(160)  NOT NULL UNIQUE,
    picture       VARCHAR(400)  DEFAULT NULL,
    role          ENUM('buyer','seller','admin') NOT NULL DEFAULT 'buyer',
    phone         VARCHAR(20)   DEFAULT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── PRODUCTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255)  NOT NULL,
    brand         VARCHAR(100)  NOT NULL DEFAULT '',
    description   TEXT          NOT NULL,
    price         DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2) DEFAULT NULL,
    image_url     VARCHAR(400)  NOT NULL DEFAULT '',
    category      VARCHAR(60)   NOT NULL DEFAULT 'general',
    seller_email  VARCHAR(160)  DEFAULT NULL,
    stock         INT UNSIGNED  NOT NULL DEFAULT 0,
    rating        DECIMAL(3,1)  NOT NULL DEFAULT 0.0,
    reviews_count INT UNSIGNED  NOT NULL DEFAULT 0,
    badge         VARCHAR(30)   DEFAULT NULL,   -- 'New', 'Sale', 'Hot', etc.
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    colors        JSON          DEFAULT NULL,   -- ["Black","White"]
    sizes         JSON          DEFAULT NULL,   -- ["S","M","L"]
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category    (category),
    INDEX idx_seller      (seller_email),
    INDEX idx_active      (is_active),
    INDEX idx_price       (price),
    INDEX idx_rating      (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── CART ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_email    VARCHAR(160)  NOT NULL,
    product_id    INT UNSIGNED  NOT NULL,
    qty           INT UNSIGNED  NOT NULL DEFAULT 1,
    added_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_product (user_email, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── WISHLIST ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_email    VARCHAR(160)  NOT NULL,
    product_id    INT UNSIGNED  NOT NULL,
    added_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_product (user_email, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number         VARCHAR(30)   NOT NULL UNIQUE,
    user_email           VARCHAR(160)  DEFAULT NULL,
    customer_name        VARCHAR(120)  NOT NULL,
    customer_email       VARCHAR(160)  NOT NULL,
    customer_phone       VARCHAR(20)   DEFAULT NULL,
    address              VARCHAR(255)  NOT NULL,
    city                 VARCHAR(80)   NOT NULL,
    zip                  VARCHAR(20)   NOT NULL,
    country              VARCHAR(60)   NOT NULL DEFAULT 'Kenya',
    shipping_method      ENUM('standard','express') NOT NULL DEFAULT 'standard',
    payment_method       ENUM('card','mpesa','paypal') NOT NULL DEFAULT 'card',
    subtotal             DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_cost        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status               ENUM('Processing','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Processing',
    notes                TEXT          DEFAULT NULL,
    checkout_request_id  VARCHAR(120)  DEFAULT NULL,   -- M-Pesa
    mpesa_receipt        VARCHAR(60)   DEFAULT NULL,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (user_email),
    INDEX idx_status     (status),
    INDEX idx_created    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── ORDER ITEMS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id      INT UNSIGNED  NOT NULL,
    product_id    INT UNSIGNED  NOT NULL,
    product_name  VARCHAR(255)  NOT NULL,   -- snapshot at time of purchase
    product_img   VARCHAR(400)  NOT NULL DEFAULT '',
    unit_price    DECIMAL(12,2) NOT NULL,
    qty           INT UNSIGNED  NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── REVIEWS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id    INT UNSIGNED  NOT NULL,
    user_email    VARCHAR(160)  NOT NULL,
    user_name     VARCHAR(120)  NOT NULL,
    rating        TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body          TEXT          NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_product (user_email, product_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── DISCOUNT CODES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code          VARCHAR(40)   NOT NULL UNIQUE,
    type          ENUM('percent','flat') NOT NULL DEFAULT 'percent',
    value         DECIMAL(10,2) NOT NULL,   -- 10 = 10% or KSh 10
    min_order     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_uses      INT UNSIGNED  DEFAULT NULL,
    used_count    INT UNSIGNED  NOT NULL DEFAULT 0,
    expires_at    DATETIME      DEFAULT NULL,
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SEED DATA ───────────────────────────────────────────────

-- Admin user
INSERT IGNORE INTO users (name, email, role) VALUES
('Admin', 'aouko178@gmail.com', 'admin');

-- Discount codes
INSERT IGNORE INTO discount_codes (code, type, value, min_order) VALUES
('SAVE10',  'percent', 10,   0),
('LUXE20',  'percent', 20,   5000),
('FLAT500', 'flat',    500,  2000),
('WELCOME', 'percent', 15,   0);

-- Sample products (matches products.js IDs)
INSERT IGNORE INTO products
    (id, name, brand, description, price, original_price, image_url, category, stock, rating, reviews_count, badge, colors, sizes)
VALUES
(1,  "Men's Classic Leather Jacket",    'UrbanEdge',    'Premium genuine leather jacket with slim fit.',                                   8500,  12000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', 'fashion',     50, 4.7, 128, 'Sale',    '["Black","Brown"]',           '["S","M","L","XL"]'),
(2,  "Women''s Floral Summer Dress",     'BlossomWear',  'Light floral dress made from 100% breathable cotton.',                            3200,   4500, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&q=80', 'fashion',     80, 4.5,  94, 'Sale',    '["Blue","Pink","White"]',     '["XS","S","M","L"]'),
(3,  "Men''s Slim Fit Chinos",           'UrbanEdge',    'Modern slim-fit chinos with stretch fabric.',                                     2800,   NULL, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80', 'fashion',     60, 4.3,  67, 'New',     '["Khaki","Navy","Olive"]',    '["28","30","32","34","36"]'),
(4,  "Women''s Oversized Hoodie",        'CozyThreads',  'Super soft oversized hoodie for casual outings.',                                 2200,   3000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', 'fashion',    120, 4.8, 213, 'Hot',     '["Grey","Black","Pink"]',     '["S","M","L","XL","XXL"]'),
(5,  'Sony WH-1000XM5 Headphones',      'Sony',         'Industry-leading noise cancellation, 30-hour battery.',                          32000,  42000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80', 'electronics', 30, 4.9, 512, 'Sale',    '["Black","Silver"]',          NULL),
(6,  'Samsung 65" 4K Smart TV',         'Samsung',      'Crystal UHD 4K TV with Alexa built-in.',                                        85000, 110000, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80', 'electronics', 15, 4.6, 189, 'Sale',    '["Black"]',                   NULL),
(7,  'Apple AirPods Pro (2nd Gen)',      'Apple',        'Active noise cancellation and adaptive audio.',                                  28000,   NULL, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&q=80', 'electronics', 45, 4.8, 743, 'New',     '["White"]',                   NULL),
(8,  'JBL Charge 5 Bluetooth Speaker',  'JBL',          'Waterproof speaker with 20 hours of playtime.',                                 12500,  16000, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80', 'electronics', 55, 4.7, 324, 'Hot',     '["Black","Blue","Red"]',      NULL),
(9,  'iPhone 15 Pro Max',               'Apple',        'A17 Pro chip, titanium design, 48MP camera.',                                  175000,   NULL, 'https://images.unsplash.com/photo-1696426505524-6e63e1d4e8d3?w=600&q=80', 'electronics', 20, 4.9,1024, 'New',     '["Natural Titanium","Black Titanium"]', '["256GB","512GB","1TB"]'),
(10, 'Luxury Bedding Set (King)',        'DreamHome',    'Egyptian cotton 1000 thread count bedding set.',                                 6800,   9500, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80', 'home',        35, 4.6,  87, 'Sale',    '["White","Cream","Grey"]',    '["King","Queen"]'),
(11, 'Nespresso Vertuo Coffee Machine',  'Nespresso',    'One-touch machine for 5 different cup sizes.',                                  14500,   NULL, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', 'home',        40, 4.8, 256, 'New',     '["Black","Silver"]',          NULL),
(12, 'Minimalist Desk Lamp',            'LumiHome',     'LED lamp with 5 colour temps and USB charging.',                                 3500,   5000, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80', 'home',        70, 4.4, 112, 'Sale',    '["Black","White","Gold"]',    NULL),
(13, 'Fenty Beauty Foundation',         'Fenty Beauty', 'Full-coverage, 50 shades, sweat-resistant.',                                     4200,   NULL, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80', 'beauty',      90, 4.7, 389, 'New',     '["Various"]',                 '["30ml"]'),
(14, 'The Ordinary Skincare Set',       'The Ordinary', 'Vitamin C, Hyaluronic Acid, Niacinamide and SPF.',                              3800,   5200, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80', 'beauty',      60, 4.6, 476, 'Hot',     NULL,                          NULL),
(15, 'Dyson Airwrap Styler',            'Dyson',        'Curls, waves, smooths and dries simultaneously.',                               52000,  65000, 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80', 'beauty',      18, 4.8, 631, 'Sale',    '["Nickel/Copper","Prussian Blue"]', NULL),
(16, 'Nike Dri-FIT Running Set',        'Nike',         'Moisture-wicking top and shorts for long runs.',                                 4500,   6000, 'https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=600&q=80', 'sports',      85, 4.5, 203, 'Sale',    '["Black","Blue","Grey"]',     '["S","M","L","XL"]'),
(17, 'Yoga Mat Pro (6mm)',              'ZenFit',       'Non-slip eco-friendly TPE mat with alignment lines.',                            2800,   NULL, 'https://images.unsplash.com/photo-1601925228907-9c24af27ac5f?w=600&q=80', 'sports',     100, 4.6, 178, 'New',     '["Purple","Blue","Green"]',   NULL),
(18, 'Adjustable Dumbbell Set 5-25kg',  'PowerFlex',    'Space-saving quick-change dial dumbbell system.',                               15000,  20000, 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80', 'sports',      25, 4.7, 145, 'Hot',     '["Black/Silver"]',            NULL),
(19, 'LEGO Technic Racing Car',         'LEGO',         '672-piece set for ages 10 and up.',                                              5500,   NULL, 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80', 'kids',        40, 4.9, 234, 'New',     '["Multicolor"]',              NULL),
(20, "Kids'' Waterproof Jacket",         'KidZone',      '100% waterproof with reflective strips.',                                        2400,   3200, 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&q=80', 'kids',        55, 4.4,  89, 'Sale',    '["Red","Blue","Yellow"]',     '["3-4Y","5-6Y","7-8Y","9-10Y"]'),
(21, 'Nike Air Max 270',                'Nike',         'Iconic Air Max cushioning in a sleek silhouette.',                              14500,  18000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', 'footwear',    65, 4.8, 567, 'Hot',     '["White/Black","Black/Red"]', '["39","40","41","42","43","44","45"]'),
(22, 'Adidas Ultraboost 23',            'Adidas',       'Responsive Boost midsole with Primeknit upper.',                                16000,   NULL, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80', 'footwear',    50, 4.7, 412, 'New',     '["Core Black","Cloud White"]', '["39","40","41","42","43","44"]'),
(23, "Women''s Block Heel Sandals",     'GlamStep',     'Cushioned footbed, perfect for office and evening.',                             3800,   5500, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80', 'footwear',    70, 4.3, 134, 'Sale',    '["Nude","Black","White"]',    '["36","37","38","39","40","41"]'),
(24, 'Rolex Submariner (Homage)',       'TimeMaster',   'Stainless steel dive watch, sapphire crystal.',                                 45000,  60000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80', 'watches',     20, 4.8,  98, 'Hot',     '["Silver/Black","Gold/Blue"]', NULL),
(25, 'Apple Watch Series 9',            'Apple',        'Double tap gesture, bright Always-On display.',                                 55000,   NULL, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80', 'watches',     30, 4.9, 823, 'New',     '["Midnight","Starlight","Product Red"]', '["41mm","45mm"]'),
(26, 'Casio G-Shock GA-2100',           'Casio',        'Shock resistant, 200m water resistant, solar.',                                 12000,  15000, 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=600&q=80', 'watches',     45, 4.7, 445, 'Sale',    '["Black","White","Camouflage"]', NULL);
