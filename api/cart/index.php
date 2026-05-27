<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';

$email = $_SESSION['user_email'] ?? null;

// ── GET ───────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$email) {
        echo json_encode(['success' => true, 'cart' => []]);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT
            ci.qty,
            p.id          AS product_id,
            p.name,
            p.brand,
            p.price,
            p.image_url   AS img,
            p.stock,
            p.is_active
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_email = ?
        ORDER BY ci.added_at DESC
    ");
    $stmt->execute([$email]);
    $items = $stmt->fetchAll();

    foreach ($items as &$i) {
        $i['product_id'] = (int)$i['product_id'];
        $i['qty']        = (int)$i['qty'];
        $i['price']      = (float)$i['price'];
        $i['stock']      = (int)$i['stock'];
    }
    unset($i);

    echo json_encode(['success' => true, 'cart' => $items]);
    exit;
}

// ── POST (add / set / remove / clear) ────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$data       = json_decode(file_get_contents('php://input'), true) ?? [];
$action     = $data['action']     ?? '';
$productId  = (int)($data['product_id'] ?? 0);
$qty        = max(1, (int)($data['qty'] ?? 1));

if (!$email) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Login required to manage cart.']);
    exit;
}

switch ($action) {

    case 'add':
        if (!$productId) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Product ID required.']); exit; }

        // Check stock
        $stock = $pdo->prepare("SELECT stock FROM products WHERE id = ? AND is_active = 1");
        $stock->execute([$productId]);
        $available = (int)($stock->fetchColumn() ?? 0);

        if ($available < 1) {
            echo json_encode(['success' => false, 'message' => 'Product is out of stock.']);
            exit;
        }

        $pdo->prepare("
            INSERT INTO cart_items (user_email, product_id, qty)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
                qty = LEAST(qty + VALUES(qty), ?)
        ")->execute([$email, $productId, $qty, $available]);

        echo json_encode(['success' => true]);
        break;

    case 'set':
        if (!$productId) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Product ID required.']); exit; }

        if ($qty < 1) {
            $pdo->prepare("DELETE FROM cart_items WHERE user_email = ? AND product_id = ?")
                ->execute([$email, $productId]);
        } else {
            $pdo->prepare("
                INSERT INTO cart_items (user_email, product_id, qty)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE qty = VALUES(qty)
            ")->execute([$email, $productId, $qty]);
        }

        echo json_encode(['success' => true]);
        break;

    case 'remove':
        if (!$productId) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Product ID required.']); exit; }
        $pdo->prepare("DELETE FROM cart_items WHERE user_email = ? AND product_id = ?")
            ->execute([$email, $productId]);
        echo json_encode(['success' => true]);
        break;

    case 'clear':
        $pdo->prepare("DELETE FROM cart_items WHERE user_email = ?")
            ->execute([$email]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unknown action.']);
}
