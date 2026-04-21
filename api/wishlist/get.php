<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    echo json_encode(['success' => true, 'wishlist' => [], 'count' => 0]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT p.id, p.name, p.price, p.image_url AS img, p.brand
    FROM wishlist w
    JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ?
");
$stmt->execute([$_SESSION['user_id']]);
$wishlist = $stmt->fetchAll();

echo json_encode([
    'success'  => true,
    'wishlist' => $wishlist,
    'count'    => count($wishlist),
]);