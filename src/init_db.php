<?php
// backend/init_db.php
require_once __DIR__ . '/src/db.php';
try {
    $pdo = getPDO();
    echo "Connected to database.\n";
    // Create messages table (MySQL compatible)
    $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL,
        is_anonymous TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    echo "Table 'messages' created successfully.\n";
    // Insert a test message
    $stmt = $pdo->prepare("INSERT INTO messages (user_name, message, is_anonymous) VALUES (?, ?, ?)");
    $stmt->execute(['System', 'Welcome to the chat!', 0]);
    echo "Test message inserted.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}