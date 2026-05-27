<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

$orderId = (int)($_GET['order_id'] ?? 0);

if (!$orderId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID required.']);
    exit;
}

$stmt = $pdo->prepare("SELECT status, mpesa_receipt FROM orders WHERE id = ?");
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Order not found.']);
    exit;
}

echo json_encode([
    'success' => true,
    'status'  => $order['status'],
    'receipt' => $order['mpesa_receipt'],
]);
