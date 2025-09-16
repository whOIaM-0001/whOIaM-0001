<?php
// books_read.php  — GET list or single
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . '/../../../../../api/config/db.php';

$id = isset($_GET['id']) ? trim($_GET['id']) : null;
$q  = isset($_GET['q']) ? trim($_GET['q']) : '';

try {
  if ($id) {
    $stmt = $pdo->prepare("SELECT TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong, TinhTrang FROM SACH WHERE TRIM(maS)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) echo json_encode(['ok'=>true,'data'=>$row]);
    else { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); }
    exit;
  }

  $qLike = '%' . $q . '%';
  $stmt = $pdo->prepare("SELECT TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong, TinhTrang
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