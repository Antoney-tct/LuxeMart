<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$data      = json_decode(file_get_contents('php://input'), true);
$id        = (int)($data['id']        ?? 0);
$isActive  = (int)($data['is_active'] ?? 0);
$userId    = $_SESSION['user_id'];
$role      = $_SESSION['role'] ?? 'buyer';

$check = $role === 'admin'
    ? $pdo->prepare("SELECT id FROM products WHERE id = ?")
    : $pdo->prepare("SELECT id FROM products WHERE id = ? AND seller_id = ?");

$check->execute($role === 'admin' ? [$id] : [$id, $userId]);

if (!$check->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Product not found or access denied.']);
    exit;
}

$pdo->prepare("UPDATE products SET is_active = ?, updated_at = NOW() WHERE id = ?")
    ->execute([$isActive, $id]);

echo json_encode(['success' => true]);