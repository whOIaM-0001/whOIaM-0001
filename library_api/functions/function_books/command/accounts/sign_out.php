<?php
// file: kma_library/library_api/functions/function_books/command/accounts/sign_out.php
// Endpoint đăng xuất: xóa cookie JWT và trả về JSON ok

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

require_once __DIR__ . '/../../../../api/config/config.php';

function json_out(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') {
    json_out(405, ['ok'=>false,'error'=>'Method Not Allowed']);
}

// Xóa cookie bằng cách set expires trong quá khứ với đúng thuộc tính cookie
$cookieName = defined('JWT_COOKIE_NAME') ? JWT_COOKIE_NAME : 'jwt';
setcookie($cookieName, '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => defined('JWT_COOKIE_SECURE') ? JWT_COOKIE_SECURE : false,
    'httponly' => true,
    'samesite' => defined('JWT_COOKIE_SAMESITE') ? JWT_COOKIE_SAMESITE : 'Lax',
]);

json_out(200, ['ok'=>true, 'message'=>'Signed out']);
?>
