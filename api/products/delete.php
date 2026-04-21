<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$id     = (int)($data['id'] ?? 0);
$userId = $_SESSION['user_id'];
$role   = $_SESSION['role'] ?? 'buyer';

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Invalid product ID.']);
    exit;
}

// Verify ownership
$check = $role === 'admin'
    ? $pdo->prepare("SELECT id, image_url FROM products WHERE id = ?")
    : $pdo->prepare("SELECT id, image_url FROM products WHERE id = ? AND seller_id = ?");

$check->execute($role === 'admin' ? [$id] : [$id, $userId]);
$product = $check->fetch();

if (!$product) {
    echo json_encode(['success' => false, 'message' => 'Product not found or access denied.']);
    exit;
}

// Delete uploaded image file if it exists
if (!empty($product['image_url']) && str_starts_with($product['image_url'], 'uploads/')) {
    $path = __DIR__ . '/../../' . $product['image_url'];
    if (file_exists($path)) unlink($path);
}

$pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$id]);

echo json_encode(['success' => true]);