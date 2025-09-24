<?php
// api/categories.php
require __DIR__ . '/../../../../../api/config/config.php';
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? trim($_GET['id']) : null;

try {
  $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, $DB_OPTIONS);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
  exit;
}

if ($method === 'GET') {
  if ($id) {
    $stmt = $pdo->prepare("SELECT MaTheLoai, TenTheLoai FROM quanlytheloai WHERE TRIM(MaTheLoai)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) echo json_encode(['ok'=>true,'data'=>$row]);
    else { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); }
    exit;
  }
  $q = isset($_GET['q']) ? "%{$_GET['q']}%" : '%';
  $stmt = $pdo->prepare("SELECT MaTheLoai, TenTheLoai FROM quanlytheloai WHERE TenTheLoai LIKE ? OR MaTheLoai LIKE ? ORDER BY TenTheLoai");
  $stmt->execute([$q,$q]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['ok'=>true,'data'=>$rows]);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

if ($method === 'POST') {
  if (empty($input['MaTheLoai']) || empty($input['TenTheLoai'])) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'MaTheLoai và TenTheLoai bắt buộc']);
    exit;
  }
  // check duplicate
  $chk = $pdo->prepare("SELECT 1 FROM quanlytheloai WHERE TRIM(MaTheLoai)=?");
  $chk->execute([trim($input['MaTheLoai'])]);
  if ($chk->fetch()) {
    http_response_code(409);
    echo json_encode(['ok'=>false,'error'=>'MaTheLoai đã tồn tại']);
    exit;
  }
  $stmt = $pdo->prepare("INSERT INTO quanlytheloai (MaTheLoai, TenTheLoai) VALUES (?,?)");
  $stmt->execute([ $input['MaTheLoai'], $input['TenTheLoai'] ]);
  http_response_code(201);
  echo json_encode(['ok'=>true,'MaTheLoai'=>$input['MaTheLoai']]);
  exit;
}

if ($method === 'PUT') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  $fields = ['TenTheLoai'];
  $sets = []; $vals = [];
  foreach ($fields as $f) if (isset($input[$f])) { $sets[] = "`$f` = ?"; $vals[] = $input[$f]; }
  if (empty($sets)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'No fields to update']); exit; }
  $vals[] = $id;
  $sql = "UPDATE quanlytheloai SET " . implode(',', $sets) . " WHERE TRIM(MaTheLoai)=?";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($vals);
  echo json_encode(['ok'=>true]);
  exit;
}

if ($method === 'DELETE') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  $stmt = $pdo->prepare("DELETE FROM quanlytheloai WHERE TRIM(MaTheLoai)=?");
  $stmt->execute([$id]);
  echo json_encode(['ok'=>true]);
  exit;
}

http_response_code(405);
echo json_encode(['ok'=>false,'error'=>'Method not allowed']);
