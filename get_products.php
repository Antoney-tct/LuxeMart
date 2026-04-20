<?php
// Enable error reporting for debugging "blank" responses
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
require_once 'db.php';

try {
    $stmt = $pdo->query("SELECT * FROM products ORDER BY created_at DESC");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Map database columns to the property names expected by your frontend JS
    foreach ($products as &$p) {
        $p['img'] = $p['image_url'];
        $p['desc'] = $p['description'];
        // Ensure numeric types for JS calculations
        $p['price'] = (float)$p['price']; // Ensure price is a number for .toFixed() calls
        $p['rating'] = isset($p['rating']) ? (float)$p['rating'] : 5.0;
        $p['reviews'] = isset($p['reviews']) ? (int)$p['reviews'] : 0;
        // Handle variants safely
        $p['colors'] = !empty($p['colors']) ? json_decode($p['colors']) : [];
        $p['sizes'] = !empty($p['sizes']) ? json_decode($p['sizes']) : [];
    }
    unset($p);

    echo json_encode(['success' => true, 'products' => $products]);
} catch (Throwable $e) {
    // Catching Throwable handles both Exceptions and Fatal Errors (like missing PDO)
    // We don't set 500 here so the browser can actually read the JSON error message
    echo json_encode(['success' => false, 'message' => 'PHP Error: ' . $e->getMessage()]);
}
?>