<?php
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

// Ownership
$stmt = $pdo->prepare("SELECT seller_email, is_active FROM products WHERE id = ?");
$stmt->execute([$id]);
$p = $stmt->fetch();

if (!$p || ($_SESSION['role'] !== 'admin' && $p['seller_email'] !== $_SESSION['user_email'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Not found or unauthorized.']);
    exit;
}

$newState = $p['is_active'] ? 0 : 1;
$pdo->prepare("UPDATE products SET is_active = ? WHERE id = ?")->execute([$newState, $id]);

echo json_encode(['success' => true, 'is_active' => (bool)$newState]);
