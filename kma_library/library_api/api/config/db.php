<?php
// db.php — tạo PDO $pdo, dùng lại config.php
// config.php nằm ở library_api/api/config/config.php, nên đi lên 2 cấp rồi vào api/config
require __DIR__ . '/config.php';

try {
    $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, $DB_OPTIONS);
    // ensure utf8
    $pdo->exec("SET NAMES 'utf8'");
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>'DB connection failed: '.$e->getMessage()]);
    exit;
}