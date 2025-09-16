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