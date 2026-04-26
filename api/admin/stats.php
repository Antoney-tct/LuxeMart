<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

// ── OVERVIEW STATS ────────────────────────────────────────────
$stats = [];

// Revenue (all time, non-cancelled)
$rev = $pdo->query("SELECT SUM(total) FROM orders WHERE status != 'Cancelled'")->fetchColumn();
$stats['total_revenue'] = (float)($rev ?? 0);

// Orders by status
$orderCounts = $pdo->query("
    SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status
")->fetchAll();

$stats['orders'] = ['total' => 0, 'processing' => 0, 'shipped' => 0, 'delivered' => 0, 'cancelled' => 0];
foreach ($orderCounts as $row) {
    $key = strtolower($row['status']);
    $stats['orders'][$key] = (int)$row['cnt'];
    $stats['orders']['total'] += (int)$row['cnt'];
}

// Products
$stats['total_products'] = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE is_active = 1")->fetchColumn();
$stats['low_stock']      = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE stock <= 5 AND is_active = 1")->fetchColumn();

// Users
$stats['total_users']   = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
$stats['total_sellers'] = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'seller'")->fetchColumn();

// ── REVENUE CHART (last 30 days) ──────────────────────────────
$chartStmt = $pdo->query("
    SELECT
        DATE(created_at)  AS day,
        SUM(total)        AS revenue,
        COUNT(*)          AS order_count
    FROM orders
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND status != 'Cancelled'
    GROUP BY DATE(created_at)
    ORDER BY day ASC
");
$stats['revenue_chart'] = $chartStmt->fetchAll();

// ── TOP PRODUCTS ──────────────────────────────────────────────
$topProducts = $pdo->query("
    SELECT
        p.id, p.name, p.image_url AS img, p.price,
        SUM(oi.qty) AS units_sold,
        SUM(oi.qty * oi.unit_price) AS revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders   o ON o.id = oi.order_id
    WHERE o.status != 'Cancelled'
    GROUP BY p.id
    ORDER BY units_sold DESC
    LIMIT 5
")->fetchAll();

foreach ($topProducts as &$p) {
    $p['units_sold'] = (int)$p['units_sold'];
    $p['revenue']    = (float)$p['revenue'];
    $p['price']      = (float)$p['price'];
}
unset($p);

$stats['top_products'] = $topProducts;

// ── LOW STOCK PRODUCTS ────────────────────────────────────────
$lowStock = $pdo->query("
    SELECT id, name, image_url AS img, stock, category
    FROM products
    WHERE stock <= 5 AND is_active = 1
    ORDER BY stock ASC
    LIMIT 10
")->fetchAll();

foreach ($lowStock as &$p) {
    $p['stock'] = (int)$p['stock'];
}
unset($p);

$stats['low_stock_products'] = $lowStock;

echo json_encode(['success' => true, 'stats' => $stats]);
