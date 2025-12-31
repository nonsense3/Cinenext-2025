<?php
// backend/public/profile.php
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/init.php';
if (empty($_SESSION['user_id'])) json_response(['error'=>'Not authenticated'], 401);
$pdo = getPDO();
$uid = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $stmt = $pdo->prepare("SELECT id,name,email,avatar_url,provider FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    json_response(['user'=>$u]);
}
if ($method === 'POST') {
    // accept multipart/form-data or JSON fallback
    $name = $_POST['name'] ?? null;
    $email = $_POST['email'] ?? null;
    $password = $_POST['password'] ?? null;
    $avatarUrl = null;
    if (!empty($_FILES['avatar']['tmp_name'])) {
        $uploadsDir = __DIR__ . '/uploads';
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);
        $tmp = $_FILES['avatar']['tmp_name'];
        $ext = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
        $safe = bin2hex(random_bytes(8)) . '.' . $ext;
        $dest = $uploadsDir . '/' . $safe;
        if (!move_uploaded_file($tmp, $dest)) json_response(['error'=>'Upload failed'], 500);
        $avatarUrl = (isset($_SERVER['HTTP_HOST']) ? (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] : '') . '/uploads/' . $safe;
    }
    $fields = []; $params = [];
    if ($name !== null) { $fields[] = 'name = ?'; $params[] = $name; }
    if ($email !== null) { $fields[] = 'email = ?'; $params[] = $email; }
    if ($password) { $fields[] = 'password_hash = ?'; $params[] = password_hash($password, PASSWORD_DEFAULT); }
    if ($avatarUrl) { $fields[] = 'avatar_url = ?'; $params[] = $avatarUrl; }
    if (!count($fields)) json_response(['error'=>'No changes'], 400);
    $params[] = $uid;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response(['ok'=>true]);
}
json_response(['error'=>'Method not allowed'], 405);