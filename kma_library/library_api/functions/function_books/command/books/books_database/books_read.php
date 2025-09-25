<?php
// books_read.php  — GET list or single (TinhTrang tự tính theo SoLuong)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . '/../../../../../api/config/auth_middleware.php';
require __DIR__ . '/../../../../../api/config/db.php';

// Auth: allow Admin/Librarian/Reader for GET
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian','reader'], true)) { http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Forbidden']); exit; }

$id = isset($_GET['id']) ? trim($_GET['id']) : null;
$q  = isset($_GET['q']) ? trim($_GET['q']) : '';

try {
  if ($id) {
    $stmt = $pdo->prepare("
      SELECT
        TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong,
        CASE WHEN COALESCE(SoLuong,0) > 0 THEN 'Còn' ELSE 'Hết' END AS TinhTrang
      FROM SACH
      WHERE TRIM(maS)=?
      LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) echo json_encode(['ok'=>true,'data'=>$row]);
    else { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); }
    exit;
  }

  $qLike = '%' . $q . '%';
  $stmt = $pdo->prepare("
    SELECT
      TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong,
      CASE WHEN COALESCE(SoLuong,0) > 0 THEN 'Còn' ELSE 'Hết' END AS TinhTrang
    FROM SACH
    WHERE TenS LIKE ? OR Tacgia LIKE ?
    ORDER BY TenS
    LIMIT 500");
  $stmt->execute([$qLike, $qLike]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['ok'=>true,'data'=>$rows]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}