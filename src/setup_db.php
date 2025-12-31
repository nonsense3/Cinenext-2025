<?php
// setup_db.php - Run this ONCE to create tables on InfinityFree
require_once 'src/init.php';
require_once 'src/db.php';
try {
    $pdo = getPDO();
    // Read and execute schema
    $schema = file_get_contents('sql/schema-sqlite.sql');
    // Convert SQLite to MySQL syntax
    $schema = str_replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY', $schema);
    $schema = str_replace('DATETIME DEFAULT (datetime(\'now\'))', 'DATETIME DEFAULT CURRENT_TIMESTAMP', $schema);
    $schema = str_replace('datetime(\'now\')', 'CURRENT_TIMESTAMP', $schema);
    $schema = str_replace('PRAGMA foreign_keys = ON;', '-- PRAGMA removed for MySQL', $schema);
    // Split by semicolon and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $schema)));
    echo "<h2>Setting up database...</h2>";
    foreach ($statements as $statement) {
        if (!empty($statement) && !str_starts_with($statement, '--')) {
            try {
                $pdo->exec($statement);
                echo "✅ Executed: " . substr($statement, 0, 50) . "...<br>";
            } catch (PDOException $e) {
                echo "⚠️ Warning: " . $e->getMessage() . "<br>";
            }
        }
    }
    echo "<br><h3 style='color: green;'>✅ Database setup complete!</h3>";
    echo "<p><strong>IMPORTANT:</strong> Delete this file (setup_db.php) now for security!</p>";
    echo "<p>Your chat is ready at: <a href='index.html'>index.html</a></p>";  
} catch (Exception $e) {
    echo "<h3 style='color: red;'>❌ Error:</h3>";
    echo "<p>" . $e->getMessage() . "</p>";
    echo "<p>Please check your .env file and database credentials.</p>";
}
?>