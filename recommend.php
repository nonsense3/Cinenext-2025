<?php
// backend/public/recommend.php
// CRITICAL: Completely disable ALL error output to prevent HTML in JSON
error_reporting(0);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('html_errors', '0');
// Start output buffering to catch any stray output
ob_start();
// Dynamic path resolution for local vs production
$baseDir = __DIR__;
$initPath = '';
$apiConfigPath = '';
if (file_exists($baseDir . '/../src/init.php')) {
    // Local: public/recommend.php -> src/init.php
    $initPath = $baseDir . '/../src/init.php';
    $apiConfigPath = $baseDir . '/../src/api_config.php';
} elseif (file_exists($baseDir . '/src/init.php')) {
    // Production: htdocs/recommend.php -> htdocs/src/init.php
    $initPath = $baseDir . '/src/init.php';
    $apiConfigPath = $baseDir . '/src/api_config.php';
} else {
    // Fatal error - can't find init.php
    ob_end_clean(); // Clear any buffered output
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: init.php not found']);
    exit;
}
require_once $initPath;
// Clear any output from init.php
ob_end_clean();
// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}
// Get input
$input = json_decode(file_get_contents('php://input'), true);
$title = $input['title'] ?? 'random';
$year = $input['year'] ?? '';
// 1. Get API Keys
if (file_exists($apiConfigPath)) {
    require_once $apiConfigPath;
}
$geminiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : env('GEMINI_API_KEY');
$omdbKey = defined('OMDB_API_KEY') ? OMDB_API_KEY : env('OMDB_API_KEY');
if (!$geminiKey || !$omdbKey) {
    json_response(['error' => 'Missing API Keys in .env'], 500);
}
// Helper to fetch from OMDb via cURL
function fetchOmdb($t, $y = '', $k) {
    $url = "http://www.omdbapi.com/?t=" . urlencode($t) . "&apikey=" . $k;
    if (!empty($y)) $url .= "&y=" . $y;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $res = curl_exec($ch);
    curl_close($ch);
    return json_decode($res, true);
}
// 2. Fetch Source Movie from OMDb
$omdbData = null;
if ($title === 'random') {
    $picks = ["The Shawshank Redemption", "Inception", "Pulp Fiction", "3 Idiots", "Interstellar", "The Dark Knight", "Parasite", "Spirited Away"];
    $pick = $picks[array_rand($picks)];
    $omdbData = fetchOmdb($pick, '', $omdbKey);
} else {
    $omdbData = fetchOmdb($title, $year, $omdbKey);
}
if (!$omdbData || (isset($omdbData['Response']) && $omdbData['Response'] === 'False')) {
    json_response(['error' => 'Movie not found on OMDb', 'details' => $omdbData], 404);
}
// Prepare movie object for Gemini
$movie = [
    'title' => $omdbData['Title'] ?? '',
    'year' => $omdbData['Year'] ?? '',
    'runtime' => $omdbData['Runtime'] ?? '',
    'genre' => $omdbData['Genre'] ?? '',
    'director' => $omdbData['Director'] ?? '',
    'actors' => $omdbData['Actors'] ?? '',
    'plot' => $omdbData['Plot'] ?? '',
    'language' => $omdbData['Language'] ?? '',
    'country' => $omdbData['Country'] ?? '',
    'awards' => $omdbData['Awards'] ?? '',
    'ratings' => $omdbData['Ratings'] ?? [],
    'imdbRating' => $omdbData['imdbRating'] ?? '',
    'poster' => ($omdbData['Poster'] && $omdbData['Poster'] !== 'N/A') ? $omdbData['Poster'] : 'https://placehold.co/300x450?text=No+Poster'
];
// 3. Build Prompt for Gemini
$prompt = "
You are an expert movie recommender. Based on the following movie details (from OMDb), provide:
1) A short natural-language recommendation summary (2-3 sentences) saying who will like it.
2) 6 recommended movies similar in tone/genre/themes - for each: title, year, 1-line explanation why it's similar.
3) 3 quick \"watch next\" suggestions ordered: (a) if user liked the story; (b) if user liked the visuals; (c) if user liked the performances.
4) 1 short tagline we can display on the card (max 8 words).

Here is the OMDb data:
" . json_encode($movie, JSON_PRETTY_PRINT) . "

Respond in JSON with keys: \"summary\", \"recommendations\" (array of {title, year, reason}), \"watch_next\" (array of {reason_type, title, short_reason}), \"tagline\".
Do not include markdown formatting.
";
// 4. Call Gemini API
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $geminiKey;
$data = [
    "contents" => [
        [
            "parts" => [
                ["text" => $prompt]
            ]
        ]
    ]
];
$ch = curl_init($geminiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Fix for Windows local dev
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);
if ($httpCode !== 200) {
    // Return actual error for debugging
    $errorMsg = 'Gemini API Error';
    $details = json_decode($response, true);
    if (isset($details['error']['message'])) {
        $errorMsg .= ': ' . $details['error']['message'];
    } else {
        $errorMsg .= ' (HTTP ' . $httpCode . ')';
    }
    json_response(['error' => $errorMsg, 'details' => $response, 'http_code' => $httpCode], 500);
}
$geminiData = json_decode($response, true);
$aiText = $geminiData['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
// Clean up markdown if present
$aiText = str_replace(['```json', '```'], '', $aiText);
$aiParsed = json_decode($aiText, true);
if (!$aiParsed) {
    json_response(['error' => 'Failed to parse AI response', 'raw_text' => $aiText], 500);
}
// 5. Fetch Posters for Recommendations (Sequential cURL)
if (isset($aiParsed['recommendations']) && is_array($aiParsed['recommendations'])) {
    foreach ($aiParsed['recommendations'] as &$rec) {
        $d = fetchOmdb($rec['title'], $rec['year'] ?? '', $omdbKey);
        if ($d && isset($d['Poster']) && $d['Poster'] !== 'N/A') {
            $rec['poster'] = $d['Poster'];
        } else {
            $rec['poster'] = null;
        }
    }
}
// 5. Return Combined Response
// Start fresh output buffer for final JSON
ob_start();
json_response([
    'movie' => $movie,
    'ai' => $aiParsed
]);
$finalOutput = ob_get_clean();
// Clear any previous output and send only JSON
while (ob_get_level()) {
    ob_end_clean();
}
echo $finalOutput;