<?php
// bookloan.php — Quản lý phiếu mượn (quanlymuon) + hạch toán tồn kho (JWT auth)
require __DIR__ . '/../../../../../api/config/config.php';
require __DIR__ . '/../../../../../api/config/auth_middleware.php';
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? trim($_GET['id']) : null;
$action = isset($_GET['action']) ? trim($_GET['action']) : '';

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
$isWrite = in_array($method, ['POST','PUT','DELETE'], true);
if ($isWrite && !in_array($role, ['admin','librarian'], true)) { http_response_code(403); echo json_encode(['ok'=>false,'error'=>'Forbidden']); exit; }

function parseYMD($s){
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string)$s, $m)) return null;
  return ['y'=>(int)$m[1],'m'=>(int)$m[2],'d'=>(int)$m[3]];
}
function todayYMD(){
  return (new DateTime('today'))->format('Y-m-d');
}
function addMonths($ymd, $months){
  $dt = DateTime::createFromFormat('Y-m-d', $ymd);
  if (!$dt) return '';
  $dt->modify('+' . (int)$months . ' months');
  return $dt->format('Y-m-d');
}
function status_for($today, $due){
  if (!$due) return ['Đang mượn', 0];
  if ($today < $due) return ['Đang mượn', 0];
  if ($today === $due) return ['Đến hẹn trả', 0];
  $dDue = DateTime::createFromFormat('Y-m-d', $due);
  $dToday = DateTime::createFromFormat('Y-m-d', $today);
  $diff = $dToday->diff($dDue);
  $days = abs((int)$diff->format('%r%a'));
  if ($days < 1) $days = 1;
  return ['Quá hạn', $days];
}
function ensure_due_in_range($borrow, $due){
  if (!$borrow || !$due) return false;
  if ($due < $borrow) return false;
  $max = addMonths($borrow, 6);
  if ($due > $max) return false;
  return true;
}

// Kho sách: giảm/tăng tồn theo bảng SACH (chữ hoa)
function reserve_stock($pdo, $maS, $qty){ // giảm tồn
  $stmt = $pdo->prepare("UPDATE SACH SET SoLuong = SoLuong - ? WHERE TRIM(maS)=? AND SoLuong >= ?");
  $stmt->execute([(int)$qty, trim($maS), (int)$qty]);
  if ($stmt->rowCount() === 0) {
    throw new Exception('Không đủ số lượng tồn kho', 422);
  }
}
function release_stock($pdo, $maS, $qty){ // tăng tồn
  $stmt = $pdo->prepare("UPDATE SACH SET SoLuong = SoLuong + ? WHERE TRIM(maS)=?");
  $stmt->execute([(int)$qty, trim($maS)]);
}

// GET
if ($method === 'GET') {
  if ($id) {
    $stmt = $pdo->prepare("SELECT MaPhieuMuon, MaBanDoc, MaSach, NgayMuon, NgayTra, SoLuongMuon, TinhTrang, NgayQuaHan FROM quanlymuon WHERE TRIM(MaPhieuMuon)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); exit; }
    if ($row['TinhTrang'] !== 'Đã trả') {
      $today = todayYMD();
      list($status, $overdue) = status_for($today, $row['NgayTra']);
      if ($status !== $row['TinhTrang'] || (int)$overdue !== (int)$row['NgayQuaHan']) {
        $up = $pdo->prepare("UPDATE quanlymuon SET TinhTrang=?, NgayQuaHan=? WHERE TRIM(MaPhieuMuon)=?");
        $up->execute([$status, $overdue, $row['MaPhieuMuon']]);
        $row['TinhTrang'] = $status; $row['NgayQuaHan'] = $overdue;
      }
    }
    echo json_encode(['ok'=>true,'data'=>$row]); exit;
  }
  $q = isset($_GET['q']) ? "%{$_GET['q']}%" : '%';
  $stmt = $pdo->prepare("SELECT MaPhieuMuon, MaBanDoc, MaSach, NgayMuon, NgayTra, SoLuongMuon, TinhTrang, NgayQuaHan
                         FROM quanlymuon
                         WHERE MaPhieuMuon LIKE ? OR MaBanDoc LIKE ? OR MaSach LIKE ?
                         ORDER BY NgayMuon DESC, MaPhieuMuon DESC");
  $stmt->execute([$q, $q, $q]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $today = todayYMD();
  foreach ($rows as &$r) {
    if ($r['TinhTrang'] === 'Đã trả') continue;
    list($status, $overdue) = status_for($today, $r['NgayTra']);
    if ($status !== $r['TinhTrang'] || (int)$overdue !== (int)$r['NgayQuaHan']) {
      $upd = $pdo->prepare("UPDATE quanlymuon SET TinhTrang=?, NgayQuaHan=? WHERE TRIM(MaPhieuMuon)=?");
      $upd->execute([$status, $overdue, $r['MaPhieuMuon']]);
      $r['TinhTrang'] = $status; $r['NgayQuaHan'] = $overdue;
    }
  }
  echo json_encode(['ok'=>true,'data'=>$rows]); exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];

// ACTION: return (trả sách)
if ($method === 'PUT' && $action === 'return') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT MaPhieuMuon, MaSach, SoLuongMuon, NgayTra, TinhTrang FROM quanlymuon WHERE TRIM(MaPhieuMuon)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) { $pdo->rollBack(); http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); exit; }
    if ($row['TinhTrang'] !== 'Đã trả') {
      release_stock($pdo, $row['MaSach'], (int)$row['SoLuongMuon']);
      $today = todayYMD();
      $overdue = 0;
      if ($today > $row['NgayTra']) {
        $dDue = DateTime::createFromFormat('Y-m-d', $row['NgayTra']);
        $dToday = DateTime::createFromFormat('Y-m-d', $today);
        $diff = $dToday->diff($dDue);
        $overdue = abs((int)$diff->format('%r%a'));
        if ($overdue < 1) $overdue = 1;
      }
      $up = $pdo->prepare("UPDATE quanlymuon SET TinhTrang='Đã trả', NgayQuaHan=? WHERE TRIM(MaPhieuMuon)=?");
      $up->execute([$overdue, $id]);
    }
    $pdo->commit();
    echo json_encode(['ok'=>true]); exit;
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $code = $e->getCode() ?: 500;
    if ($code < 400 || $code > 599) $code = 500;
    http_response_code($code);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
    exit;
  }
}

// POST: create (mượn)
if ($method === 'POST') {
  foreach (['MaPhieuMuon','MaBanDoc','MaSach','NgayMuon','NgayTra'] as $f) {
    if (empty($input[$f])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>"$f bắt buộc"]); exit; }
  }
  $SoLuongMuon = isset($input['SoLuongMuon']) ? (int)$input['SoLuongMuon'] : 1;
  if ($SoLuongMuon < 1 || $SoLuongMuon > 5) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'SoLuongMuon phải từ 1 đến 5']); exit; }
  if (!ensure_due_in_range($input['NgayMuon'], $input['NgayTra'])) {
    http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Ngày hẹn trả phải trong khoảng từ ngày mượn đến tối đa 6 tháng']); exit;
  }

  // Duplicate id
  $chk = $pdo->prepare("SELECT 1 FROM quanlymuon WHERE TRIM(MaPhieuMuon)=?");
  $chk->execute([trim($input['MaPhieuMuon'])]);
  if ($chk->fetch()) { http_response_code(409); echo json_encode(['ok'=>false,'error'=>'MaPhieuMuon đã tồn tại']); exit; }

  // Existence checks
  $cBook = $pdo->prepare("SELECT 1 FROM SACH WHERE TRIM(maS)=?"); $cBook->execute([trim($input['MaSach'])]);
  if (!$cBook->fetch()) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Mã sách không tồn tại']); exit; }
  $cReader = $pdo->prepare("SELECT 1 FROM cardregister WHERE TRIM(maSVHV)=?"); $cReader->execute([trim($input['MaBanDoc'])]);
  if (!$cReader->fetch()) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Mã bạn đọc không tồn tại']); exit; }

  try {
    $pdo->beginTransaction();
    reserve_stock($pdo, $input['MaSach'], $SoLuongMuon);
    $today = todayYMD();
    list($status, $overdue) = status_for($today, $input['NgayTra']);

    $stmt = $pdo->prepare("INSERT INTO quanlymuon (MaPhieuMuon, MaBanDoc, MaSach, NgayMuon, NgayTra, SoLuongMuon, TinhTrang, NgayQuaHan)
                           VALUES (?,?,?,?,?,?,?,?)");
    $stmt->execute([
      $input['MaPhieuMuon'],
      $input['MaBanDoc'],
      $input['MaSach'],
      $input['NgayMuon'],
      $input['NgayTra'],
      $SoLuongMuon,
      $status,
      $overdue
    ]);
    $pdo->commit();
    http_response_code(201);
    echo json_encode(['ok'=>true,'MaPhieuMuon'=>$input['MaPhieuMuon']]); exit;
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $code = $e->getCode() ?: 500;
    if ($code < 400 || $code > 599) $code = 500;
    http_response_code($code);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
    exit;
  }
}

// PUT: update (sửa phiếu)
if ($method === 'PUT' && $action === '') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }

  $fields = ['MaBanDoc','MaSach','NgayMuon','NgayTra','SoLuongMuon'];
  $sets = []; $vals = [];
  foreach ($fields as $f) if (array_key_exists($f, $input)) { $sets[] = "`$f`=?"; $vals[] = $input[$f]; }
  if (empty($sets)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'No fields to update']); exit; }

  if (array_key_exists('SoLuongMuon',$input)) {
    $n = (int)$input['SoLuongMuon'];
    if ($n < 1 || $n > 5) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'SoLuongMuon phải từ 1 đến 5']); exit; }
  }
  if (array_key_exists('NgayMuon',$input) && array_key_exists('NgayTra',$input)) {
    if (!ensure_due_in_range($input['NgayMuon'], $input['NgayTra'])) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Ngày hẹn trả phải trong khoảng từ ngày mượn đến tối đa 6 tháng']); exit; }
  }
  if (array_key_exists('MaSach',$input)) {
    $cBook = $pdo->prepare("SELECT 1 FROM SACH WHERE TRIM(maS)=?"); $cBook->execute([trim($input['MaSach'])]);
    if (!$cBook->fetch()) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Mã sách không tồn tại']); exit; }
  }
  if (array_key_exists('MaBanDoc',$input)) {
    $cReader = $pdo->prepare("SELECT 1 FROM cardregister WHERE TRIM(maSVHV)=?"); $cReader->execute([trim($input['MaBanDoc'])]);
    if (!$cReader->fetch()) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Mã bạn đọc không tồn tại']); exit; }
  }

  try {
    $pdo->beginTransaction();
    $cur = $pdo->prepare("SELECT MaPhieuMuon, MaBanDoc, MaSach, NgayMuon, NgayTra, SoLuongMuon, TinhTrang FROM quanlymuon WHERE TRIM(MaPhieuMuon)=? LIMIT 1");
    $cur->execute([$id]);
    $row = $cur->fetch(PDO::FETCH_ASSOC);
    if (!$row) { $pdo->rollBack(); http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Not found']); exit; }

    $newMaSach = array_key_exists('MaSach',$input) ? trim($input['MaSach']) : $row['MaSach'];
    $newSL     = array_key_exists('SoLuongMuon',$input) ? (int)$input['SoLuongMuon'] : (int)$row['SoLuongMuon'];

    $oldMaSach = $row['MaSach'];
    $oldSL     = (int)$row['SoLuongMuon'];

    if ($newMaSach !== $oldMaSach) {
      release_stock($pdo, $oldMaSach, $oldSL);
      reserve_stock($pdo, $newMaSach, $newSL);
    } else {
      $delta = $newSL - $oldSL;
      if ($delta > 0) reserve_stock($pdo, $newMaSach, $delta);
      else if ($delta < 0) release_stock($pdo, $newMaSach, -$delta);
    }

    $vals_for_update = $vals; $vals_for_update[] = $id;
    $sql = "UPDATE quanlymuon SET ".implode(',', $sets)." WHERE TRIM(MaPhieuMuon)=?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($vals_for_update);

    if ($row['TinhTrang'] !== 'Đã trả') {
      $stmt1 = $pdo->prepare("SELECT NgayTra FROM quanlymuon WHERE TRIM(MaPhieuMuon)=? LIMIT 1");
      $stmt1->execute([$id]);
      $row1 = $stmt1->fetch(PDO::FETCH_ASSOC);
      $today = todayYMD();
      $due = $row1 ? $row1['NgayTra'] : $row['NgayTra'];
      list($status, $overdue) = status_for($today, $due);
      $up = $pdo->prepare("UPDATE quanlymuon SET TinhTrang=?, NgayQuaHan=? WHERE TRIM(MaPhieuMuon)=?");
      $up->execute([$status, $overdue, $id]);
    }

    $pdo->commit();
    echo json_encode(['ok'=>true]); exit;
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $code = $e->getCode() ?: 500;
    if ($code < 400 || $code > 599) $code = 500;
    http_response_code($code);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
    exit;
  }
}

// DELETE: xóa phiếu (hoàn kho nếu chưa trả)
if ($method === 'DELETE') {
  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'id required']); exit; }
  try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT MaSach, SoLuongMuon, TinhTrang FROM quanlymuon WHERE TRIM(MaPhieuMuon)=? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
      if ($row['TinhTrang'] !== 'Đã trả') {
        release_stock($pdo, $row['MaSach'], (int)$row['SoLuongMuon']);
      }
      $del = $pdo->prepare("DELETE FROM quanlymuon WHERE TRIM(MaPhieuMuon)=?");
      $del->execute([$id]);
    }
    $pdo->commit();
    echo json_encode(['ok'=>true]); exit;
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $code = $e->getCode() ?: 500;
    if ($code < 400 || $code > 599) $code = 500;
    http_response_code($code);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
    exit;
  }
}

http_response_code(405);
echo json_encode(['ok'=>false,'error'=>'Method not allowed']);