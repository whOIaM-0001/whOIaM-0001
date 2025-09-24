<?php
// config.php — chỉnh nếu cần
$DB_HOST = '127.0.0.1';
$DB_NAME = 'kma_library';
$DB_USER = 'root';
$DB_PASS = ''; // XAMPP mặc định thường để trống

$DB_DSN = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";
$DB_OPTIONS = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

// JWT cấu hình chung — sử dụng cho sign_in, middleware, v.v.
if (!defined('JWT_SECRET')) define('JWT_SECRET', 'your_super_secret_key_12345');
if (!defined('JWT_ISSUER')) define('JWT_ISSUER', 'kma_library');
if (!defined('JWT_AUDIENCE')) define('JWT_AUDIENCE', 'kma_library_web');
if (!defined('JWT_COOKIE_NAME')) define('JWT_COOKIE_NAME', 'jwt');
// true nếu chạy HTTPS (khuyến nghị bật trên môi trường production)
if (!defined('JWT_COOKIE_SECURE')) define('JWT_COOKIE_SECURE', false);
// Lax là hợp lý cho cookie đăng nhập cơ bản
if (!defined('JWT_COOKIE_SAMESITE')) define('JWT_COOKIE_SAMESITE', 'Lax');