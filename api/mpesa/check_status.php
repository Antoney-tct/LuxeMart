<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

$orderId = (int)($_GET['order_id'] ?? 0);
if (!$orderId) {
    echo json_encode(['status' => 'Unknown']);
    exit;
}

$stmt = $pdo->prepare("SELECT status FROM orders WHERE id = ?");
$stmt->execute([$orderId]);
$order = $stmt->fetch();

echo json_encode([
    'status' => $order['status'] ?? 'Unknown',
]);