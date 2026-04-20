-- LuxeMart Database Initialization Script
CREATE DATABASE IF NOT EXISTS luxemart_db;
USE luxemart_db;

-- 1. Products Table
-- Stores details of items available for purchase
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    category VARCHAR(50),
    seller_email VARCHAR(100),
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating DECIMAL(2,1) DEFAULT 0.0,
    reviews INT DEFAULT 0,
    originalPrice DECIMAL(10, 2) NULL, -- Renamed to match products.js
    badge VARCHAR(50) NULL,
    colors TEXT NULL, -- Added to store JSON array
    sizes TEXT NULL   -- Added to store JSON array
);

-- 2. Orders Table
-- Stores general order information and status
CREATE TABLE IF NOT EXISTS orders (
    -- Existing columns...
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    zip VARCHAR(20),
    total DECIMAL(10, 2),
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Processing',
    checkout_request_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Order Items Table
-- Relates products to specific orders (The lookup junction)
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Sample Data for Testing Name Lookup
INSERT INTO products (name, brand, price, category, stock, rating, reviews, originalPrice, badge) 
VALUES 
('Wireless Headphones', 'LuxeAudio', 5500.00, 'electronics', 50, 4.5, 120, 6000.00, 'New'),
('Smartwatch X', 'TechWear', 3200.00, 'electronics', 30, 4.2, 80, NULL, NULL),
('Designer Handbag', 'ChicBags', 12000.00, 'fashion', 15, 4.8, 50, 15000.00, 'Sale'),
('Running Shoes', 'StrideFit', 4500.00, 'footwear', 100, 4.0, 200, NULL, NULL),
('Coffee Maker', 'HomeBrew', 2800.00, 'home', 40, 4.6, 90, NULL, NULL),
('Yoga Mat Pro', 'ZenLife', 1500.00, 'sports', 70, 4.9, 150, NULL, 'Hot');