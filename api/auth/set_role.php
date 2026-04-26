<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$role = $data['role'] ?? '';

// Only allow buyer → seller upgrade here.
// Admin role can only be set server-side.
$allowed = ['buyer', 'seller'];
if (!in_array($role, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid role.']);
    exit;
}

// Prevent downgrading admin
$stmt = $pdo->prepare("SELECT role FROM users WHERE email = ?");
$stmt->execute([$_SESSION['user_email']]);
$current = $stmt->fetchColumn();

if ($current === 'admin') {
    echo json_encode(['success' => true, 'role' => 'admin']);
    exit;
}

$pdo->prepare("UPDATE users SET role = ? WHERE email = ?")
    ->execute([$role, $_SESSION['user_email']]);

$_SESSION['role'] = $role;

echo json_encode(['success' => true, 'role' => $role]);
