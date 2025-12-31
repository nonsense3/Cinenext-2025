<?php
// backend/src/funny_names.php
// Generates funny random usernames based on IP address
function generateFunnyUsername($ipAddress) {
    // Lists of funny adjectives and nouns
    $adjectives = [
        'Sneaky', 'Dizzy', 'Funky', 'Wacky', 'Silly', 'Goofy', 'Crazy', 'Lazy',
        'Bouncy', 'Fluffy', 'Grumpy', 'Happy', 'Sleepy', 'Jumpy', 'Clumsy', 'Nerdy',
        'Quirky', 'Sassy', 'Spicy', 'Fancy', 'Jolly', 'Mighty', 'Tiny', 'Giant',
        'Swift', 'Slow', 'Loud', 'Quiet', 'Brave', 'Shy', 'Wild', 'Calm',
        'Sparkly', 'Shiny', 'Rusty', 'Golden', 'Silver', 'Purple', 'Rainbow', 'Cosmic',
        'Electric', 'Frozen', 'Blazing', 'Dancing', 'Flying', 'Swimming', 'Hopping', 'Rolling'
    ];
    $nouns = [
        'Potato', 'Banana', 'Pickle', 'Muffin', 'Waffle', 'Pancake', 'Cookie', 'Donut',
        'Penguin', 'Llama', 'Unicorn', 'Dragon', 'Ninja', 'Pirate', 'Robot', 'Wizard',
        'Panda', 'Koala', 'Narwhal', 'Octopus', 'Jellyfish', 'Hamster', 'Squirrel', 'Raccoon',
        'Taco', 'Burrito', 'Pizza', 'Sushi', 'Noodle', 'Dumpling', 'Pretzel', 'Bagel',
        'Thunder', 'Lightning', 'Comet', 'Meteor', 'Galaxy', 'Nebula', 'Asteroid', 'Planet',
        'Cactus', 'Mushroom', 'Pineapple', 'Coconut', 'Avocado', 'Broccoli', 'Carrot', 'Tomato',
        'Bubble', 'Sparkle', 'Glitter', 'Rocket', 'Satellite', 'Spaceship', 'UFO', 'Alien'
    ];
    // Use IP address as seed for consistent names per IP
    $seed = crc32($ipAddress);    
    // Generate indices based on seed
    $adjIndex = $seed % count($adjectives);
    $nounIndex = ($seed * 7) % count($nouns);
    // Generate a number based on IP (last 2-3 digits)
    $number = ($seed % 900) + 100;
    return $adjectives[$adjIndex] . $nouns[$nounIndex] . $number;
}
function getUserIP() {
    // Check for various proxy headers
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }   
    // If multiple IPs (proxy chain), take the first one
    if (strpos($ip, ',') !== false) {
        $ip = trim(explode(',', $ip)[0]);
    }
    return $ip;
}