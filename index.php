<?php
// Set execution time limit (30 seconds)
set_time_limit(30);

// lightweight router - serves static if file exists (for built-in server)
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$full = __DIR__ . $path;

// If it's a static file that exists, let the server serve it
if ($path !== '/' && file_exists($full) && is_file($full)) {
    return false; // let built-in server serve the file
}

// Load Composer autoloader
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
}

// Load .env if available
if (class_exists('Dotenv\Dotenv') && file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
    $dotenv->safeLoad();
}

$omdbKey = $_ENV['OMDB_API_KEY'] ?? 'dea27012'; // Fallback to known key if missing

// Check if this is a valid route (only root path is valid for the SPA)
// If the path is not root and the file doesn't exist, show 404
if ($path !== '/' && !file_exists($full)) {
    // Send 404 header
    http_response_code(404);
    
    // Serve custom 404 page if it exists
    if (file_exists(__DIR__ . '/404.html')) {
        include __DIR__ . '/404.html';
    } else {
        echo "404 - Page Not Found";
    }
    exit();
}

// Serve index.html with injected key (only for root path)
if (file_exists(__DIR__ . '/index.html')) {
    $html = file_get_contents(__DIR__ . '/index.html');
    $injection = "<script>window.OMDB_API_KEY = '" . htmlspecialchars($omdbKey) . "';</script>";
    $html = str_replace('<head>', "<head>\n" . $injection, $html);
    echo $html;
} else {
    echo "Error: index.html not found.";
}
exit();
?>
