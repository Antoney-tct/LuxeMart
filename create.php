<?php
header("Content-Type: application/json");
require_once '../db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Insert Order
    $stmt = $pdo->prepare("INSERT INTO orders (order_number, customer_name, customer_email, address, city, zip, total, payment_method) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $data['id'],
        $data['customer']['name'],
        $data['customer']['email'],
        $data['customer']['address'],
        $data['customer']['city'],
        $data['customer']['zip'],
        $data['total'],
        $data['paymentMethod']
    ]);

    $orderId = $pdo->lastInsertId();

    // 2. Insert Items
    $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
    foreach ($data['items'] as $item) {
        $stmtItem->execute([$orderId, $item['id'], $item['qty'], $item['price']]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'order_db_id' => $orderId]);
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}