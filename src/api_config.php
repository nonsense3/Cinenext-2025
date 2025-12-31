<?php
// backend/src/api_config.php
// Manual API Keys for InfinityFree (or where .env fails)
// Only define if not already defined (though usually this loads before env checks)
if (!defined('GEMINI_API_KEY')) {
    define('GEMINI_API_KEY', 'AIzaSyDO7AMalkzRoZGfbd9G7H0JMW2d6vaHR18');
}
if (!defined('OMDB_API_KEY')) {
    define('OMDB_API_KEY', 'dea27012');
}
