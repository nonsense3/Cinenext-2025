<?php
/**
 * Creates SQLite DB and loads schema.sql
 */
$dbFile = __DIR__ . "/data.sqlite";
$schemaFile = __DIR__ . "/sql/schema-sqlite.sql";
// Delete old DB if exists
if (file_exists($dbFile)) {
    unlink($dbFile);
    echo "Old database removed.\n";
}
try {
    // Create / open SQLite DB
    $db = new PDO("sqlite:" . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "SQLite database created: $dbFile\n";
    // Load schema file
    if (!file_exists($schemaFile)) {
        die("Schema file not found: $schemaFile\n");
    }
    $schema = file_get_contents($schemaFile);
    $db->exec($schema);
    echo "Schema successfully installed.\n";
    echo "DONE.\n";
} catch (Exception $e) {
    die("ERROR: " . $e->getMessage());
}