<?php
header("Content-Type: application/json");
require_once '../../db.php';

$name = $_POST['name'] ?? '';
if (empty($name)) {
    echo json_encode(['success' => false, 'message' => 'Product name is required']);
    exit;
}

$imageUrl = $_POST['image_url'] ?? '';

// Handle File Upload
if (isset($_FILES['pImageFile']) && $_FILES['pImageFile']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../../uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $fileTmpPath = $_FILES['pImageFile']['tmp_name'];
    $fileName = $_FILES['pImageFile']['name'];
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
        $_POST['sellerEmail']
    ]);

    if ($success) {
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database insertion failed']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}