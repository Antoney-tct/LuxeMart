<?php
session_start();
header("Content-Type: application/json");

// Include the Google Client Library (installed via Composer)
require_once 'vendor/autoload.php';

$data = json_decode(file_get_contents('php://input'), true);
$CLIENT_ID = '459218839757-eo46dlmqm1jga6a62ct591b2fhfd8i7e.apps.googleusercontent.com';

if ($data && isset($data['credential'])) {
    $id_token = $data['credential'];

    // 1. Verify the JWT Token with Google
    $client = new Google_Client(['client_id' => $CLIENT_ID]);
    $payload = $client->verifyIdToken($id_token);

    if (!$payload) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid Google Token']);
        exit;
    }

    // 2. Token is verified! Get the authentic user info from the payload
    $email = strtolower($payload['email']);
    $name = $payload['name'];
    $picture = $payload['picture'] ?? '';
    $role = $data['role'] ?? 'buyer';

    if ($email === 'aouko178@gmail.com') {
        $role = 'admin';
    }

    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = $name;
    $_SESSION['picture'] = $picture;
    $_SESSION['role'] = $role;
    
    // Return the verified user data to the frontend
    echo json_encode([
        'success' => true, 
        'user' => [
            'name' => $name,
            'email' => $email,
            'picture' => $picture,
            'role' => $role
        ]
    ]);
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid login data']);
}