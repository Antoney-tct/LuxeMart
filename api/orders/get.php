<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Login required.']);
    exit;
}

$email = $_SESSION['user_email'];

// Admin can view all orders or filter by user
if ($_SESSION['role'] === 'admin') {
    $filterEmail = $_GET['email'] ?? null;
    $whereClause = $filterEmail ? 'WHERE o.user_email = ?' : '';
    $params      = $filterEmail ? [$filterEmail] : [];
} else {
    $whereClause = 'WHERE o.user_email = ?';
    $params      = [$email];
}

$stmt = $pdo->prepare("
    SELECT
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.address, o.city, o.zip, o.country,
        o.shipping_method,
        o.payment_method,
        o.subtotal,
        o.discount_amount,
        o.shipping_cost,
        o.total,
        o.status,
        o.notes,
        o.created_at,
        o.updated_at
    FROM orders o
    $whereClause
    ORDER BY o.created_at DESC
");

$stmt->execute($params);
$orders = $stmt->fetchAll();

if (empty($orders)) {
    echo json_encode(['success' => true, 'orders' => []]);
    exit;
}

// Fetch items for all orders in one query
$orderIds    = array_column($orders, 'id');
$placeholders = implode(',', array_fill(0, count($orderIds), '?'));

$itemStmt = $pdo->prepare("
    SELECT
        oi.order_id,
        oi.product_id,
        oi.product_name AS name,
        oi.product_img  AS img,
        oi.unit_price   AS price,
        oi.qty
    FROM order_items oi
    WHERE oi.order_id IN ($placeholders)
");
$itemStmt->execute($orderIds);
$allItems = $itemStmt->fetchAll();

// Group items by order
$itemsByOrder = [];
foreach ($allItems as $item) {
    $oid = $item['order_id'];
    unset($item['order_id']);
    $item['product_id'] = (int)$item['product_id'];
    $item['price']      = (float)$item['price'];
    $item['qty']        = (int)$item['qty'];
    $itemsByOrder[$oid][] = $item;
}

// Merge
foreach ($orders as &$order) {
    $order['id']              = (int)$order['id'];
    $order['total']           = (float)$order['total'];
    $order['subtotal']        = (float)$order['subtotal'];
    $order['discount_amount'] = (float)$order['discount_amount'];
    $order['shipping_cost']   = (float)$order['shipping_cost'];
    $order['items']           = $itemsByOrder[$order['id']] ?? [];
    // Friendly date
    $order['date'] = date('M j, Y', strtotime($order['created_at']));
}
unset($order);

echo json_encode(['success' => true, 'orders' => $orders]);
