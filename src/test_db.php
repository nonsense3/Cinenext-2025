&lt;?php
// Quick database test
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== DATABASE CONNECTION TEST ===\n\n";

try {
    require __DIR__ . '/../src/db.php';
    $pdo = getPDO();
    echo "✓ Database connected successfully\n\n";
    
    // Check if messages table exists
    $stmt = $pdo-&gt;query("SHOW TABLES LIKE 'messages'");
    if ($stmt-&gt;rowCount() &gt; 0) {
        echo "✓ Messages table exists\n\n";
        
        // Count messages
        $count = $pdo-&gt;query("SELECT COUNT(*) FROM messages")-&gt;fetchColumn();
        echo "Total messages in database: $count\n\n";
        
        // Try to insert a test message
        echo "Testing message insert...\n";
        $stmt = $pdo-&gt;prepare("INSERT INTO messages (user_name, message, is_anonymous) VALUES (?, ?, ?)");
        $result = $stmt-&gt;execute(['TestUser999', 'Test message from CLI', 1]);
        
        if ($result) {
            $lastId = $pdo-&gt;lastInsertId();
            echo "✓ Successfully inserted test message (ID: $lastId)\n";
            
            // Delete it
            $pdo-&gt;exec("DELETE FROM messages WHERE id = $lastId");
            echo "✓ Test message cleaned up\n\n";
            
            echo "=== RESULT: DATABASE IS WORKING CORRECTLY ===\n";
            echo "The problem is likely in the frontend JavaScript or chat.php endpoint.\n";
        }
    } else {
        echo "❌ ERROR: Messages table does not exist!\n";
        echo "Run: php public/setup_mysql.php\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e-&gt;getMessage() . "\n\n";
    echo "TROUBLESHOOTING:\n";
    echo "1. Make sure XAMPP is running\n";
    echo "2. Start MySQL/MariaDB in XAMPP Control Panel\n";
    echo "3. Run: php public/setup_mysql.php\n";
}
