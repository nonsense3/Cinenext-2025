<?php
// backend/src/db.php
require_once __DIR__ . '/init.php';
// Try to load manual config if it exists (for InfinityFree)
if (file_exists(__DIR__ . '/db_config.php')) {
    require_once __DIR__ . '/db_config.php';
}
function getPDO(){
    static $pdo = null;
    if ($pdo) return $pdo;   
    // Use constants from db_config.php if defined, otherwise fallback to env()
    $dsn = defined('DB_DSN') ? DB_DSN : env('DB_DSN');
    $user = defined('DB_USER') ? DB_USER : env('DB_USER', 'root');
    $pass = defined('DB_PASS') ? DB_PASS : env('DB_PASS', '');
    if (!$dsn) {
        // Fallback to SQLite if not configured
        $dbFile = __DIR__ . '/../data.sqlite';
        $dsn = "sqlite:" . $dbFile;
        $user = null;
        $pass = null;
    }
    try {
        $pdo = new PDO($dsn, $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);   
        // Set charset for MySQL
        if (strpos($dsn, 'mysql:') === 0) {
            $pdo->exec("SET NAMES utf8mb4");
        }
        return $pdo;
    } catch (PDOException $e) {
        // Provide helpful error message
        $error = "Database connection failed: " . $e->getMessage();
        if (strpos($dsn, 'mysql:') === 0) {
            $error .= "\n\nMake sure:\n";
            $error .= "1. XAMPP MySQL/MariaDB is running\n";
            $error .= "2. Database 'skillx_chat' exists (run setup_mysql.php to create it)\n";
            $error .= "3. Your .env file has correct DB credentials";
        }
        throw new Exception($error);
    }
}