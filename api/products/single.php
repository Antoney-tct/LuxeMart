<?php
header('Content-Type: application/json');
require_once '../../db.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Invalid ID.']);
    exit;
}

$stmt = $pdo->prepare("
    SELECT id, name, brand, price, old_price AS oldPrice,
           image_url AS img, category, stock, rating,
           review_count AS reviews, badge, on_sale AS onSale
    FROM products WHERE id = ? AND is_active = 1
");
$stmt->execute([$id]);
$product = $stmt->fetch();

if (!$product) {
    echo json_encode(['success' => false, 'message' => 'Product not found.']);
    exit;
}

$product['id']      = (int)$product['id'];
$product['price']   = (float)$product['price'];
$product['stock']   = (int)$product['stock'];
$product['inStock'] = $product['stock'] > 0;
$product['onSale']  = (bool)$product['onSale'];
$product['colors']  = [];
$product['sizes']   = [];

echo json_encode(['success' => true, 'product' => $product]);