<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

if (empty($_SESSION['user_email']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required.']);
    exit;
}

// ── GET ALL USERS ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $role   = $_GET['role'] ?? 'all';
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = 50;
    $offset = ($page - 1) * $limit;

    $where  = [];
    $params = [];

    if ($role !== 'all') {
        $where[]      = 'role = :role';
        $params[':role'] = $role;
    }

    if ($search) {
        $like = '%' . $search . '%';
        $where[]    = '(name LIKE :s1 OR email LIKE :s2)';
        $params[':s1'] = $like;
        $params[':s2'] = $like;
    }

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users $whereSQL");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare("
        SELECT
            u.id, u.name, u.email, u.picture, u.role, u.phone,
            u.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_email = u.email) AS order_count,
            (SELECT SUM(o.total) FROM orders o WHERE o.user_email = u.email AND o.status != 'Cancelled') AS total_spent
        FROM users u
        $whereSQL
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    ");

    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $users = $stmt->fetchAll();

    foreach ($users as &$u) {
        $u['id']          = (int)$u['id'];
        $u['order_count'] = (int)$u['order_count'];
        $u['total_spent'] = $u['total_spent'] ? (float)$u['total_spent'] : 0.0;
    }
    unset($u);

    echo json_encode(['success' => true, 'users' => $users, 'total' => $total]);
    exit;
}

// ── UPDATE USER ROLE ──────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data  = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = strtolower(trim($data['email'] ?? ''));
    $role  = $data['role'] ?? '';

    $allowed = ['buyer', 'seller', 'admin'];
    if (!$email || !in_array($role, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Valid email and role required.']);
        exit;
    }

    // Protect primary admin
    if ($email === 'aouko178@gmail.com' && $role !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Cannot change the primary admin role.']);
        exit;
    }

    $pdo->prepare("UPDATE users SET role = ? WHERE email = ?")->execute([$role, $email]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
