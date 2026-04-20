<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

$data = json_decode(file_get_contents('php://input'), true);
$code = strtoupper(trim($data['code'] ?? ''));
$orderTotal = (float)($data['order_total'] ?? 0);

if (!$code) {
    echo json_encode(['success' => false, 'message' => 'No code provided.']);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM discount_codes WHERE code = ? AND is_active = 1");
$stmt->execute([$code]);
$discount = $stmt->fetch();

if (!$discount) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired discount code.']);
    exit;
}

if ($orderTotal < $discount['min_order']) {
    echo json_encode([
        'success' => false,
        'message' => "Minimum order of KSh " . number_format($discount['min_order'], 2) . " required."
    ]);
    exit;
}

$amount = $discount['discount_type'] === 'percent'
    ? round($orderTotal * ($discount['discount_value'] / 100), 2)
    : min($discount['discount_value'], $orderTotal);

echo json_encode([
    'success'        => true,
    'discount_type'  => $discount['discount_type'],
    'discount_value' => $discount['discount_value'],
    'amount_off'     => $amount,
    'new_total'      => round($orderTotal - $amount, 2),
]);