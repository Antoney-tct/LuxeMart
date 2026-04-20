<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$stmt = $pdo->prepare("
    SELECT
        o.id, o.order_number, o.total, o.status,
        o.payment_method, o.created_at, o.discount_amount,
        o.customer_name, o.customer_email, o.address, o.city
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
");
$stmt->execute([$_SESSION['user_id']]);
$orders = $stmt->fetchAll();

foreach ($orders as &$order) {
    $items = $pdo->prepare("
        SELECT product_id, product_name, price, qty, image_url
        FROM order_items
        WHERE order_id = ?
    ");
    $items->execute([$order['id']]);
    $order['items'] = $items->fetchAll();
}

echo json_encode(['success' => true, 'orders' => $orders]);