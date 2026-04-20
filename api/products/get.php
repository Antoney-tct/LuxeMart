<?php
header('Content-Type: application/json');
require_once '../../db.php';

$category  = $_GET['category']  ?? 'all';
$search    = $_GET['search']    ?? '';
$sort      = $_GET['sort']      ?? 'popularity';
$page      = max(1, (int)($_GET['page']  ?? 1));
$limit     = min(48, max(1, (int)($_GET['limit'] ?? 24)));
$offset    = ($page - 1) * $limit;

$where  = ["p.is_active = 1"];
$params = [];

if ($category !== 'all') {
    $where[]  = "p.category = ?";
    $params[] = $category;
}

if ($search) {
    $where[]  = "(p.name LIKE ? OR p.brand LIKE ? OR p.category LIKE ?)";
    $like     = "%{$search}%";
    $params   = array_merge($params, [$like, $like, $like]);
}

if (isset($_GET['on_sale']) && $_GET['on_sale'] === 'true') {
    $where[] = "p.on_sale = 1";
}

if (isset($_GET['min_price']) && is_numeric($_GET['min_price'])) {
    $where[]  = "p.price >= ?";
    $params[] = (float)$_GET['min_price'];
}

if (isset($_GET['max_price']) && is_numeric($_GET['max_price'])) {
    $where[]  = "p.price <= ?";
    $params[] = (float)$_GET['max_price'];
}

if (isset($_GET['min_rating']) && is_numeric($_GET['min_rating'])) {
    $where[]  = "p.rating >= ?";
    $params[] = (float)$_GET['min_rating'];
}

$orderBy = match($sort) {
    'price-asc'  => 'p.price ASC',
    'price-desc' => 'p.price DESC',
    'rating'     => 'p.rating DESC',
    'newest'     => 'p.created_at DESC',
    default      => 'p.review_count DESC',
};

$whereSQL = 'WHERE ' . implode(' AND ', $where);

// Total count
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p {$whereSQL}");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// Fetch page
$stmt = $pdo->prepare("
    SELECT
        p.id, p.name, p.brand, p.description AS `desc`,
        p.price, p.old_price AS oldPrice,
        p.image_url AS img, p.category,
        p.stock, p.rating, p.review_count AS reviews,
        p.badge, p.on_sale AS onSale,
        u.name AS seller_name
    FROM products p
    LEFT JOIN users u ON u.id = p.seller_id
    {$whereSQL}
    ORDER BY {$orderBy}
    LIMIT {$limit} OFFSET {$offset}
");
$stmt->execute($params);
$products = $stmt->fetchAll();

// Cast types for JS
foreach ($products as &$p) {
    $p['id']       = (int)$p['id'];
    $p['price']    = (float)$p['price'];
    $p['oldPrice'] = $p['oldPrice'] ? (float)$p['oldPrice'] : null;
    $p['stock']    = (int)$p['stock'];
    $p['rating']   = (float)$p['rating'];
    $p['reviews']  = (int)$p['reviews'];
    $p['onSale']   = (bool)$p['onSale'];
    $p['inStock']  = $p['stock'] > 0;
    $p['colors']   = [];
    $p['sizes']    = [];
}

echo json_encode([
    'success'        => true,
    'products'       => $products,
    'total_products' => $total,
    'page'           => $page,
    'limit'          => $limit,
]);