<?php
// cardregister.php — CRUD cho thẻ độc giả, nâng cấp: JWT auth (Bearer hoặc cookie), DB chung, JSON chuẩn cho Android/Web

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Origin: *');
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../../../../../api/config/auth_middleware.php'; // includes config
require_once __DIR__ . '/../../../../../api/config/db.php'; // provides $pdo

function json_out(int $code, array $data): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function digits($s){ return preg_replace('/\D+/', '', (string)$s); }
function is_email($s){ return filter_var($s, FILTER_VALIDATE_EMAIL) !== false; }
function is_gmail($s){ return (bool) preg_match('/@gmail\.com$/i', (string)$s); }
function parseDateYMD($s){ if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string)$s, $m)) return null; return ['y'=>(int)$m[1],'m'=>(int)$m[2],'d'=>(int)$m[3]]; }
function end_date_ok($start, $end){ $a = parseDateYMD($start); $b = parseDateYMD($end); if (!$a || !$b) return false; if ($b['y'] !== $a['y']) return $b['y'] > $a['y']; if ($b['m'] !== $a['m']) return $b['m'] > $a['m']; return $b['d'] > $a['d']; }

// AuthN/AuthZ: require Admin or Librarian for all methods
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) json_out(401, ['ok'=>false,'error'=>'Unauthorized']);
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian'], true)) json_out(403, ['ok'=>false,'error'=>'Forbidden']);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = isset($_GET['id']) ? trim((string)$_GET['id']) : null;

if ($method === 'GET') {
  try {
    if ($id) {
      $stmt = $pdo->prepare("SELECT maSVHV, hoTen, ngaySinh, lop, sdt, gmail, gioiTinh, chucVu, he, ngayLamThe, ngayHetHanThe FROM cardregister WHERE TRIM(maSVHV)=? LIMIT 1");
      $stmt->execute([$id]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($row) json_out(200, ['ok'=>true, 'data'=>$row]);
      else json_out(404, ['ok'=>false,'error'=>'Not found']);
    }
    $q = isset($_GET['q']) ? "%".$_GET['q']."%" : '%';
    $stmt = $pdo->prepare("SELECT maSVHV, hoTen, ngaySinh, lop, sdt, gmail, gioiTinh, chucVu, he, ngayLamThe, ngayHetHanThe
                           FROM cardregister
                           WHERE maSVHV LIKE ? OR hoTen LIKE ? OR gmail LIKE ?
                           ORDER BY hoTen");
    $stmt->execute([$q,$q,$q]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    json_out(200, ['ok'=>true, 'data'=>$rows]);
  } catch (Throwable $e) { json_out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]); }
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

if ($method === 'POST') {
  if (empty($input['maSVHV']) || empty($input['hoTen']) || empty($input['ngayLamThe']) || empty($input['ngayHetHanThe'])) {
    json_out(422, ['ok'=>false,'error'=>'maSVHV, hoTen, ngayLamThe, ngayHetHanThe bắt buộc']);
  }
  if (!empty($input['gmail'])) {
    if (!is_email($input['gmail'])) json_out(422, ['ok'=>false,'error'=>'Email không hợp lệ']);
    if (!is_gmail($input['gmail'])) json_out(422, ['ok'=>false,'error'=>'Email phải là địa chỉ @gmail.com']);
  }
  if (!empty($input['sdt']) && strlen(digits($input['sdt'])) < 10) {
    json_out(422, ['ok'=>false,'error'=>'Số điện thoại tối thiểu 10 chữ số']);
  }
  if (!end_date_ok($input['ngayLamThe'], $input['ngayHetHanThe'])) {
    json_out(422, ['ok'=>false,'error'=>'Ngày hết hạn phải sau ngày làm thẻ']);
  }
  try {
    $chk = $pdo->prepare("SELECT 1 FROM cardregister WHERE TRIM(maSVHV)=?");
    $chk->execute([trim((string)$input['maSVHV'])]);
    if ($chk->fetch()) json_out(409, ['ok'=>false,'error'=>'maSVHV đã tồn tại']);

    $stmt = $pdo->prepare("INSERT INTO cardregister (maSVHV, hoTen, ngaySinh, lop, sdt, gmail, gioiTinh, chucVu, he, ngayLamThe, ngayHetHanThe)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([
      $input['maSVHV'],
      $input['hoTen'],
      $input['ngaySinh'] ?? null,
      $input['lop'] ?? null,
      $input['sdt'] ?? null,
      $input['gmail'] ?? null,
      $input['gioiTinh'] ?? null,
      $input['chucVu'] ?? null,
      $input['he'] ?? null,
      $input['ngayLamThe'],
      $input['ngayHetHanThe']
    ]);
    json_out(201, ['ok'=>true, 'maSVHV'=>$input['maSVHV']]);
  } catch (Throwable $e) { json_out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]); }
}

if ($method === 'PUT') {
  if (!$id) json_out(400, ['ok'=>false,'error'=>'id required']);
  if (array_key_exists('gmail',$input) && $input['gmail']!=='') {
    if (!is_email($input['gmail'])) json_out(422, ['ok'=>false,'error'=>'Email không hợp lệ']);
    if (!is_gmail($input['gmail'])) json_out(422, ['ok'=>false,'error'=>'Email phải là địa chỉ @gmail.com']);
  }
  if (array_key_exists('sdt',$input) && $input['sdt']!=='') {
    if (strlen(digits($input['sdt'])) < 10) json_out(422, ['ok'=>false,'error'=>'Số điện thoại tối thiểu 10 chữ số']);
  }
  if (array_key_exists('ngayLamThe',$input) && array_key_exists('ngayHetHanThe',$input)) {
    if (!end_date_ok($input['ngayLamThe'], $input['ngayHetHanThe'])) json_out(422, ['ok'=>false,'error'=>'Ngày hết hạn phải sau ngày làm thẻ']);
  }
  $fields = ['hoTen','ngaySinh','lop','sdt','gmail','gioiTinh','chucVu','he','ngayLamThe','ngayHetHanThe'];
  $sets=[]; $vals=[];
  foreach($fields as $f){ if(array_key_exists($f,$input)){ $sets[]="`$f`=?"; $vals[]=$input[$f]; } }
  if (empty($sets)) json_out(422, ['ok'=>false,'error'=>'No fields to update']);
  $vals[] = $id;
  try {
    $sql = "UPDATE cardregister SET ".implode(',', $sets)." WHERE TRIM(maSVHV)=?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals);
    json_out(200, ['ok'=>true]);
  } catch (Throwable $e) { json_out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]); }
}

if ($method === 'DELETE') {
  if (!$id) json_out(400, ['ok'=>false,'error'=>'id required']);
  try {
    $stmt = $pdo->prepare("DELETE FROM cardregister WHERE TRIM(maSVHV)=?");
    $stmt->execute([$id]);
    json_out(200, ['ok'=>true]);
  } catch (Throwable $e) { json_out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]); }
}

json_out(405, ['ok'=>false,'error'=>'Method not allowed']);