<?php
header("Content-Type: application/json");
require_once '../db.php';

// 1. MPESA CREDENTIALS (Safaricom Sandbox)
// Register at developer.safaricom.co.ke to get your own keys
$consumerKey = 'YOUR_CONSUMER_KEY'; 
$consumerSecret = 'YOUR_CONSUMER_SECRET';
$BusinessShortCode = '174379'; // Standard Sandbox Paybill
$Passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
$callbackUrl = 'https://your-public-domain.com/api/mpesa/callback.php'; // MUST be HTTPS and public

// 2. GET REQUEST DATA FROM FRONTEND
$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['phone']) || !isset($data['amount']) || !isset($data['order_id'])) {
    echo json_encode(['ResponseCode' => '1', 'CustomerMessage' => 'Invalid request data']);
    exit;
}

$order_id = $data['order_id'];
$phone = $data['phone'];
$amount = round($data['amount']); 

// Normalize phone to 254 format (Daraja requirement)
$phone = preg_replace('/^0/', '254', trim($phone));
if (strlen($phone) === 9) $phone = '254' . $phone;

// 3. GENERATE OAUTH ACCESS TOKEN
$headers = ['Content-Type:application/json; charset=utf8'];
$auth_url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

$curl = curl_init($auth_url);
curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
curl_setopt($curl, CURLOPT_HEADER, FALSE);
curl_setopt($curl, CURLOPT_USERPWD, $consumerKey . ':' . $consumerSecret);
$result = curl_exec($curl);
$token_data = json_decode($result);
$access_token = $token_data->access_token ?? null;
curl_close($curl);

if (!$access_token) {
    echo json_encode(['ResponseCode' => '1', 'CustomerMessage' => 'Failed to generate access token']);
    exit;
}

// 4. INITIATE STK PUSH
$Timestamp = date('YmdHis');
$Password = base64_encode($BusinessShortCode . $Passkey . $Timestamp);
$stk_url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

$curl_post_data = [
    'BusinessShortCode' => $BusinessShortCode, 'Password' => $Password, 'Timestamp' => $Timestamp,
    'TransactionType' => 'CustomerPayBillOnline', 'Amount' => $amount, 'PartyA' => $phone,
    'PartyB' => $BusinessShortCode, 'PhoneNumber' => $phone, 'CallBackURL' => $callbackUrl,
    'AccountReference' => 'LuxeMart', 'TransactionDesc' => 'LuxeMart Payment'
];

$curl = curl_init($stk_url);
curl_setopt($curl, CURLOPT_HTTPHEADER, ['Content-Type:application/json', 'Authorization:Bearer ' . $access_token]);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($curl_post_data));
$response = curl_exec($curl);

$resData = json_decode($response, true);
if (isset($resData['CheckoutRequestID'])) {
    // Update order with CheckoutRequestID to track it later
    $stmt = $pdo->prepare("UPDATE orders SET checkout_request_id = ? WHERE id = ?");
    $stmt->execute([$resData['CheckoutRequestID'], $order_id]);
}

echo $response;