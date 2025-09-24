<?php
// books_delete.php  — DELETE?id=...
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
header("Content-Type: application/json; charset=utf-8");

require __DIR__ . '/../../../../../api/config/db.php';

$id = isset($_GET['id']) ? trim($_GET['id']) : null;
if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }

try {
  $stmt = $pdo->prepare("DELETE FROM SACH WHERE TRIM(maS)=?");
  $stmt->execute([$id]);
  echo json_encode(['ok'=>true]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}