<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => true, 'cart' => []]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT
        ci.id AS cart_item_id,
        ci.qty,
        p.id AS product_id,
        p.name,
        p.brand,
        p.price,
        p.old_price,
        p.image_url AS img,
        p.stock,
        p.category
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ? AND p.is_active = 1
    ORDER BY ci.created_at DESC
");
$stmt->execute([$_SESSION['user_id']]);

echo json_encode(['success' => true, 'cart' => $stmt->fetchAll()]);