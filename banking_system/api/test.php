<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

echo json_encode([
    'success' => true,
    'message' => 'API is working!',
    'timestamp' => date('Y-m-d H:i:s'),
    'files_exist' => [
        'optimized_cccd.php' => file_exists(__DIR__ . '/optimized_cccd.php'),
        'optimized_credit_cards.php' => file_exists(__DIR__ . '/optimized_credit_cards.php')
    ]
]);
?>