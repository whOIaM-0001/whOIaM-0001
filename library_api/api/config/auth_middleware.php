<?php
// File: kma_library/api/config/auth_middleware.php

// Bạn cần cài đặt thư viện firebase/php-jwt
// Mở terminal trong thư mục kma_library, chạy lệnh:
// composer require firebase/php-jwt
// vendor nằm ở thư mục gốc kma_library, từ đây đi lên 3 cấp
require __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/config.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

// Lấy token từ header 'Authorization: Bearer <token>'
function get_bearer_token() {
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $auth_header = $headers['Authorization'];
        if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

// Hàm xác thực JWT và trả về payload nếu hợp lệ
function verify_jwt_token($jwt) {
    // Khóa bí mật được cấu hình chung
    $secret_key = JWT_SECRET;

    if (!$jwt) {
        return null;
    }

    try {
        $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
        // Chuyển object thành array để dễ sử dụng
        return (array) $decoded->data;
    } catch (ExpiredException $e) {
        // Token hết hạn
        return null;
    } catch (Exception $e) {
        // Token không hợp lệ (sai chữ ký, sai định dạng,...)
        return null;
    }
}

// Lấy JWT từ cookie với tên cấu hình
function get_jwt_cookie() {
    $name = defined('JWT_COOKIE_NAME') ? JWT_COOKIE_NAME : 'jwt';
    return $_COOKIE[$name] ?? null;
}