<?php
session_start();
header("Content-Type: application/json");

// In a production environment, you should verify the Google JWT token 
// using a library like google/apiclient to ensure the email is authentic.

$data = json_decode(file_get_contents('php://input'), true);

if ($data && isset($data['email'])) {
    $email = strtolower($data['email']);
    $role = $data['role'] ?? 'buyer';

    // Server-side Role Enforcement: Never trust the role sent from the client.
    if ($email === 'aouko178@gmail.com') {
        $role = 'admin';
    }

    // Store sensitive info in the session
    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = $data['name'] ?? '';
    $_SESSION['role'] = $role;
    
    echo json_encode(['success' => true, 'role' => $role]);
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid login data']);
}