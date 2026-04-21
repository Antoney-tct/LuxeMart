<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$data    = json_decode(file_get_contents('php://input'), true);
$orderId = (int)($data['order_id'] ?? 0);

if (!$orderId) {
    echo json_encode(['success' => false, 'message' => 'Invalid order ID.']);
    exit;
}

// Only allow cancelling own orders that are still Processing
$stmt = $pdo->prepare("
    SELECT id, status FROM orders
    WHERE id = ? AND user_id = ?
");
$stmt->execute([$orderId, $_SESSION['user_id']]);
$order = $stmt->fetch();

if (!$order) {
    echo json_encode(['success' => false, 'message' => 'Order not found.']);
    exit;
}

if ($order['status'] !== 'Processing') {
    echo json_encode([
        'success' => false,
        'message' => "Cannot cancel an order that is already {$order['status']}.",
    ]);
    exit;
}

// Restore stock for each item
$items = $pdo->prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?");
$items->execute([$orderId]);
foreach ($items->fetchAll() as $item) {
    $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?")
        ->execute([$item['qty'], $item['product_id']]);
}

// Update status
$pdo->prepare("UPDATE orders SET status = 'Cancelled', updated_at = NOW() WHERE id = ?")
    ->execute([$orderId]);

echo json_encode(['success' => true]);