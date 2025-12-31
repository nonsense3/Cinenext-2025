<?php
// backend/public/chat.php
// Fix paths for both local (public/chat.php) and production (htdocs/chat.php)
$baseDir = __DIR__;
if (is_dir($baseDir . '/src')) {
    // Production: src is in the same folder as chat.php
    require_once $baseDir . '/src/db.php';
    require_once $baseDir . '/src/init.php';
} else {
    // Local: src is in the parent folder
    require_once $baseDir . '/../src/db.php';
    require_once $baseDir . '/../src/init.php';
}
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
$method = $_SERVER['REQUEST_METHOD'];
$pdo = getPDO();
// Get messages
if ($method === 'GET') {
    if (is_dir($baseDir . '/src')) {
        require_once $baseDir . '/src/funny_names.php';
    } else {
        require_once $baseDir . '/../src/funny_names.php';
    }
    if (isset($_GET['action']) && $_GET['action'] === 'whoami') {
        $userIP = getUserIP();
        $userName = generateFunnyUsername($userIP);
        json_response(['user_name' => $userName]);
    }
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $limit = min($limit, 100); // Max 100 messages
    $stmt = $pdo->query("SELECT id, user_name, message, is_anonymous, created_at FROM messages ORDER BY created_at DESC LIMIT " . $limit);
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Reverse to show oldest first
    $messages = array_reverse($messages);
    json_response(['messages' => $messages]);
}
// Post message
if ($method === 'POST') {
    if (is_dir($baseDir . '/src')) {
        require_once $baseDir . '/src/funny_names.php';
    } else {
        require_once $baseDir . '/../src/funny_names.php';
    }   
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $userName = trim($data['user_name'] ?? 'Anonymous');
    $message = trim($data['message'] ?? '');
    $isAnonymous = !empty($data['is_anonymous']) ? 1 : 0;
    if (empty($message)) {
        json_response(['error' => 'Message cannot be empty'], 400);
    }
    if (strlen($message) > 500) {
        json_response(['error' => 'Message too long (max 500 characters)'], 400);
    }  
    // If anonymous, generate a funny username based on IP
    if ($isAnonymous || $userName === 'Anonymous') {
        $userIP = getUserIP();
        $userName = generateFunnyUsername($userIP);
    }  
    $stmt = $pdo->prepare("INSERT INTO messages (user_name, message, is_anonymous) VALUES (?, ?, ?)");
    $stmt->execute([$userName, $message, $isAnonymous]);  
    $messageId = $pdo->lastInsertId();  
    json_response([
        'ok' => true,
        'message_id' => $messageId,
        'user_name' => $userName  // Return the generated name
    ]);
}
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);