<?php
// api/cardregister.php — bổ sung ràng buộc email @gmail.com
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

function digits($s){ return preg_replace('/\D+/', '', (string)$s); }
function is_email($s){ return filter_var($s, FILTER_VALIDATE_EMAIL) !== false; }
function is_gmail($s){ return (bool) preg_match('/@gmail\.com$/i', (string)$s); }
function parseDateYMD($s){
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string)$s, $m)) return null;
  return ['y'=>(int)$m[1],'m'=>(int)$m[2],'d'=>(int)$m[3]];
}
function end_date_ok($start, $end){
  $a = parseDateYMD($start); $b = parseDateYMD($end);
  if (!$a || !$b) return false;
  if ($b['y'] > $a['y']) return true;
  if ($b['y'] < $a['y']) return false;
  if ($b['m'] > $a['m']) return true;
  if ($b['m'] < $a['m']) return false;
  return $b['d'] > $a['d'];
}

if ($method === 'GET') {
  if ($id) {
    $stmt = $pdo->prepare("SELECT maSVHV, hoTen, ngaySinh, lop, sdt, gmail, gioiTinh, chucVu, he, ngayLamThe, ngayHetHanThe FROM cardregister WHERE TRIM(maSVHV)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) echo json_encode(['ok'=>true, 'data'=>$row]);
    else { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); }
    exit;
  }
  $q = isset($_GET['q']) ? "%{$_GET['q']}%" : '%';
  $stmt = $pdo->prepare("SELECT maSVHV, hoTen, ngaySinh, lop, sdt, gmail, gioiTinh, chucVu, he, ngayLamThe, ngayHetHanThe
                         FROM cardregister
                         WHERE maSVHV LIKE ? OR hoTen LIKE ? OR gmail LIKE ?
                         ORDER BY hoTen");
  $stmt->execute([$q,$q,$q]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['ok'=>true, 'data'=>$rows]);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

if ($method === 'POST') {
  if (empty($input['maSVHV']) || empty($input['hoTen']) || empty($input['ngayLamThe']) || empty($input['ngayHetHanThe'])) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'maSVHV, hoTen, ngayLamThe, ngayHetHanThe bắt buộc']);
    exit;
  }
  if (!empty($input['gmail'])) {
    if (!is_email($input['gmail'])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Email không hợp lệ']); exit; }
    if (!is_gmail($input['gmail'])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Email phải là địa chỉ @gmail.com']); exit; }
  }
  if (!empty($input['sdt']) && strlen(digits($input['sdt'])) < 10) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'Số điện thoại tối thiểu 10 chữ số']);
    exit;
  }
  if (!end_date_ok($input['ngayLamThe'], $input['ngayHetHanThe'])) {
    http_response_code(422);
    echo json_encode(['ok'=>false,'error'=>'Ngày hết hạn phải sau ngày làm thẻ']);
    exit;
  }
  // duplicate check
  $chk = $pdo->prepare("SELECT 1 FROM cardregister WHERE TRIM(maSVHV)=?");
  $chk->execute([trim($input['maSVHV'])]);
  if ($chk->fetch()) {
    http_response_code(409);
    echo json_encode(['ok'=>false,'error'=>'maSVHV đã tồn tại']);
    exit;
  }

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
  http_response_code(201);
  echo json_encode(['ok'=>true, 'maSVHV'=>$input['maSVHV']]);
  exit;
}

if ($method === 'PUT') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  // Validate if provided
  if (array_key_exists('gmail',$input) && $input['gmail']!=='') {
    if (!is_email($input['gmail'])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Email không hợp lệ']); exit; }
    if (!is_gmail($input['gmail'])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Email phải là địa chỉ @gmail.com']); exit; }
  }
  if (array_key_exists('sdt',$input) && $input['sdt']!=='') {
    if (strlen(digits($input['sdt'])) < 10) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Số điện thoại tối thiểu 10 chữ số']); exit; }
  }
  if (array_key_exists('ngayLamThe',$input) && array_key_exists('ngayHetHanThe',$input)) {
    if (!end_date_ok($input['ngayLamThe'], $input['ngayHetHanThe'])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Ngày hết hạn phải sau ngày làm thẻ']); exit; }
  }

  $fields = ['hoTen','ngaySinh','lop','sdt','gmail','gioiTinh','chucVu','he','ngayLamThe','ngayHetHanThe'];
  $sets=[]; $vals=[];
  foreach($fields as $f){ if(array_key_exists($f,$input)){ $sets[]="`$f`=?"; $vals[]=$input[$f]; } }
  if (empty($sets)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'No fields to update']); exit; }
  $vals[] = $id;
  $sql = "UPDATE cardregister SET ".implode(',', $sets)." WHERE TRIM(maSVHV)=?";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($vals);
  echo json_encode(['ok'=>true]);
  exit;
}

if ($method === 'DELETE') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  $stmt = $pdo->prepare("DELETE FROM cardregister WHERE TRIM(maSVHV)=?");
  $stmt->execute([$id]);
  echo json_encode(['ok'=>true]);
  exit;
}

http_response_code(405);
echo json_encode(['ok'=>false,'error'=>'Method not allowed']);