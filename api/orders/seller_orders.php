<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || !in_array($_SESSION['role'], ['seller', 'admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Seller access required.']);
    exit;
}

$sellerEmail = $_SESSION['user_email'];

// Get orders that contain this seller's products
$stmt = $pdo->prepare("
    SELECT DISTINCT
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.total,
        o.status,
        o.payment_method,
        o.created_at,
        DATE_FORMAT(o.created_at, '%b %e, %Y') AS date
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    INNER JOIN products p     ON p.id = oi.product_id
    WHERE p.seller_email = ?
    ORDER BY o.created_at DESC
    LIMIT 100
");

$stmt->execute([$sellerEmail]);
$orders = $stmt->fetchAll();

// For each order, get only the items belonging to this seller
foreach ($orders as &$order) {
    $itemStmt = $pdo->prepare("
        SELECT oi.product_id, oi.product_name AS name, oi.product_img AS img,
               oi.unit_price AS price, oi.qty
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ? AND p.seller_email = ?
    ");
    $itemStmt->execute([$order['id'], $sellerEmail]);
    $order['items'] = $itemStmt->fetchAll();

    $order['id']    = (int)$order['id'];
    $order['total'] = (float)$order['total'];
}
unset($order);

echo json_encode(['success' => true, 'orders' => $orders]);
