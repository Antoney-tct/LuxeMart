<?php
session_start();
header("Content-Type: application/json");
require_once '../../db.php';

// Session Check
if (!isset($_SESSION['user_email']) || $_SESSION['role'] !== 'seller') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing product ID']);
    exit;
}

try {
    // 1. Fetch the image path before deleting the record
    $stmtImg = $pdo->prepare("SELECT image_url FROM products WHERE id = ? AND seller_email = ?");
    $stmtImg->execute([$data['id'], $_SESSION['user_email']]);
    $product = $stmtImg->fetch();

    if ($product && !empty($product['image_url'])) {
        $fullPath = '../../' . $product['image_url'];
        if (file_exists($fullPath)) unlink($fullPath); // Delete the file from server
    }

    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ? AND seller_email = ?");
    $stmt->execute([$data['id'], $_SESSION['user_email']]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Product not found or unauthorized']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>