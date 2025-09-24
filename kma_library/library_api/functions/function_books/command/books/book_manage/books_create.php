<?php
// books_create.php  — POST create
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . '/../../../../../api/config/db.php';

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