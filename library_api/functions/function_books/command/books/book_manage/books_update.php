<?php
// books_update.php  — PUT update?id=...
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . '/../../../../../api/config/db.php';

$id = isset($_GET['id']) ? trim($_GET['id']) : null;
if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }

$input = json_decode(file_get_contents('php://input'), true) ?: [];

$fields = ['TenS','MaTheLoai','Tacgia','NamXB','MaNhaXuatBan','SoLuong','TinhTrang'];
$sets = []; $vals = [];
foreach ($fields as $f) if (isset($input[$f])) { $sets[] = "`$f` = ?"; $vals[] = $input[$f]; }

if (empty($sets)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'No fields to update']); exit; }

$vals[] = $id;
$sql = "UPDATE SACH SET " . implode(',', $sets) . " WHERE TRIM(maS)=?";

try {
  $stmt = $pdo->prepare($sql);
  $stmt->execute($vals);
  echo json_encode(['ok'=>true]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}