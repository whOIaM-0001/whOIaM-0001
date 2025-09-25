<?php
// api/publishers.php
require __DIR__ . '/../../../../../api/config/config.php';
require __DIR__ . '/../../../../../api/config/auth_middleware.php';
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? trim($_GET['id']) : null;
$isWrite = in_array($method, ['POST','PUT','DELETE'], true);
if ($isWrite && !in_array($role, ['admin','librarian'], true)) { http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Forbidden']); exit; }

try {
  $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, $DB_OPTIONS);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
  exit;
}

// Auth: allow Reader/Admin/Librarian for GET; restrict POST/PUT/DELETE to Admin/Librarian
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Unauthorized']); exit; }
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));

if ($method === 'GET') {
  if ($id) {
    $stmt = $pdo->prepare("SELECT MaNhaXuatBan, TenNhaXuatBan, DiaChi, SoDienThoai FROM quanlynhaxb WHERE TRIM(MaNhaXuatBan)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) echo json_encode(['ok'=>true,'data'=>$row]);
    else { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); }
    exit;
  }
  $q = isset($_GET['q']) ? "%{$_GET['q']}%" : '%';
  $stmt = $pdo->prepare("SELECT MaNhaXuatBan, TenNhaXuatBan, DiaChi, SoDienThoai FROM quanlynhaxb WHERE TenNhaXuatBan LIKE ? OR MaNhaXuatBan LIKE ? ORDER BY TenNhaXuatBan");
  $stmt->execute([$q,$q]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['ok'=>true,'data'=>$rows]);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

if ($method === 'POST') {
  if (empty($input['MaNhaXuatBan']) || empty($input['TenNhaXuatBan'])) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'MaNhaXuatBan và TenNhaXuatBan bắt buộc']);
    exit;
  }
  // check duplicate
  $chk = $pdo->prepare("SELECT 1 FROM quanlynhaxb WHERE TRIM(MaNhaXuatBan)=?");
  $chk->execute([trim($input['MaNhaXuatBan'])]);
  if ($chk->fetch()) {
    http_response_code(409);
    echo json_encode(['ok'=>false,'error'=>'MaNhaXuatBan đã tồn tại']);
    exit;
  }
  $stmt = $pdo->prepare("INSERT INTO quanlynhaxb (MaNhaXuatBan, TenNhaXuatBan, DiaChi, SoDienThoai) VALUES (?,?,?,?)");
  $stmt->execute([
    $input['MaNhaXuatBan'],
    $input['TenNhaXuatBan'],
    $input['DiaChi'] ?? null,
    $input['SoDienThoai'] ?? null
  ]);
  http_response_code(201);
  echo json_encode(['ok'=>true,'MaNhaXuatBan'=>$input['MaNhaXuatBan']]);
  exit;
}

if ($method === 'PUT') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  $fields = ['TenNhaXuatBan','DiaChi','SoDienThoai'];
  $sets = []; $vals = [];
  foreach ($fields as $f) if (isset($input[$f])) { $sets[] = "`$f` = ?"; $vals[] = $input[$f]; }
  if (empty($sets)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'No fields to update']); exit; }
  $vals[] = $id;
  $sql = "UPDATE quanlynhaxb SET " . implode(',', $sets) . " WHERE TRIM(MaNhaXuatBan)=?";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($vals);
  echo json_encode(['ok'=>true]);
  exit;
}

if ($method === 'DELETE') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  $stmt = $pdo->prepare("DELETE FROM quanlynhaxb WHERE TRIM(MaNhaXuatBan)=?");
  $stmt->execute([$id]);
  echo json_encode(['ok'=>true]);
  exit;
}

http_response_code(405);
echo json_encode(['ok'=>false,'error'=>'Method not allowed']);