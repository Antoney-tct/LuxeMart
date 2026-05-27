<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || !in_array($_SESSION['role'], ['seller','admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Seller access required.']);
    exit;
}

$id = (int)($_POST['id'] ?? 0);
if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID required.']);
    exit;
}

// Ownership check
$ownerStmt = $pdo->prepare("SELECT seller_email, image_url FROM products WHERE id = ?");
$ownerStmt->execute([$id]);
$existing = $ownerStmt->fetch();

if (!$existing) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Product not found.']);
    exit;
}

if ($_SESSION['role'] !== 'admin' && $existing['seller_email'] !== $_SESSION['user_email']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'You do not own this product.']);
    exit;
}

$name     = trim($_POST['name']        ?? '');
$brand    = trim($_POST['brand']       ?? '');
$desc     = trim($_POST['description'] ?? '');
$price    = (float)($_POST['price']    ?? 0);
$category = trim($_POST['category']    ?? 'general');
$stock    = (int)($_POST['stock']      ?? 0);

if (!$name || !$brand || !$desc || $price <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields required.']);
    exit;
}

$imageUrl = trim($_POST['image_url'] ?? $existing['image_url']);

// Handle new file upload
if (!empty($_FILES['pImageFile']) && $_FILES['pImageFile']['error'] === UPLOAD_ERR_OK) {
    $tmp  = $_FILES['pImageFile']['tmp_name'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    $allowed = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];

    if (isset($allowed[$mime])) {
        $dir = __DIR__ . '/../../uploads/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        // Delete old uploaded file
        $oldPath = __DIR__ . '/../../' . $existing['image_url'];
        if (file_exists($oldPath) && strpos($existing['image_url'], 'uploads/') === 0) {
            @unlink($oldPath);
        }

        $filename = 'prod_' . uniqid('', true) . '.' . $allowed[$mime];
        move_uploaded_file($tmp, $dir . $filename);
        $imageUrl = 'uploads/' . $filename;
    }
}

$pdo->prepare("
    UPDATE products
    SET name = ?, brand = ?, description = ?, price = ?,
        image_url = ?, category = ?, stock = ?
    WHERE id = ?
")->execute([$name, $brand, $desc, $price, $imageUrl, $category, $stock, $id]);

echo json_encode(['success' => true]);
