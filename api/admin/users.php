<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

$stmt = $pdo->query("SELECT id, name, email, picture, role, phone, created_at FROM users ORDER BY created_at DESC");
echo json_encode(['success' => true, 'users' => $stmt->fetchAll()]);