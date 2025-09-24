<?php
// test_jwt.php — generate and verify a JWT using the same secret as auth_middleware.php
// Run via CLI:  C:\xampp\php\php.exe test_jwt.php  (from this folder)
// Or visit in browser: http://localhost/kma_library/library_api/api/config/test_jwt.php

require __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/auth_middleware.php';

use Firebase\JWT\JWT;

$secret_key = 'your_super_secret_key_12345'; // must match middleware/login
$now = time();
$exp = $now + 3600; // 1 hour

$payload = [
  'iss' => 'kma_library',
  'iat' => $now,
  'exp' => $exp,
  'data' => [
    'UserID' => 1,
    'Username' => 'Admin',
    'Email' => 'admin@gmail.com',
    'Role' => 'Admin'
  ]
];

$jwt = JWT::encode($payload, $secret_key, 'HS256');

// Try verifying using your middleware function
$decoded = verify_jwt_token($jwt);

header('Content-Type: text/plain; charset=utf-8');
echo "JWT (HS256):\n$jwt\n\n";
echo "Decoded payload via verify_jwt_token():\n";
print_r($decoded);
