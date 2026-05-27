<?php
/**
 * LuxeMart — Database Connection
 * Adjust host/user/pass/dbname for your XAMPP setup.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'luxemart_db');
define('DB_USER', 'root');
define('DB_PASS', '');          // XAMPP default: empty
define('DB_CHARSET', 'utf8mb4');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed.',
        // Remove the line below in production:
        'debug'   => $e->getMessage(),
    ]));
}
