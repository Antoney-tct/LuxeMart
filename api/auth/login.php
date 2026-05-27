<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid login data.']);
    exit;
}

$email   = strtolower(trim($data['email']));
$name    = trim($data['name'] ?? '');
$picture = trim($data['picture'] ?? '');

// Server-side role enforcement — never trust client
$role = 'buyer';
if ($email === 'aouko178@gmail.com') {
    $role = 'admin';
} elseif (!empty($data['role']) && $data['role'] === 'seller') {
    // Only grant seller if the user is registering as one
    // (they came from seller-register page)
    $role = 'seller';
}

// Upsert user
$stmt = $pdo->prepare("
    INSERT INTO users (name, email, picture, role)
    VALUES (:name, :email, :picture, :role)
    ON DUPLICATE KEY UPDATE
        name    = IF(name = '' OR name IS NULL, VALUES(name), name),
        picture = VALUES(picture),
        role    = IF(email = 'aouko178@gmail.com', 'admin', role)
");

$stmt->execute([
    ':name'    => $name,
    ':email'   => $email,
    ':picture' => $picture,
    ':role'    => $role,
]);

// Fetch the user's actual role from DB (handles returning users)
$user = $pdo->prepare("SELECT name, email, picture, role FROM users WHERE email = ?");
$user->execute([$email]);
$userData = $user->fetch();

// Set session
$_SESSION['user_email'] = $userData['email'];
$_SESSION['user_name']  = $userData['name'];
$_SESSION['role']       = $userData['role'];

echo json_encode([
    'success' => true,
    'user'    => $userData,
]);
