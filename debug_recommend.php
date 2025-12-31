<?php
// Simple debug version - shows raw output
header('Content-Type: text/plain');
echo "=== RECOMMEND.PHP DEBUG ===\n\n";
// 1. Check paths
$baseDir = __DIR__;
echo "Base directory: $baseDir\n\n";
$initLocal = $baseDir . '/../src/init.php';
$initProd = $baseDir . '/src/init.php';
echo "Checking for init.php:\n";
echo "  Local path ($initLocal): " . (file_exists($initLocal) ? "EXISTS" : "NOT FOUND") . "\n";
echo "  Prod path ($initProd): " . (file_exists($initProd) ? "EXISTS" : "NOT FOUND") . "\n\n";
// include init.php and capture output
echo "=== INCLUDING INIT.PHP ===\n";
ob_start();
if (file_exists($initLocal)) {
    require_once $initLocal;
    echo "Loaded from: $initLocal\n";
} elseif (file_exists($initProd)) {
    require_once $initProd;
    echo "Loaded from: $initProd\n";
}
$initOutput = ob_get_clean();
echo "Output from init.php:\n";
echo "---START---\n";
echo $initOutput;
echo "\n---END---\n\n";
// 3. Check if json_response function exists
echo "json_response function exists: " . (function_exists('json_response') ? "YES" : "NO") . "\n";
echo "env function exists: " . (function_exists('env') ? "YES" : "NO") . "\n\n";
// simple JSON response
echo "=== TESTING JSON RESPONSE ===\n";
ob_start();
$testData = ['status' => 'success', 'message' => 'Test JSON'];
echo json_encode($testData);
$jsonOutput = ob_get_clean();
echo "JSON output:\n";
echo $jsonOutput . "\n";
