<?php
header("Content-Type: application/json");
require_once '../../db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id']) || !isset($data['sellerEmail'])) {
    echo json_encode(['success' => false, 'message' => 'Missing product ID or seller email']);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ? AND seller_email = ?");
    $stmt->execute([$data['id'], $data['sellerEmail']]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Product not found or unauthorized']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>