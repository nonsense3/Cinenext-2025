<?php
$isLocal = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8000', '127.0.0.1:8000']);
if (!$isLocal) {
    define('DB_HOST', 'sql105.infinityfree.com'); 
    define('DB_NAME', 'if0_40486850_cinenext');   
    define('DB_USER', 'if0_40486850');            
    define('DB_PASS', 'Ankadey2006');             
    define('DB_DSN', 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4');
}