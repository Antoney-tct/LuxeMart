<?php
/**
 * M-Pesa STK Push Callback
 * Safaricom calls this URL after the user completes or cancels the payment.
 * Must be publicly accessible over HTTPS.
 * Use ngrok for local testing: ngrok http 80
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

// Log everything (useful for debugging)
$logDir = __DIR__ . '/../../logs/';
if (!is_dir($logDir)) mkdir($logDir, 0755, true);
file_put_contents(
    $logDir . 'mpesa_' . date('Y-m-d') . '.log',
    date('[Y-m-d H:i:s] ') . $raw . PHP_EOL,
    FILE_APPEND
);

if (!isset($data['Body']['stkCallback'])) {
    // Acknowledge even on bad payload so Safaricom doesn't retry
    echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    exit;
}

$callback      = $data['Body']['stkCallback'];
$resultCode    = (int)$callback['ResultCode'];
$checkoutId    = $callback['CheckoutRequestID'];

if ($resultCode === 0) {
    // Payment successful — extract details
    $items      = $callback['CallbackMetadata']['Item'] ?? [];
    $receipt    = '';
    $amount     = 0;
    $phone      = '';
    $txDate     = '';

    foreach ($items as $item) {
        switch ($item['Name']) {
            case 'MpesaReceiptNumber': $receipt = $item['Value']; break;
            case 'Amount':            $amount  = $item['Value']; break;
            case 'PhoneNumber':       $phone   = $item['Value']; break;
            case 'TransactionDate':   $txDate  = $item['Value']; break;
        }
    }

    // Update order status and receipt
    $pdo->prepare("
        UPDATE orders
        SET status        = 'Processing',
            mpesa_receipt = ?
        WHERE checkout_request_id = ?
    ")->execute([$receipt, $checkoutId]);

} else {
    // Payment failed or cancelled
    $pdo->prepare("
        UPDATE orders
        SET status = 'Cancelled'
        WHERE checkout_request_id = ? AND status = 'Processing'
    ")->execute([$checkoutId]);
}

// Acknowledge to Safaricom
echo json_encode(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
