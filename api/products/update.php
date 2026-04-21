<?php
session_start();
header('Content-Type: application/json');
require_once '../../db.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not logged in.']);
    exit;
}

$id       = (int)($_POST['id'] ?? 0);
$userId   = $_SESSION['user_id'];
$role     = $_SESSION['role'] ?? 'buyer';

if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Missing product ID.']);
    exit;
}

// Verify ownership — admin can edit any product
$ownerCheck = $role === 'admin'
    ? $pdo->prepare("SELECT id, image_url FROM products WHERE id = ?")
    : $pdo->prepare("SELECT id, image_url FROM products WHERE id = ? AND seller_id = ?");

$params = $role === 'admin' ? [$id] : [$id, $userId];
$ownerCheck->execute($params);
$existing = $ownerCheck->fetch();

if (!$existing) {
    echo json_encode(['success' => false, 'message' => 'Product not found or access denied.']);
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
$imageUrl    = $existing['image_url']; // Keep existing by default

// Handle new image upload
if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
    $file     = $_FILES['image_file'];
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    $allowed  = ['image/jpeg', 'image/png', 'image/webp'];

    if (in_array($mimeType, $allowed) && $file['size'] <= 2 * 1024 * 1024) {
        // Delete old uploaded file
        if ($existing['image_url'] && str_starts_with($existing['image_url'], 'uploads/')) {
            $oldPath = __DIR__ . '/../../' . $existing['image_url'];
            if (file_exists($oldPath)) unlink($oldPath);
        }

        $uploadDir = __DIR__ . '/../../uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'prod_' . uniqid() . '.' . strtolower($ext);

        if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            $imageUrl = 'uploads/' . $filename;
        }
    }
} elseif (!empty($_POST['image_url'])) {
    $imageUrl = trim($_POST['image_url']);
}

try {
    $pdo->prepare("
        UPDATE products SET
            name = ?, brand = ?, description = ?, price = ?, old_price = ?,
            image_url = ?, category = ?, stock = ?, on_sale = ?, updated_at = NOW()
        WHERE id = ?
    ")->execute([
        $name, $brand, $description, $price, $old_price,
        $imageUrl, $category, $stock, $on_sale, $id,
    ]);

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Update failed.']);
}