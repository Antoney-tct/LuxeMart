<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

if (empty($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Login required to leave a review.']);
    exit;
}

$data      = json_decode(file_get_contents('php://input'), true) ?? [];
$productId = (int)($data['product_id'] ?? 0);
$rating    = (int)($data['rating']     ?? 0);
$body      = trim($data['body']        ?? '');

if (!$productId || $rating < 1 || $rating > 5 || strlen($body) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product ID, rating (1-5), and review text (10+ chars) required.']);
    exit;
}

// Verify product exists
$check = $pdo->prepare("SELECT id FROM products WHERE id = ? AND is_active = 1");
$check->execute([$productId]);
if (!$check->fetch()) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Product not found.']);
    exit;
}

// Fetch user's name
$userStmt = $pdo->prepare("SELECT name FROM users WHERE email = ?");
$userStmt->execute([$_SESSION['user_email']]);
$user = $userStmt->fetch();
$userName = $user ? $user['name'] : 'Anonymous';

try {
    // Upsert review (one per user per product)
    $pdo->prepare("
        INSERT INTO reviews (product_id, user_email, user_name, rating, body)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            rating    = VALUES(rating),
            body      = VALUES(body),
            user_name = VALUES(user_name)
    ")->execute([$productId, $_SESSION['user_email'], $userName, $rating, $body]);

    // Recalculate product rating average
    $avgStmt = $pdo->prepare("
        SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count
        FROM reviews WHERE product_id = ?
    ");
    $avgStmt->execute([$productId]);
    $stats = $avgStmt->fetch();

    $pdo->prepare("
        UPDATE products
        SET rating        = ROUND(?, 1),
            reviews_count = ?
        WHERE id = ?
    ")->execute([
        round((float)$stats['avg_rating'], 1),
        (int)$stats['review_count'],
        $productId,
    ]);

    echo json_encode(['success' => true, 'message' => 'Review submitted successfully.']);

} catch (Exception $e) {
    error_log('Review error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not submit review.']);
}
