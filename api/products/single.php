<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

$id = (int)($_GET['id'] ?? 0);
if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID required.']);
    exit;
}

$stmt = $pdo->prepare("
    SELECT
        p.*,
        p.image_url      AS img,
        p.description    AS `desc`,
        p.original_price AS oldPrice,
        p.reviews_count  AS reviews,
        p.seller_email   AS sellerEmail,
        u.name           AS sellerName,
        u.picture        AS sellerPicture,
        u.phone          AS sellerPhone
    FROM products p
    LEFT JOIN users u ON u.email = p.seller_email
    WHERE p.id = ? AND p.is_active = 1
");

$stmt->execute([$id]);
$p = $stmt->fetch();

if (!$p) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Product not found.']);
    exit;
}

// Reviews
$revStmt = $pdo->prepare("
    SELECT user_name, rating, body, created_at
    FROM reviews
    WHERE product_id = ?
    ORDER BY created_at DESC
    LIMIT 20
");
$revStmt->execute([$id]);
$reviews = $revStmt->fetchAll();

// Normalise
$p['id']       = (int)$p['id'];
$p['price']    = (float)$p['price'];
$p['oldPrice'] = $p['oldPrice'] ? (float)$p['oldPrice'] : null;
$p['stock']    = (int)$p['stock'];
$p['rating']   = (float)$p['rating'];
$p['reviews']  = (int)$p['reviews'];
$p['inStock']  = $p['stock'] > 0;
$p['onSale']   = $p['oldPrice'] !== null;
$p['colors']   = $p['colors']  ? json_decode($p['colors'])  : [];
$p['sizes']    = $p['sizes']   ? json_decode($p['sizes'])   : [];
$p['reviewsList'] = $reviews;

unset($p['image_url'], $p['description'], $p['original_price'],
      $p['reviews_count'], $p['seller_email']);

echo json_encode(['success' => true, 'product' => $p]);
