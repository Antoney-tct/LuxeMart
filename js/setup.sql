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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table
-- Stores general order information and status
CREATE TABLE IF NOT EXISTS orders (
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
INSERT INTO products (name, brand, price, category, stock) 
VALUES ('Wireless Headphones', 'LuxeAudio', 5500.00, 'electronics', 50);