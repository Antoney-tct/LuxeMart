<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];

// ── VALIDATE ──────────────────────────────────────────────────
$required = ['customer', 'items', 'total', 'paymentMethod'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing: $field"]);
        exit;
    }
}

$c       = $data['customer'];
$items   = $data['items'];
$total   = (float)$data['total'];
$method  = $data['paymentMethod'];
$ship    = $data['shipping_method'] ?? 'standard';
$discount = (float)($data['discount_amount'] ?? 0);
$notes   = trim($data['notes'] ?? '');
$shipping = ($ship === 'express') ? 650 : 0;

if (empty($c['name']) || empty($c['email']) || empty($c['address']) || empty($c['city'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Incomplete customer details.']);
    exit;
}

if (empty($items) || !is_array($items)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Order must have at least one item.']);
    exit;
}

// ── STOCK CHECK + FETCH PRODUCT DETAILS ──────────────────────
$productDetails = [];
foreach ($items as $item) {
    $pid = (int)($item['id'] ?? 0);
    $qty = (int)($item['qty'] ?? 1);

    $stmt = $pdo->prepare("SELECT id, name, image_url, price, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE");
    $stmt->execute([$pid]);
    $p = $stmt->fetch();

    if (!$p) {
        echo json_encode(['success' => false, 'message' => "Product #$pid not found or unavailable."]);
        exit;
    }

    if ($p['stock'] < $qty) {
        echo json_encode(['success' => false, 'message' => "Insufficient stock for: {$p['name']}"]);
        exit;
    }

    $productDetails[$pid] = ['product' => $p, 'qty' => $qty];
}

// ── TRANSACTION ───────────────────────────────────────────────
try {
    $pdo->beginTransaction();

    // Generate unique order number
    $orderNumber = 'LUX-' . strtoupper(substr(uniqid(), -6)) . '-' . date('Ymd');

    // Calculate subtotal from actual product prices (don't trust client)
    $subtotal = array_reduce($productDetails, function ($carry, $item) {
        return $carry + ($item['product']['price'] * $item['qty']);
    }, 0.0);

    $verifiedTotal = round($subtotal - $discount + $shipping, 2);

    $pdo->prepare("
        INSERT INTO orders
            (order_number, user_email, customer_name, customer_email, customer_phone,
             address, city, zip, country, shipping_method, payment_method,
             subtotal, discount_amount, shipping_cost, total, notes)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([
        $orderNumber,
        $_SESSION['user_email'] ?? null,
        $c['name'],
        $c['email'],
        $c['phone'] ?? null,
        $c['address'],
        $c['city'],
        $c['zip'] ?? '',
        $c['country'] ?? 'Kenya',
        $ship,
        $method,
        $subtotal,
        $discount,
        $shipping,
        $verifiedTotal,
        $notes,
    ]);

    $orderId = (int)$pdo->lastInsertId();

    // Insert order items + decrement stock
    $itemStmt = $pdo->prepare("
        INSERT INTO order_items (order_id, product_id, product_name, product_img, unit_price, qty)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    $stockStmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

    foreach ($productDetails as $pid => $entry) {
        $p   = $entry['product'];
        $qty = $entry['qty'];

        $itemStmt->execute([$orderId, $pid, $p['name'], $p['image_url'], $p['price'], $qty]);
        $stockStmt->execute([$qty, $pid]);
    }

    // Clear server cart for logged-in users
    if (!empty($_SESSION['user_email'])) {
        $pdo->prepare("DELETE FROM cart_items WHERE user_email = ?")
            ->execute([$_SESSION['user_email']]);
    }

    $pdo->commit();

    echo json_encode([
        'success'      => true,
        'order_number' => $orderNumber,
        'order_db_id'  => $orderId,
        'total'        => $verifiedTotal,
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log('Order create error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Order could not be placed. Please try again.']);
}
