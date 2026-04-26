<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || !in_array($_SESSION['role'], ['seller','admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

$email = $_SESSION['user_email'];

// Admin can pass ?email=xxx to view any seller
if ($_SESSION['role'] === 'admin' && !empty($_GET['email'])) {
    $email = $_GET['email'];
}

$stmt = $pdo->prepare("
    SELECT
        id, name, brand, description, price, original_price,
        image_url, category, stock, rating, reviews_count,
        badge, is_active, created_at
    FROM products
    WHERE seller_email = ?
    ORDER BY created_at DESC
");

$stmt->execute([$email]);
$products = $stmt->fetchAll();

foreach ($products as &$p) {
    $p['id']      = (int)$p['id'];
    $p['price']   = (float)$p['price'];
    $p['stock']   = (int)$p['stock'];
    $p['rating']  = (float)$p['rating'];
    $p['is_active'] = (bool)$p['is_active'];
}
unset($p);

echo json_encode(['success' => true, 'products' => $products]);
