<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$data       = json_decode(file_get_contents('php://input'), true);
$product_id = (int)($data['product_id'] ?? 0);
$user_id    = $_SESSION['user_id'];

if (!$product_id) {
    echo json_encode(['success' => false, 'message' => 'Invalid product.']);
    exit;
}

// Check if already in wishlist
$check = $pdo->prepare("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?");
$check->execute([$user_id, $product_id]);

if ($check->fetch()) {
    $pdo->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?")->execute([$user_id, $product_id]);
    echo json_encode(['success' => true, 'in_wishlist' => false]);
} else {
    $pdo->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)")->execute([$user_id, $product_id]);
    echo json_encode(['success' => true, 'in_wishlist' => true]);
}