<?php
// backend/public/setup_mysql.php
// Run this once to create the MySQL database and tables for XAMPP
error_reporting(E_ALL);
ini_set('display_errors', 1);
echo "<h2>MySQL Database Setup for Skillx Chat</h2>";
try {
    // First, connect without selecting a database to create it
    $pdo = new PDO('mysql:host=localhost', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p>✓ Connected to MySQL server</p>";
    // Read and execute the schema file
    $schemaFile = __DIR__ . '/../sql/schema-mysql.sql';
    if (!file_exists($schemaFile)) {
        throw new Exception("Schema file not found: $schemaFile");
    }
    $sql = file_get_contents($schemaFile);
    // Split by semicolons and execute each statement
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }
    echo "<p>✓ Database 'skillx_chat' created successfully</p>";
    echo "<p>✓ Tables created successfully</p>";
    // Verify tables exist
    $pdo->exec('USE skillx_chat');
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "<h3>Created Tables:</h3><ul>";
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";
    echo "<h3 style='color: green;'>✓ Setup Complete!</h3>";
    echo "<p>You can now use the chat application. <a href='index.html'>Go to Chat</a></p>";
} catch (PDOException $e) {
    echo "<p style='color: red;'>❌ Database Error: " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<h3>Troubleshooting:</h3>";
    echo "<ul>";
    echo "<li>Make sure XAMPP is running</li>";
    echo "<li>Make sure MySQL/MariaDB service is started in XAMPP Control Panel</li>";
    echo "<li>Check that your MySQL root password is empty (default for XAMPP)</li>";
    echo "</ul>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}