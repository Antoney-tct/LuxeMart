<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

$email = $_SESSION['user_email'] ?? null;

// ── GET ───────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$email) {
        echo json_encode(['success' => true, 'wishlist' => []]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.name,
            p.brand,
            p.price,
            p.original_price AS oldPrice,
            p.image_url      AS img,
            p.rating,
            p.reviews_count  AS reviews,
            p.stock,
            p.badge
        FROM wishlist w
        JOIN products p ON p.id = w.product_id
        WHERE w.user_email = ? AND p.is_active = 1
        ORDER BY w.added_at DESC
    ");
    $stmt->execute([$email]);
    $items = $stmt->fetchAll();

    foreach ($items as &$i) {
        $i['id']      = (int)$i['id'];
        $i['price']   = (float)$i['price'];
        $i['oldPrice'] = $i['oldPrice'] ? (float)$i['oldPrice'] : null;
        $i['stock']   = (int)$i['stock'];
        $i['rating']  = (float)$i['rating'];
        $i['reviews'] = (int)$i['reviews'];
    }
    unset($i);

    echo json_encode(['success' => true, 'wishlist' => $items]);
    exit;
}

// ── POST (toggle) ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

if (!$email) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Login required.']);
    exit;
}

$data      = json_decode(file_get_contents('php://input'), true) ?? [];
$productId = (int)($data['product_id'] ?? 0);

if (!$productId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID required.']);
    exit;
}

// Check if already wishlisted
$check = $pdo->prepare("SELECT id FROM wishlist WHERE user_email = ? AND product_id = ?");
$check->execute([$email, $productId]);

if ($check->fetch()) {
    $pdo->prepare("DELETE FROM wishlist WHERE user_email = ? AND product_id = ?")
        ->execute([$email, $productId]);
    echo json_encode(['success' => true, 'action' => 'removed']);
} else {
    $pdo->prepare("INSERT IGNORE INTO wishlist (user_email, product_id) VALUES (?, ?)")
        ->execute([$email, $productId]);
    echo json_encode(['success' => true, 'action' => 'added']);
}
