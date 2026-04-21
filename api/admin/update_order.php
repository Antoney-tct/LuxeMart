<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false]);
    exit;
}

$data     = json_decode(file_get_contents('php://input'), true);
$orderId  = (int)($data['order_id'] ?? 0);
$status   = $data['status'] ?? '';
$allowed  = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

if (!$orderId || !in_array($status, $allowed)) {
    echo json_encode(['success' => false, 'message' => 'Invalid data.']);
    exit;
}

// Restore stock if cancelling
if ($status === 'Cancelled') {
    $items = $pdo->prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?");
    $items->execute([$orderId]);
    foreach ($items->fetchAll() as $item) {
        $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?")
            ->execute([$item['qty'], $item['product_id']]);
    }
}

$pdo->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?")
    ->execute([$status, $orderId]);

echo json_encode(['success' => true]);