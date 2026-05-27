<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

$status = $_GET['status'] ?? 'all';
$search = trim($_GET['search'] ?? '');
$page   = max(1, (int)($_GET['page'] ?? 1));
$limit  = 50;
$offset = ($page - 1) * $limit;

$where  = [];
$params = [];

if ($status !== 'all') {
    $where[]    = 'o.status = :status';
    $params[':status'] = $status;
}

if ($search) {
    $like = '%' . $search . '%';
    $where[]           = '(o.order_number LIKE :s1 OR o.customer_name LIKE :s2 OR o.customer_email LIKE :s3)';
    $params[':s1']     = $like;
    $params[':s2']     = $like;
    $params[':s3']     = $like;
}

$whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Total count
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM orders o $whereSQL");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// Orders
$stmt = $pdo->prepare("
    SELECT
        o.id, o.order_number, o.customer_name, o.customer_email,
        o.customer_phone, o.address, o.city, o.payment_method,
        o.total, o.status, o.created_at,
        DATE_FORMAT(o.created_at, '%b %e, %Y') AS date,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'name',  oi.product_name,
                    'img',   oi.product_img,
                    'price', oi.unit_price,
                    'qty',   oi.qty
                )
            )
            FROM order_items oi WHERE oi.order_id = o.id
        ) AS items_json
    FROM orders o
    $whereSQL
    ORDER BY o.created_at DESC
    LIMIT :limit OFFSET :offset
");

foreach ($params as $k => $v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$orders = $stmt->fetchAll();

foreach ($orders as &$o) {
    $o['id']    = (int)$o['id'];
    $o['total'] = (float)$o['total'];
    $o['items'] = json_decode($o['items_json'] ?? '[]', true) ?: [];
    unset($o['items_json']);
}
unset($o);

echo json_encode([
    'success' => true,
    'orders'  => $orders,
    'total'   => $total,
]);
