<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$data    = json_decode(file_get_contents('php://input'), true) ?? [];
$orderId = (int)($data['order_id'] ?? 0);
$status  = $data['status'] ?? '';

$allowed = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
if (!$orderId || !in_array($status, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid order ID and status required.']);
    exit;
}

// If cancelling, restore stock
if ($status === 'Cancelled') {
    $currentStmt = $pdo->prepare("SELECT status FROM orders WHERE id = ?");
    $currentStmt->execute([$orderId]);
    $current = $currentStmt->fetchColumn();

    if ($current !== 'Cancelled') {
        $items = $pdo->prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?");
        $items->execute([$orderId]);
        $restoreStmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
        foreach ($items->fetchAll() as $item) {
            $restoreStmt->execute([$item['qty'], $item['product_id']]);
        }
    }
}

$pdo->prepare("UPDATE orders SET status = ? WHERE id = ?")->execute([$status, $orderId]);

echo json_encode(['success' => true]);
