<?php
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    echo json_encode(['logged_in' => false]);
    exit;
}

echo json_encode([
    'logged_in' => true,
    'user' => [
        'id'      => $_SESSION['user_id'],
        'name'    => $_SESSION['user_name'],
        'email'   => $_SESSION['user_email'],
        'role'    => $_SESSION['role'],
    ]
]);