<?php
declare(strict_types=1);

// CORS + JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

function out(int $code, array $data){ http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

// ------- Locate config robustly -------
$attempts = [];
$foundAuth = false; $foundDb = false;
for ($i=1; $i<=8; $i++) {
  $base = dirname(__DIR__, $i);
  $auth = $base . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'auth_middleware.php';
  $db   = $base . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'db.php';
  $attempts[] = $auth; $attempts[] = $db;
  if (!$foundAuth && is_file($auth)) { require_once $auth; $foundAuth = true; }
  if (!$foundDb   && is_file($db))   { require_once $db;   $foundDb   = true; }
  if ($foundAuth && $foundDb) break;
}
if (!$foundAuth || !$foundDb) {
  $docroot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', "/\\");
  if ($docroot) {
    $auth2 = $docroot . '/kma_library/api/config/auth_middleware.php';
    $db2   = $docroot . '/kma_library/api/config/db.php';
    $attempts[] = $auth2; $attempts[] = $db2;
    if (!$foundAuth && is_file($auth2)) { require_once $auth2; $foundAuth = true; }
    if (!$foundDb   && is_file($db2))   { require_once $db2;   $foundDb   = true; }
  }
}
if (!$foundAuth || !$foundDb) out(500, ['ok'=>false,'error'=>'Không tìm thấy file cấu hình (auth/db)','attempts'=>$attempts]);
if (!isset($pdo) || !$pdo) out(500, ['ok'=>false,'error'=>'Database connection not available']);

// ------- Auth: allow Admin/Librarian/Reader -------
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) out(401, ['ok'=>false,'error'=>'Unauthorized']);
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian','reader'], true)) out(403, ['ok'=>false,'error'=>'Forbidden']);

// ------- Helpers to detect table/columns -------
function current_db(PDO $pdo): string {
  $db = $pdo->query("SELECT DATABASE()")->fetchColumn();
  return (string)$db;
}
function find_books_table(PDO $pdo, string $schema): ?string {
  $preferred = ['books','Books','book','Book','sach','Sach','books_table','tbl_books'];
  foreach ($preferred as $t) {
    $st = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?");
    $st->execute([$schema, $t]);
    if ((int)$st->fetchColumn() > 0) return $t;
  }
  $codeCols = ['maS','MaS','MaSach','maSach','masach','code','Code'];
  $nameCols = ['TenS','tenS','TenSach','tenSach','tensach','name','Name','ten'];
  $inA = implode(',', array_fill(0, count($codeCols), '?'));
  $inB = implode(',', array_fill(0, count($nameCols), '?'));
  $sqlA = "SELECT DISTINCT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA=? AND COLUMN_NAME IN ($inA)";
  $stA = $pdo->prepare($sqlA);
  $stA->execute(array_merge([$schema], $codeCols));
  $tablesA = $stA->fetchAll(PDO::FETCH_COLUMN);
  if (!$tablesA) return null;
  $sqlB = "SELECT DISTINCT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA=? AND COLUMN_NAME IN ($inB)";
  $stB = $pdo->prepare($sqlB);
  $stB->execute(array_merge([$schema], $nameCols));
  $tablesB = $stB->fetchAll(PDO::FETCH_COLUMN);
  $candidates = array_values(array_intersect($tablesA, $tablesB));
  return $candidates[0] ?? null;
}
function pick(array $row, array $keys) {
  foreach ($keys as $k) {
    if (array_key_exists($k, $row) && $row[$k] !== null) return $row[$k];
  }
  return null;
}

try {
  $schema = current_db($pdo);
  $table  = find_books_table($pdo, $schema);
  if (!$table) out(500, ['ok'=>false,'error'=>"Không tìm thấy bảng sách trong schema `$schema`"]);

  $sql = "SELECT * FROM `$table` ORDER BY 1";
  $st = $pdo->query($sql);

  $items = [];
  while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    // Chuẩn hóa về đúng khóa mà app Android đang @SerializedName
    $code      = pick($row, ['maS','MaS','MaSach','maSach','masach','code','Code']);
    $name      = pick($row, ['TenS','tenS','TenSach','tenSach','tensach','name','Name','ten']);
    $maTL      = pick($row, ['MaTheLoai','maTheLoai','MaTL','maTL','TheLoai','theLoai']);
    $tacgia    = pick($row, ['Tacgia','TacGia','tacgia','tac_gia','Tac_gia']);
    $namXB     = pick($row, ['NamXB','namXB','NamXb','namXb','Nam','nam','Year','year']);
    $maNXB     = pick($row, ['MaNhaXuatBan','maNhaXuatBan','MaNXB','maNXB','NhaXuatBan','nhaXuatBan']);
    $soLuong   = pick($row, ['SoLuong','soluong','so_luong','SL','sl']);
    $tinhTrang = pick($row, ['TinhTrang','tinhtrang','tinh_trang','Status','status']);

    // Phòng hờ nếu vẫn null: lấy cột 1, 2 làm code/name
    if ($code === null) { $keys = array_keys($row); $code = $row[$keys[0]] ?? null; }
    if ($name === null) { $keys = array_keys($row); $name = $row[$keys[1] ?? $keys[0] ?? ''] ?? null; }

    $items[] = [
      'maS'            => $code,
      'TenS'           => $name,
      'MaTheLoai'      => $maTL,
      'Tacgia'         => $tacgia,
      'NamXB'          => $namXB,
      'MaNhaXuatBan'   => $maNXB,
      'SoLuong'        => $soLuong !== null ? (int)$soLuong : null,
      'TinhTrang'      => $tinhTrang
    ];
  }

  out(200, ['ok'=>true,'data'=>$items]);
} catch (Throwable $e) {
  out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]);
}