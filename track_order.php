<?php
header("Content-Type: application/json");
require_once '../../db.php'; // Adjust path as necessary, assuming this file is in /api/

$orderNumber = $_GET['order_number'] ?? '';

if (empty($orderNumber)) {
    echo json_encode(['success' => false, 'message' => 'Order number is required.']);
    exit;
}

try {
    // Fetch order details from the 'orders' table
    $stmt = $pdo->prepare("SELECT id, order_number, customer_name, customer_email, address, city, zip, total, payment_method, status, created_at FROM orders WHERE order_number = ?");
    $stmt->execute([$orderNumber]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        echo json_encode(['success' => false, 'message' => 'Order not found. Please check the order number.']);
        exit;
    }

    // Fetch order items from the 'order_items' table
    $stmtItems = $pdo->prepare("SELECT product_id, quantity, price FROM order_items WHERE order_id = ?");
    $stmtItems->execute([$order['id']]);
    $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    // For each item, fetch the product name from a 'products' table for better display
    // This assumes a 'products' table exists with 'id' and 'name' columns.
    // If not, you might just display product_id or adjust this logic.
    foreach ($items as &$item) { // Use reference to modify array elements directly
        $stmtProductName = $pdo->prepare("SELECT name FROM products WHERE id = ?");
        $stmtProductName->execute([$item['product_id']]);
        $product = $stmtProductName->fetch(PDO::FETCH_ASSOC);
        $item['product_name'] = htmlspecialchars($product['name'] ?? 'Unknown Product', ENT_QUOTES, 'UTF-8');
    }
    unset($item); // Break the reference with the last element to prevent unexpected behavior

    $order['items'] = $items;

    echo json_encode(['success' => true, 'order' => $order]);

} catch (PDOException $e) {
    // Log the database error for debugging purposes (e.g., to a file or system log)
    error_log("Database error in track_order.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'A database error occurred. Please try again later.']);
} catch (Exception $e) {
    // Log any other unexpected errors
    error_log("General error in track_order.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An unexpected error occurred.']);
}
?>