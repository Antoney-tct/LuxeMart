<?php
header("Content-Type: application/json");
require_once '../../db.php';

try {
    $stmt = $pdo->query("SELECT * FROM products ORDER BY created_at DESC");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Map database columns to the property names expected by your frontend JS
    foreach ($products as &$p) {
        $p['img'] = $p['image_url'];
        $p['desc'] = $p['description'];
        $p['price'] = (float)$p['price']; // Ensure price is a number for .toFixed() calls
    }
    unset($p);

    echo json_encode(['success' => true, 'products' => $products]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>