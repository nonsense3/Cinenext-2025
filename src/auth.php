<?php
// backend/public/auth.php
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/init.php';
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$pdo = getPDO();
if ($method === 'POST' && $action === 'signup') {
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
        json_response(['error'=>'Invalid email or password (>=6) required'], 400);
    }
    // check existing
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) json_response(['error'=>'Email already registered'], 409);
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$name, $email, $hash]);
    $_SESSION['user_id'] = $pdo->lastInsertId();
    json_response(['ok'=>true]);
}
if ($method === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u || !isset($u['password_hash']) || !password_verify($password, $u['password_hash'])) {
        json_response(['error'=>'Invalid credentials'], 401);
    }
    $_SESSION['user_id'] = $u['id'];
    json_response(['ok'=>true, 'user'=>['id'=>$u['id'],'email'=>$u['email'],'name'=>$u['name'],'avatar_url'=>$u['avatar_url'] ?? null]]);
}
if ($method === 'POST' && $action === 'logout') {
    session_destroy();
    json_response(['ok'=>true]);
}
if ($method === 'GET' && $action === 'me') {
    if (empty($_SESSION['user_id'])) json_response(['user'=>null]);
    $stmt = $pdo->prepare("SELECT id,name,email,avatar_url,provider FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    json_response(['user'=>$u]);
}
http_response_code(404);
echo "Not found";