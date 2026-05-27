<?php
// cancel.php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Login required.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$data    = json_decode(file_get_contents('php://input'), true) ?? [];
$orderId = (int)($data['order_id'] ?? 0);

if (!$orderId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order ID required.']);
    exit;
}

// Fetch order
$stmt = $pdo->prepare("SELECT id, user_email, status FROM orders WHERE id = ?");
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Order not found.']);
    exit;
}

// Ownership (admin can cancel any order)
if ($_SESSION['role'] !== 'admin' && $order['user_email'] !== $_SESSION['user_email']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

if ($order['status'] !== 'Processing') {
    echo json_encode(['success' => false, 'message' => 'Only Processing orders can be cancelled.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Restore stock
    $items = $pdo->prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?");
    $items->execute([$orderId]);
    $orderItems = $items->fetchAll();

    $restoreStmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
    foreach ($orderItems as $item) {
        $restoreStmt->execute([$item['qty'], $item['product_id']]);
    }

    // Update order status
    $pdo->prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ?")
        ->execute([$orderId]);

    $pdo->commit();

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not cancel order.']);
}
