<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

// ── PARAMS ───────────────────────────────────────────────────
$category  = $_GET['category']  ?? 'all';
$search    = trim($_GET['search'] ?? '');
$sort      = $_GET['sort']      ?? 'popularity';
$brand     = $_GET['brand']     ?? 'all';
$minPrice  = isset($_GET['min_price']) ? (float)$_GET['min_price'] : null;
$maxPrice  = isset($_GET['max_price']) ? (float)$_GET['max_price'] : null;
$minRating = isset($_GET['min_rating']) ? (float)$_GET['min_rating'] : null;
$inStock   = isset($_GET['in_stock'])  && $_GET['in_stock'] === 'true';
$onSale    = isset($_GET['on_sale'])   && $_GET['on_sale']  === 'true';
$page      = max(1, (int)($_GET['page']  ?? 1));
$limit     = min(48, max(1, (int)($_GET['limit'] ?? 24)));
$offset    = ($page - 1) * $limit;

// ── BUILD WHERE ───────────────────────────────────────────────
$where  = ['p.is_active = 1'];
$params = [];

if ($category !== 'all') {
    $where[]       = 'p.category = :category';
    $params[':category'] = $category;
}

if ($search !== '') {
    $like = '%' . $search . '%';
    $where[]         = '(p.name LIKE :s1 OR p.brand LIKE :s2 OR p.description LIKE :s3)';
    $params[':s1']   = $like;
    $params[':s2']   = $like;
    $params[':s3']   = $like;
}

if ($brand !== 'all') {
    $where[]        = 'p.brand = :brand';
    $params[':brand'] = $brand;
}

if ($minPrice !== null) {
    $where[]           = 'p.price >= :min_price';
    $params[':min_price'] = $minPrice;
}

if ($maxPrice !== null) {
    $where[]           = 'p.price <= :max_price';
    $params[':max_price'] = $maxPrice;
}

if ($minRating !== null) {
    $where[]              = 'p.rating >= :min_rating';
    $params[':min_rating'] = $minRating;
}

if ($inStock) {
    $where[] = 'p.stock > 0';
}

if ($onSale) {
    $where[] = 'p.original_price IS NOT NULL';
}

$whereSQL = implode(' AND ', $where);

// ── SORT ─────────────────────────────────────────────────────
$orderMap = [
    'popularity' => 'p.reviews_count DESC',
    'newest'     => 'p.created_at DESC',
    'price-asc'  => 'p.price ASC',
    'price-desc' => 'p.price DESC',
    'rating'     => 'p.rating DESC',
];

$orderSQL = $orderMap[$sort] ?? 'p.reviews_count DESC';

// ── COUNT ─────────────────────────────────────────────────────
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p WHERE $whereSQL");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// ── FETCH ─────────────────────────────────────────────────────
$sql = "
    SELECT
        p.id,
        p.name,
        p.brand,
        p.description AS `desc`,
        p.price,
        p.original_price AS oldPrice,
        p.image_url AS img,
        p.category,
        p.seller_email AS sellerEmail,
        p.stock,
        p.rating,
        p.reviews_count AS reviews,
        p.badge,
        p.is_active AS inStock,
        p.colors,
        p.sizes,
        p.created_at
    FROM products p
    WHERE $whereSQL
    ORDER BY $orderSQL
    LIMIT :limit OFFSET :offset
";

$stmt = $pdo->prepare($sql);
foreach ($params as $k => $v) {
    $stmt->bindValue($k, $v);
}
$stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$products = $stmt->fetchAll();

// ── NORMALISE ─────────────────────────────────────────────────
foreach ($products as &$p) {
    $p['id']      = (int)$p['id'];
    $p['price']   = (float)$p['price'];
    $p['oldPrice'] = $p['oldPrice'] ? (float)$p['oldPrice'] : null;
    $p['stock']   = (int)$p['stock'];
    $p['rating']  = (float)$p['rating'];
    $p['reviews'] = (int)$p['reviews'];
    $p['inStock'] = $p['stock'] > 0;
    $p['onSale']  = $p['oldPrice'] !== null;
    $p['colors']  = $p['colors']  ? json_decode($p['colors'])  : [];
    $p['sizes']   = $p['sizes']   ? json_decode($p['sizes'])   : [];
}
unset($p);

echo json_encode([
    'success'        => true,
    'products'       => $products,
    'total_products' => $total,
    'page'           => $page,
    'limit'          => $limit,
]);
