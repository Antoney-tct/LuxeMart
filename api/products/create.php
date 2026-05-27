<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

// ── AUTH ──────────────────────────────────────────────────────
if (empty($_SESSION['user_email']) || !in_array($_SESSION['role'], ['seller','admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Seller access required.']);
    exit;
}

// ── REQUIRED FIELDS ───────────────────────────────────────────
$name     = trim($_POST['name'] ?? '');
$brand    = trim($_POST['brand'] ?? '');
$desc     = trim($_POST['description'] ?? '');
$price    = (float)($_POST['price'] ?? 0);
$category = trim($_POST['category'] ?? 'general');
$stock    = (int)($_POST['stock'] ?? 0);

if (!$name || !$brand || !$desc || $price <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Name, brand, description and price are required.']);
    exit;
}

// ── IMAGE ─────────────────────────────────────────────────────
$imageUrl = trim($_POST['image_url'] ?? '');

if (!empty($_FILES['pImageFile']) && $_FILES['pImageFile']['error'] === UPLOAD_ERR_OK) {
    $tmp     = $_FILES['pImageFile']['tmp_name'];
    $size    = $_FILES['pImageFile']['size'];
    $maxSize = 2 * 1024 * 1024; // 2MB

    if ($size > $maxSize) {
        echo json_encode(['success' => false, 'message' => 'Image must be under 2MB.']);
        exit;
    }

    $mime    = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Only JPG, PNG and WEBP images allowed.']);
        exit;
    }

    $ext     = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$mime];
    $dir     = __DIR__ . '/../../uploads/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = 'prod_' . uniqid('', true) . '.' . $ext;
    move_uploaded_file($tmp, $dir . $filename);
    $imageUrl = 'uploads/' . $filename;
}

if (!$imageUrl) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A product image is required.']);
    exit;
}

// ── INSERT ────────────────────────────────────────────────────
$stmt = $pdo->prepare("
    INSERT INTO products
        (name, brand, description, price, image_url, category, stock, seller_email)
    VALUES
        (:name, :brand, :desc, :price, :img, :cat, :stock, :email)
");

$stmt->execute([
    ':name'  => $name,
    ':brand' => $brand,
    ':desc'  => $desc,
    ':price' => $price,
    ':img'   => $imageUrl,
    ':cat'   => $category,
    ':stock' => $stock,
    ':email' => $_SESSION['user_email'],
]);

echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
