<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false]);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$userId = (int)($data['user_id'] ?? 0);
$role   = $data['role'] ?? '';

if (!$userId || !in_array($role, ['buyer', 'seller', 'admin'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid data.']);
    exit;
}

$pdo->prepare("UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?")
    ->execute([$role, $userId]);

echo json_encode(['success' => true]);