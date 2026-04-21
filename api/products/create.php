<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

if (!in_array($_SESSION['role'] ?? '', ['seller', 'admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Seller access required.']);
    exit;
}

$name        = trim($_POST['name']        ?? '');
$brand       = trim($_POST['brand']       ?? '');
$category    = trim($_POST['category']    ?? '');
$price       = (float)($_POST['price']    ?? 0);
$stock       = (int)($_POST['stock']      ?? 0);
$description = trim($_POST['description'] ?? '');
$old_price   = $_POST['old_price'] ? (float)$_POST['old_price'] : null;
$on_sale     = (int)($_POST['on_sale']    ?? 0);

if (!$name || !$category || $price <= 0) {
    echo json_encode(['success' => false, 'message' => 'Name, category and price are required.']);
    exit;
}

// Handle image
$imageUrl = trim($_POST['image_url'] ?? '');

if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
    $file     = $_FILES['image_file'];
    $allowed  = ['image/jpeg', 'image/png', 'image/webp'];
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    if (!in_array($mimeType, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Invalid image format.']);
        exit;
    }

    if ($file['size'] > 2 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'Image must be under 2MB.']);
        exit;
    }

    $uploadDir = __DIR__ . '/../../uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'prod_' . uniqid() . '.' . strtolower($ext);
    $destPath = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $destPath)) {
        $imageUrl = 'uploads/' . $filename;
    }
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO products
            (name, brand, description, price, old_price, image_url, category, seller_id, stock, on_sale)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $name, $brand, $description, $price, $old_price,
        $imageUrl, $category, $_SESSION['user_id'], $stock, $on_sale,
    ]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error.']);
}