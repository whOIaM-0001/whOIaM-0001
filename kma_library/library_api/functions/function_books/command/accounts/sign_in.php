<?php
// KMA Library - Auth endpoint
// File: library_api/functions/function_books/command/accounts/sign_in.php

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_name('PHPSESSID');
  session_start();
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

function json_out(int $code, array $data): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

// GET /?action=me  -> trả user nếu đã đăng nhập
if ($method === 'GET' && $action === 'me') {
  if (!empty($_SESSION['user']) && is_array($_SESSION['user'])) {
    json_out(200, ['ok' => true, 'user' => $_SESSION['user']]);
  } else {
    // 401 là đúng chuẩn; nếu muốn tránh “màu đỏ” có thể đổi thành 200 với ok:false
    json_out(401, ['ok' => false, 'error' => 'Not signed in']);
  }
}

// GET /?action=logout -> xóa session
if ($method === 'GET' && $action === 'logout') {
  // Xóa dữ liệu phiên
  $_SESSION = [];
  if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $params['path'] ?: '/', $params['domain'] ?: '', false, true);
  }
  session_destroy();
  json_out(200, ['ok' => true]);
}

// POST / (login)
if ($method === 'POST') {
  $raw = file_get_contents('php://input');
  $in = json_decode($raw, true) ?: [];
  $email = trim((string)($in['email'] ?? ''));
  $password = (string)($in['password'] ?? '');
  $remember = !empty($in['remember']);

  // TODO: Thay bằng kiểm tra DB thực tế của bạn
  // Ví dụ tối thiểu: chỉ cho phép @gmail.com và pass bất kỳ != rỗng
  if (!preg_match('/^[a-zA-Z0-9._%+\-]+@gmail\.com$/i', $email)) {
    json_out(400, ['ok' => false, 'error' => 'Email must end with @gmail.com']);
  }
  if ($password === '' || preg_match('/\s/', $password)) {
    json_out(400, ['ok' => false, 'error' => 'Invalid password']);
  }

  // Giả sử xác thực OK -> tạo thông tin user
  // Thực tế bạn hãy lấy id, name từ DB
  $user = [
    'id' => 1,
    'email' => $email,
    'name' => strstr($email, '@', true),
    'role' => 'user'
  ];

  // Lưu vào session
  $_SESSION['user'] = $user;

  // "Remember me": gia hạn cookie phiên 30 ngày
  if ($remember) {
    $params = session_get_cookie_params();
    setcookie(session_name(), session_id(), [
      'expires'  => time() + 60 * 60 * 24 * 30,
      'path'     => $params['path'] ?: '/',
      'domain'   => $params['domain'] ?: '',
      'secure'   => false,    // nếu có HTTPS thì đặt true
      'httponly' => true,
      'samesite' => 'Lax'
    ]);
  }

  json_out(200, ['ok' => true, 'user' => $user]);
}

// Mặc định: 404
json_out(404, ['ok' => false, 'error' => 'Not found']);