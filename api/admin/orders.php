<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

$stmt = $pdo->query("
    SELECT
        o.*,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'product_name', oi.product_name,
                'price',        oi.price,
                'qty',          oi.qty,
                'image_url',    oi.image_url
            )
        ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
");

$orders = $stmt->fetchAll();

foreach ($orders as &$o) {
    $o['items'] = json_decode($o['items'], true) ?? [];
    $o['total'] = (float)$o['total'];
}

echo json_encode(['success' => true, 'orders' => $orders]);