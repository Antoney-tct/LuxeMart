<?php
header("Content-Type: application/json");
require_once '../../db.php';

$productId = $_POST['id'] ?? null;
$sellerEmail = $_POST['sellerEmail'] ?? null;

if (!$productId || !$sellerEmail) {
    echo json_encode(['success' => false, 'message' => 'Missing required data']);
    exit;
}

$imageUrl = $_POST['image_url'] ?? '';

// Handle New File Upload if present
if (isset($_FILES['pImageFile']) && $_FILES['pImageFile']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../../uploads/';
    $fileTmpPath = $_FILES['pImageFile']['tmp_name'];
    $newFileName = uniqid('prod_', true) . '.' . pathinfo($_FILES['pImageFile']['name'], PATHINFO_EXTENSION);
    
    if (move_uploaded_file($fileTmpPath, $uploadDir . $newFileName)) {
        $imageUrl = 'uploads/' . $newFileName;
    }
}

try {
    $stmt = $pdo->prepare("UPDATE products SET name=?, brand=?, description=?, price=?, image_url=?, category=?, stock=? WHERE id=? AND seller_email=?");
    
    $success = $stmt->execute([
        $_POST['name'],
        $_POST['brand'],
        $_POST['description'],
        $_POST['price'],
        $imageUrl,
        $_POST['category'],
        $_POST['stock'],
        $productId,
        $sellerEmail
    ]);

    if ($success) {
        echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Update failed']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>