<?php
require __DIR__ . '/src/db.php';

$pdo = getPDO();
$stmt = $pdo->query('SELECT user_name, message, created_at FROM messages ORDER BY id DESC LIMIT 3');
$messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Recent messages:\n\n";
foreach ($messages as $msg) {
    echo "👤 " . $msg['user_name'] . "\n";
    echo "💬 " . $msg['message'] . "\n";
    echo "🕐 " . $msg['created_at'] . "\n\n";
}
