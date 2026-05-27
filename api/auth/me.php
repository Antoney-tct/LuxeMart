<?php
session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email'])) {
    echo json_encode(['success' => false, 'user' => null]);
    exit;
}

$stmt = $pdo->prepare("SELECT name, email, picture, role FROM users WHERE email = ?");
$stmt->execute([$_SESSION['user_email']]);
$user = $stmt->fetch();

if (!$user) {
    // Session is stale
    session_destroy();
    echo json_encode(['success' => false, 'user' => null]);
    exit;
}

echo json_encode(['success' => true, 'user' => $user]);
