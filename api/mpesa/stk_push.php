<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$data    = json_decode(file_get_contents('php://input'), true) ?? [];
$phone   = trim($data['phone']    ?? '');
$amount  = (int)ceil((float)($data['amount'] ?? 0));
$orderId = (int)($data['order_id'] ?? 0);

if (!$phone || !$amount || !$orderId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Phone, amount, and order_id are required.']);
    exit;
}

// ── NORMALISE PHONE ───────────────────────────────────────────
$phone = preg_replace('/\D/', '', $phone);
if (strlen($phone) === 9)  $phone = '254' . $phone;
if (strlen($phone) === 10) $phone = '254' . substr($phone, 1);

if (!preg_match('/^254[71]\d{8}$/', $phone)) {
    echo json_encode(['success' => false, 'message' => 'Invalid phone number format.']);
    exit;
}

// ── CREDENTIALS ───────────────────────────────────────────────
// Replace these with your actual Safaricom Daraja credentials.
// For sandbox testing, use the values below.
// For production: change the URLs to api.safaricom.co.ke

$consumerKey    = 'YOUR_CONSUMER_KEY';
$consumerSecret = 'YOUR_CONSUMER_SECRET';
$shortCode      = '174379';           // Sandbox paybill
$passkey        = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
$callbackUrl    = 'https://yourdomain.co.ke/api/mpesa/callback.php';
$isSandbox      = true;

$baseUrl = $isSandbox
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';

// ── GET ACCESS TOKEN ──────────────────────────────────────────
$authCurl = curl_init("$baseUrl/oauth/v1/generate?grant_type=client_credentials");
curl_setopt_array($authCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_USERPWD        => "$consumerKey:$consumerSecret",
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_SSL_VERIFYPEER => false,  // Remove in production
]);

$authResponse  = curl_exec($authCurl);
$authData      = json_decode($authResponse, true);
$accessToken   = $authData['access_token'] ?? null;
curl_close($authCurl);

if (!$accessToken) {
    error_log('M-Pesa auth failed: ' . $authResponse);
    echo json_encode(['ResponseCode' => '1', 'CustomerMessage' => 'Payment service unavailable. Try again later.']);
    exit;
}

// ── STK PUSH ──────────────────────────────────────────────────
$timestamp = date('YmdHis');
$password  = base64_encode($shortCode . $passkey . $timestamp);

$payload = [
    'BusinessShortCode' => $shortCode,
    'Password'          => $password,
    'Timestamp'         => $timestamp,
    'TransactionType'   => 'CustomerPayBillOnline',
    'Amount'            => $amount,
    'PartyA'            => $phone,
    'PartyB'            => $shortCode,
    'PhoneNumber'       => $phone,
    'CallBackURL'       => $callbackUrl,
    'AccountReference'  => 'LuxeMart',
    'TransactionDesc'   => 'LuxeMart Payment',
];

$stkCurl = curl_init("$baseUrl/mpesa/stkpush/v1/processrequest");
curl_setopt_array($stkCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        "Authorization: Bearer $accessToken",
    ],
    CURLOPT_SSL_VERIFYPEER => false,  // Remove in production
]);

$stkResponse = curl_exec($stkCurl);
$stkData     = json_decode($stkResponse, true);
curl_close($stkCurl);

// ── SAVE CHECKOUT REQUEST ID ──────────────────────────────────
if (!empty($stkData['CheckoutRequestID'])) {
    $pdo->prepare("
        UPDATE orders
        SET checkout_request_id = ?
        WHERE id = ?
    ")->execute([$stkData['CheckoutRequestID'], $orderId]);
}

// Return Safaricom's response to the frontend
echo $stkResponse;
