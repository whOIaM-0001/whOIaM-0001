<?php
// file: kma_library/library_api/functions/function_books/command/accounts/sign_in.php
// API đăng nhập + endpoint me sử dụng JWT. Tích hợp với auth_guard.js (cookie jwt) và PHP-JWT.

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// CORS: nếu cùng origin (khuyến nghị), có thể không cần dòng sau. Để an toàn cho OPTIONS:
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

// Cấu hình JWT + include middleware (đã autoload PHP-JWT)
require_once __DIR__ . '/../../../../api/config/auth_middleware.php'; // cung cấp verify_jwt_token(), get_bearer_token(), get_jwt_cookie()
use Firebase\JWT\JWT;

// Đọc cấu hình JWT chung
$secret_key = JWT_SECRET;
$issuer_claim = JWT_ISSUER;
$audience_claim = JWT_AUDIENCE;

// Helper JSON
function json_out(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Endpoint `GET ?action=me` — xác thực từ Authorization: Bearer <jwt> hoặc cookie `jwt`
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
if ($method === 'GET' && $action === 'me') {
    $jwt = get_bearer_token();
    if (!$jwt) $jwt = get_jwt_cookie();
    $data = verify_jwt_token($jwt);
    if (!$data) json_out(401, ['ok'=>false,'error'=>'Unauthorized']);
    // Chuẩn hóa field names cho frontend
    $user = [
        'UserID'  => $data['UserID'] ?? ($data['id'] ?? null),
        'Username'=> $data['Username'] ?? ($data['name'] ?? null),
        'Email'   => $data['Email'] ?? ($data['email'] ?? null),
        'Role'    => $data['Role'] ?? ($data['role'] ?? null),
    ];
    json_out(200, ['ok'=>true, 'user'=>$user]);
}

// Đăng nhập: POST { email, password } → trả về token và set cookie jwt (HttpOnly)
if ($method !== 'POST') {
    json_out(405, ['ok'=>false,'error'=>'Method Not Allowed']);
}

$raw = file_get_contents('php://input');
$in = json_decode($raw, true) ?: [];
$email = trim((string)($in['email'] ?? ''));
$password = (string)($in['password'] ?? '');
if ($email === '' || $password === '') json_out(400, ['ok'=>false,'error'=>'Missing email or password']);

// Kết nối DB (dùng cấu hình chung)
require_once __DIR__ . '/../../../../api/config/db.php';

// Bảng accounts: UserID, Username, Email, PasswordHash(SHA-256), Role
$st = $pdo->prepare('SELECT UserID, Username, Email, PasswordHash, Role FROM accounts WHERE Email = :e LIMIT 1');
$st->execute([':e'=>$email]);
$acc = $st->fetch(PDO::FETCH_ASSOC);
if (!$acc) json_out(401, ['ok'=>false,'error'=>'Invalid email or password']);

// Kiểm tra mật khẩu SHA-256 (theo Librarians_crud.php)
$hash = hash('sha256', $password);
if (!hash_equals($acc['PasswordHash'], $hash)) {
    json_out(401, ['ok'=>false,'error'=>'Invalid email or password']);
}

// Tạo JWT
$issued_at = time();
$expiration_time = $issued_at + 24*60*60; // 24h
$payload = [
    'iss' => $issuer_claim,
    'aud' => $audience_claim,
    'iat' => $issued_at,
    'exp' => $expiration_time,
    'data' => [
        'UserID'  => (int)$acc['UserID'],
        'Username'=> $acc['Username'],
        'Email'   => $acc['Email'],
        'Role'    => $acc['Role'],
    ]
];
$jwt = JWT::encode($payload, $secret_key, 'HS256');

// Set cookie jwt (HttpOnly) để auth_guard.js có thể dùng credentials: 'include'
setcookie(JWT_COOKIE_NAME, $jwt, [
    'expires'  => $expiration_time,
    'path'     => '/',
    'secure'   => JWT_COOKIE_SECURE, // true nếu dùng HTTPS
    'httponly' => true,
    'samesite' => JWT_COOKIE_SAMESITE,
]);

json_out(200, [
    'ok' => true,
    'message' => 'Login successful',
    'token' => $jwt,
    'user' => [
        'UserID'=>(int)$acc['UserID'], 'Username'=>$acc['Username'], 'Email'=>$acc['Email'], 'Role'=>$acc['Role']
    ]
]);