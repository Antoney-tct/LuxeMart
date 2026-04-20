<?php
// htdocs/LuxeMart/api/auth/login.php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once '../../db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || empty($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

$email   = strtolower(trim($data['email']));
$name    = trim($data['name'] ?? 'User');
$picture = trim($data['picture'] ?? '');

// Hard-coded admin override (server-side — never trust client role)
$forcedRole = null;
if ($email === 'aouko178@gmail.com') {
    $forcedRole = 'admin';
}

try {
    // Upsert: create user if not exists, update name/picture on each login
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, picture, role)
        VALUES (:name, :email, :picture, :role)
        ON DUPLICATE KEY UPDATE
            name    = VALUES(name),
            picture = VALUES(picture),
            updated_at = CURRENT_TIMESTAMP
    ");

    $defaultRole = $forcedRole ?? 'buyer';
    $stmt->execute([
        'name'    => $name,
        'email'   => $email,
        'picture' => $picture,
        'role'    => $defaultRole,
    ]);

    // Fetch the user back (role may already be 'seller' from a previous login)
    $user = $pdo->prepare("SELECT id, name, email, picture, role, phone FROM users WHERE email = ?");
    $user->execute([$email]);
    $userData = $user->fetch();

    // Admin override always wins
    if ($forcedRole) {
        $userData['role'] = $forcedRole;
        $pdo->prepare("UPDATE users SET role = ? WHERE email = ?")->execute([$forcedRole, $email]);
    }

    // Store in PHP session
    $_SESSION['user_id']    = $userData['id'];
    $_SESSION['user_email'] = $userData['email'];
    $_SESSION['user_name']  = $userData['name'];
    $_SESSION['role']       = $userData['role'];

    echo json_encode([
        'success' => true,
        'user'    => $userData,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Login failed.']);
}