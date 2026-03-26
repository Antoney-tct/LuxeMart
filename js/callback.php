<?php
/**
 * This endpoint is called by Safaricom asynchronously after the user enters their PIN.
 * NOTE: To test this locally on XAMPP, use a tool like Ngrok to expose your localhost.
 */
header("Content-Type: application/json");
require_once '../api/db.php';

$stkCallbackResponse = file_get_contents('php://input');
$logFile = "mpesa_responses.log";
$log = fopen($logFile, "a");
fwrite($log, "[" . date('Y-m-d H:i:s') . "] " . $stkCallbackResponse . PHP_EOL);
fclose($log);

$data = json_decode($stkCallbackResponse, true);
if (isset($data['Body']['stkCallback'])) {
    $resultCode = $data['Body']['stkCallback']['ResultCode'];
    $checkoutID = $data['Body']['stkCallback']['CheckoutRequestID'];
    
    $status = ($resultCode == 0) ? 'Paid' : 'Failed';
    
    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE checkout_request_id = ?");
    $stmt->execute([$status, $checkoutID]);
}

// Safaricom expects a success response
echo json_encode(["ResultCode" => 0, "ResultDesc" => "Success"]);