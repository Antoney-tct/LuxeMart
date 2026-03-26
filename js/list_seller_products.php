<?php
header("Content-Type: application/json");
require_once '../../db.php';

$email = $_GET['email'] ?? '';

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Seller email is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM products WHERE seller_email = ? ORDER BY created_at DESC");
    $stmt->execute([$email]);
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'products' => $products]);
} catch (Exception $e) {
    error_log("Error fetching seller products: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while fetching products']);
}
?>