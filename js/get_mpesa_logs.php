<?php
header("Content-Type: application/json");
require_once '../db.php';

// Fetch orders from the database instead of the text log
$stmt = $pdo->query("SELECT created_at as timestamp, order_number as receipt, customer_name as phone, total as amount, status as resultDesc, checkout_request_id as checkoutID FROM orders ORDER BY created_at DESC");
$transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($transactions);
?>