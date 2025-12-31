<?php
// backend/src/init.php

// Suppress any output from session_start
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// Check if vendor exists before requiring
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}

try {
    // Only load Dotenv if the class exists
    if (class_exists('Dotenv\Dotenv')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
        $dotenv->safeLoad();
    }
} catch (Exception $e) {
    // ignore if .env missing
}

function json_response($data, $code = 200) {
    header('Content-Type: application/json');
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function env($k, $default = null) {
    return $_ENV[$k] ?? getenv($k) ?? $default;
}