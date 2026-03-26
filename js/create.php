<?php
session_start();
header("Content-Type: application/json");
require_once '../../db.php';

// Session Check: Ensure user is logged in as a seller
if (!isset($_SESSION['user_email']) || $_SESSION['role'] !== 'seller') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized access.']);
    exit;
}

$name = $_POST['name'] ?? '';
if (empty($name)) {
    echo json_encode(['success' => false, 'message' => 'Product name is required']);
    exit;
}

$imageUrl = $_POST['image_url'] ?? '';

// Handle File Upload
if (isset($_FILES['pImageFile']) && $_FILES['pImageFile']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['pImageFile']['tmp_name'];
    $fileSize = $_FILES['pImageFile']['size'];
    $fileName = $_FILES['pImageFile']['name'];

    // 1. Server-side size validation (2MB)
    if ($fileSize > 2 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'File size exceeds 2MB limit.']);
        exit;
    }

    // 2. Server-side MIME type validation
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($fileTmpPath);
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mimeType, $allowedMimes)) {
        echo json_encode(['success' => false, 'message' => 'Invalid image format.']);
        exit;
    }

    $uploadDir = '../../uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    
    // Generate unique name to prevent overwriting
    $newFileName = uniqid('prod_', true) . '.' . $fileExtension;
    $destPath = $uploadDir . $newFileName;

    if (move_uploaded_file($fileTmpPath, $destPath)) {
        // Save the relative path for the frontend
        $imageUrl = 'uploads/' . $newFileName;
    }
}

try {
    $stmt = $pdo->prepare("INSERT INTO products (name, brand, description, price, image_url, category, stock, seller_email) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    $success = $stmt->execute([
        $_POST['name'],
        $_POST['brand'],
        $_POST['description'],
        $_POST['price'],
        $imageUrl,
        $_POST['category'],
        $_POST['stock'],
        $_SESSION['user_email'] // Use secure session email
    ]);

    if ($success) {
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insertion failed']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}