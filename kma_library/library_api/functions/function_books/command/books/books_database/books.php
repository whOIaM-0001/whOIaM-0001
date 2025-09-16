<?php
// books.php — CRUD API (GET list/item, POST create, PUT update, DELETE remove)
// Compatible with your db.php that exposes $pdo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../../../../../api/config/db.php'; // đảm bảo $pdo được tạo trong db.php

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? trim($_GET['id']) : null;

if (!isset($pdo) || !$pdo) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Database connection not available']);
  exit;
}

try {
  if ($method === 'GET') {
    if ($id) {
      $stmt = $pdo->prepare("SELECT TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong, TinhTrang FROM SACH WHERE TRIM(maS)=? LIMIT 1");
      $stmt->execute([$id]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) echo json_encode(['ok'=>true,'data'=>$row]);
      else { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); }
      exit;
    }

    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
    $qLike = '%' . $q . '%';
    $stmt = $pdo->prepare("SELECT TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong, TinhTrang
                           FROM SACH
                           WHERE TenS LIKE ? OR Tacgia LIKE ?
                           ORDER BY TenS
                           LIMIT 1000");
    $stmt->execute([$qLike, $qLike]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['ok'=>true,'data'=>$rows]);
    exit;
  }

  $input = json_decode(file_get_contents('php://input'), true) ?: [];

  if ($method === 'POST') {
    if (empty($input['maS']) || empty($input['TenS'])) {
      http_response_code(422);
      echo json_encode(['ok'=>false,'error'=>'maS và TenS bắt buộc']);
      exit;
    }
    $maS = trim($input['maS']);
    $TenS = trim($input['TenS']);

    // check duplicate maS
    $chk = $pdo->prepare("SELECT 1 FROM SACH WHERE TRIM(maS)=?");
    $chk->execute([$maS]);
    if ($chk->fetch()) {
      http_response_code(409);
      echo json_encode(['ok'=>false,'error'=>'maS đã tồn tại']);
      exit;
    }
    // check duplicate TenS
    $chk2 = $pdo->prepare("SELECT 1 FROM SACH WHERE TRIM(TenS)=?");
    $chk2->execute([$TenS]);
    if ($chk2->fetch()) {
      http_response_code(409);
      echo json_encode(['ok'=>false,'error'=>'TenS đã tồn tại']);
      exit;
    }

    $sql = "INSERT INTO SACH (maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong, TinhTrang) VALUES (?,?,?,?,?,?,?,?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
      $maS,
      $TenS,
      $input['MaTheLoai'] ?? null,
      $input['Tacgia'] ?? null,
      $input['NamXB'] ?? null,
      $input['MaNhaXuatBan'] ?? null,
      isset($input['SoLuong']) ? (int)$input['SoLuong'] : 1,
      $input['TinhTrang'] ?? 'Còn'
    ]);
    http_response_code(201);
    echo json_encode(['ok'=>true,'maS'=>$maS]);
    exit;
  }

  if ($method === 'PUT') {
    if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $fields = ['TenS','MaTheLoai','Tacgia','NamXB','MaNhaXuatBan','SoLuong','TinhTrang'];
    $sets = []; $vals = [];
    foreach ($fields as $f) if (isset($input[$f])) { $sets[] = "`$f` = ?"; $vals[] = $input[$f]; }
    if (empty($sets)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'No fields to update']); exit; }

    if (isset($input['TenS'])) {
      $newTen = trim($input['TenS']);
      $chk = $pdo->prepare("SELECT maS FROM SACH WHERE TRIM(TenS)=? LIMIT 1");
      $chk->execute([$newTen]);
      $row = $chk->fetch(PDO::FETCH_ASSOC);
      if ($row && trim($row['maS']) !== trim($id)) {
        http_response_code(409);
        echo json_encode(['ok'=>false,'error'=>'TenS đã tồn tại trên mã khác']);
        exit;
      }
    }

    $vals[] = $id;
    $sql = "UPDATE SACH SET " . implode(',', $sets) . " WHERE TRIM(maS)=?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);
    echo json_encode(['ok'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
    $stmt = $pdo->prepare("DELETE FROM SACH WHERE TRIM(maS)=?");
    $stmt->execute([$id]);
    echo json_encode(['ok'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok'=>false,'error'=>'Method not allowed']);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}