<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$data        = json_decode(file_get_contents('php://input'), true) ?? [];
$code        = strtoupper(trim($data['code'] ?? ''));
$orderTotal  = (float)($data['order_total'] ?? 0);

if (!$code) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Discount code is required.']);
    exit;
}

$stmt = $pdo->prepare("
    SELECT * FROM discount_codes
    WHERE code = ? AND is_active = 1
");
$stmt->execute([$code]);
$discount = $stmt->fetch();

if (!$discount) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired discount code.']);
    exit;
}

// Expiry check
if ($discount['expires_at'] && strtotime($discount['expires_at']) < time()) {
    echo json_encode(['success' => false, 'message' => 'This discount code has expired.']);
    exit;
}

// Usage limit check
if ($discount['max_uses'] !== null && $discount['used_count'] >= $discount['max_uses']) {
    echo json_encode(['success' => false, 'message' => 'This discount code has reached its usage limit.']);
    exit;
}

// Minimum order check
if ($orderTotal < (float)$discount['min_order']) {
    $min = number_format($discount['min_order'], 2);
    echo json_encode(['success' => false, 'message' => "Minimum order of KSh $min required for this code."]);
    exit;
}

// Calculate discount amount
if ($discount['type'] === 'percent') {
    $amountOff = round($orderTotal * ($discount['value'] / 100), 2);
} else {
    $amountOff = min((float)$discount['value'], $orderTotal);
}

$newTotal = max(0, round($orderTotal - $amountOff, 2));

// Increment used_count
$pdo->prepare("UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?")
    ->execute([$discount['id']]);

echo json_encode([
    'success'    => true,
    'code'       => $code,
    'type'       => $discount['type'],
    'value'      => (float)$discount['value'],
    'amount_off' => $amountOff,
    'new_total'  => $newTotal,
]);
