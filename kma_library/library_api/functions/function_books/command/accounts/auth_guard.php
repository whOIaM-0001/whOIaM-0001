<?php
// File: auth_guard.php
// *** PHIÊN BẢN NÂNG CẤP: Chấp nhận cả Token (cho di động) và Session (cho web) ***

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('PHPSESSID');
    session_start();
}

if (!defined('JWT_SECRET')) {
    // Chuỗi bí mật này PHẢI GIỐNG HỆT với chuỗi trong file sign_in.php
    define('JWT_SECRET', 'day-la-chuoi-bi-mat-cua-ban-hay-thay-doi-no-123456');
}

function json_out_auth_error(int $code, string $error): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

function get_user_from_token(): ?array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        $token = $matches[1];
    } else {
        return null;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header_encoded, $payload_encoded, $signature_encoded] = $parts;
    $signature_check = hash_hmac('sha256', "$header_encoded.$payload_encoded", JWT_SECRET, true);
    $signature_check_encoded = rtrim(strtr(base64_encode($signature_check), '+/', '-_'), '=');

    if (!hash_equals($signature_check_encoded, $signature_encoded)) return null;

    $payload = json_decode(base64url_decode($payload_encoded), true);
    if ($payload === null || (isset($payload['exp']) && $payload['exp'] < time())) {
        return null;
    }
    return $payload;
}

// --- LOGIC BẢO VỆ MỚI ---

// 1. Ưu tiên kiểm tra Token trước (dành cho app di động)
$currentUser = get_user_from_token();

// 2. Nếu không có Token, kiểm tra Session (dành cho trang web)
if ($currentUser === null) {
    if (!empty($_SESSION['user']) && is_array($_SESSION['user'])) {
        $currentUser = $_SESSION['user'];
    }
}

// 3. Nếu cả hai đều không có, từ chối truy cập
if ($currentUser === null) {
    json_out_auth_error(401, 'Unauthorized: Access requires a valid token or an active session.');
}

// (Tùy chọn) Kiểm tra quyền Admin/Thủ thư
// $allowed_roles = ['Admin', 'Librarian'];
// if (!isset($currentUser['role']) || !in_array($currentUser['role'], $allowed_roles, true)) {
//     json_out_auth_error(403, 'Forbidden: You do not have permission to access this resource.');
// }

?>