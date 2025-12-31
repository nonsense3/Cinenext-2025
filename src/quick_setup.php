<?php
// Quick setup script - creates database and tables if they don't exist
error_reporting(E_ALL);
ini_set('display_errors', 1);
echo "Setting up database...\n\n";
try {
    // Step 1: Connect to MySQL without selecting a database
    echo "1. Connecting to MySQL...\n";
    $pdo = new PDO('mysql:host=localhost', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "   ✓ Connected to MySQL\n\n";
    // Step 2: Create database if it doesn't exist
    echo "2. Creating database 'skillx_chat'...\n";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS skillx_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "   ✓ Database created/verified\n\n";
    // Step 3: Select the database
    echo "3. Selecting database...\n";
    $pdo->exec("USE skillx_chat");
    echo "   ✓ Database selected\n\n";
    // Step 4: Create tables
    echo "4. Creating tables...\n";
    // Users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider VARCHAR(50) DEFAULT NULL,
      provider_id VARCHAR(255) DEFAULT NULL,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) DEFAULT NULL,
      avatar_url TEXT DEFAULT NULL,
      password_hash VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email),
      INDEX idx_users_provider (provider, provider_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "   ✓ Users table created\n";
    // Messages table
    $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_anonymous TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_created_at (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    echo "   ✓ Messages table created\n\n";
    // Step 5: Verify tables
    echo "5. Verifying tables...\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "   - $table\n";
    }
    // Step 6: Check message count
    echo "\n6. Checking messages...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM messages");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    echo "   Messages in database: $count\n";
    echo "\n✅ Setup complete! Database is ready.\n";
} catch (PDOException $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    echo "\nMake sure:\n";
    echo "- XAMPP is running\n";
    echo "- MySQL/MariaDB service is started\n";
    echo "- MySQL root password is empty (default for XAMPP)\n";
    exit(1);
}