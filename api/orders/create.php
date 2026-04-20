<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$data       = json_decode(file_get_contents('php://input'), true);
$action     = $data['action']     ?? '';   // 'add' | 'remove' | 'set'
$product_id = (int)($data['product_id'] ?? 0);
$qty        = (int)($data['qty']        ?? 1);
$user_id    = $_SESSION['user_id'];

if (!$product_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid product.']);
    exit;
}

try {
    switch ($action) {
        case 'add':
            $pdo->prepare("
                INSERT INTO cart_items (user_id, product_id, qty)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty), updated_at = CURRENT_TIMESTAMP
            ")->execute([$user_id, $product_id, $qty]);
            break;

        case 'set':
            if ($qty <= 0) {
                $pdo->prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?")->execute([$user_id, $product_id]);
            } else {
                $pdo->prepare("
                    INSERT INTO cart_items (user_id, product_id, qty)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE qty = VALUES(qty), updated_at = CURRENT_TIMESTAMP
                ")->execute([$user_id, $product_id, $qty]);
            }
            break;

        case 'remove':
            $pdo->prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?")->execute([$user_id, $product_id]);
            break;

        case 'clear':
            $pdo->prepare("DELETE FROM cart_items WHERE user_id = ?")->execute([$user_id]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Unknown action.']);
            exit;
    }

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Cart update failed.']);
}