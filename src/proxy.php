// backend/public/proxy.php
// Fix paths for both local and production
$baseDir = __DIR__;
if (is_dir($baseDir . '/src')) {
    require_once $baseDir . '/src/init.php';
} else {
    require_once $baseDir . '/../src/init.php';
}
// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
$apiKey = env('OMDB_API_KEY');
if (!$apiKey) {
    json_response(['error' => 'Server configuration error: Missing OMDb API Key'], 500);
}
// Get query parameters
$t = $_GET['t'] ?? '';
$i = $_GET['i'] ?? '';
$s = $_GET['s'] ?? ''; // Search parameter
$y = $_GET['y'] ?? '';
$plot = $_GET['plot'] ?? 'short';
if (empty($t) && empty($i) && empty($s)) {
    json_response(['error' => 'Title, ID, or Search query is required'], 400);
}
// Build OMDb URL
$url = "http://www.omdbapi.com/?apikey=" . $apiKey;
if (!empty($t)) $url .= "&t=" . urlencode($t);
if (!empty($i)) $url .= "&i=" . urlencode($i);
if (!empty($s)) $url .= "&s=" . urlencode($s); // Add search support
if (!empty($y)) $url .= "&y=" . urlencode($y);
$url .= "&plot=" . urlencode($plot);
// Fetch from OMDb using cURL (more reliable than file_get_contents)
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
$response = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);
if ($response === false || $error) {
    json_response(['error' => 'Failed to fetch from OMDb: ' . $error], 500);
}
// Return raw response
echo $response;