<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

$data   = json_decode(file_get_contents('php://input'), true);
$phone  = trim($data['phone']  ?? '');
$amount = (int)($data['amount'] ?? 0);
$orderId= (int)($data['order_id'] ?? 0);

if (!$phone || !$amount || !$orderId) {
    echo json_encode(['ResponseCode' => '1', 'CustomerMessage' => 'Missing required fields.']);
    exit;
}

// Normalize phone to 254 format
$phone = preg_replace('/^0/', '254', $phone);
if (strlen($phone) === 9) $phone = '254' . $phone;

// ── YOUR SAFARICOM CREDENTIALS ─────────────────────────────
$consumerKey    = 'YOUR_CONSUMER_KEY';
$consumerSecret = 'YOUR_CONSUMER_SECRET';
$shortcode      = '174379';
$passkey        = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
$callbackUrl    = 'https://your-domain.com/api/mpesa/callback.php';

// Get access token
$ch = curl_init('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_USERPWD        => "$consumerKey:$consumerSecret",
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
]);
$tokenData   = json_decode(curl_exec($ch), true);
$accessToken = $tokenData['access_token'] ?? null;
curl_close($ch);

if (!$accessToken) {
    echo json_encode(['ResponseCode' => '1', 'CustomerMessage' => 'Failed to get access token.']);
    exit;
}

$timestamp = date('YmdHis');
$password  = base64_encode($shortcode . $passkey . $timestamp);

$payload = [
    'BusinessShortCode' => $shortcode,
    'Password'          => $password,
    'Timestamp'         => $timestamp,
    'TransactionType'   => 'CustomerPayBillOnline',
    'Amount'            => $amount,
    'PartyA'            => $phone,
    'PartyB'            => $shortcode,
    'PhoneNumber'       => $phone,
    'CallBackURL'       => $callbackUrl,
    'AccountReference'  => 'LuxeMart',
    'TransactionDesc'   => 'LuxeMart Order Payment',
];

$ch = curl_init('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        "Authorization: Bearer $accessToken",
    ],
]);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);

// Save checkout request ID so callback can match it
if (isset($result['CheckoutRequestID'])) {
    $pdo->prepare("UPDATE orders SET checkout_request_id = ? WHERE id = ?")
        ->execute([$result['CheckoutRequestID'], $orderId]);
}

echo $response;