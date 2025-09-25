<?php
// books_create.php  — POST create
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . '/../../../../../api/config/auth_middleware.php';
require __DIR__ . '/../../../../../api/config/db.php';

// Auth: Admin/Librarian only
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian'], true)) { http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Forbidden']); exit; }

$input = json_decode(file_get_contents('php://input'), true) ?: [];

if (empty($input['maS']) || empty($input['TenS'])) {
  http_response_code(422);
  echo json_encode(['ok'=>false,'error'=>'maS và TenS bắt buộc']);
  exit;
}

try {
  $sql = "INSERT INTO SACH (maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong)
          VALUES (?,?,?,?,?,?,?)";
  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    $input['maS'],
    $input['TenS'],
    $input['MaTheLoai'] ?? null,
    $input['Tacgia'] ?? null,
    $input['NamXB'] ?? null,
    $input['MaNhaXuatBan'] ?? null,
    $input['SoLuong'] ?? 1,
    // $input['TinhTrang'] ?? 'Còn'
  ]);
  http_response_code(201);
  echo json_encode(['ok'=>true,'maS'=>$input['maS']]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}