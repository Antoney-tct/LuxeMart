<?php
// ── delete.php ────────────────────────────────────────────────
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || !in_array($_SESSION['role'], ['seller','admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id   = (int)($data['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID required.']);
    exit;
}

// Ownership / existence check
$stmt = $pdo->prepare("SELECT seller_email, image_url FROM products WHERE id = ?");
$stmt->execute([$id]);
$p = $stmt->fetch();

if (!$p) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Product not found.']);
    exit;
}

if ($_SESSION['role'] !== 'admin' && $p['seller_email'] !== $_SESSION['user_email']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'You do not own this product.']);
    exit;
}

// Remove uploaded image
if ($p['image_url'] && strpos($p['image_url'], 'uploads/') === 0) {
    $path = __DIR__ . '/../../' . $p['image_url'];
    if (file_exists($path)) @unlink($path);
}

$pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$id]);

echo json_encode(['success' => true]);
