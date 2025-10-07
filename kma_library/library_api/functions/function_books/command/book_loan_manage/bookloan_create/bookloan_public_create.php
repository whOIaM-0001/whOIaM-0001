<?php
// Reader create loan (public) — allow Admin/Librarian/Reader to POST create
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

function out(int $code, array $data){ http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

// Load config/db/auth robustly
try {
  $found=false;
  for($i=1;$i<=8;$i++){
    $base=dirname(__DIR__, $i);
    $auth=$base.'/api/config/auth_middleware.php';
    $cfg =$base.'/api/config/config.php';
    if (!$found && is_file($auth) && is_file($cfg)) { require $cfg; require $auth; $found=true; break; }
  }
  if(!$found){
    $doc=rtrim($_SERVER['DOCUMENT_ROOT']??'','/\\');
    if($doc && is_file($doc.'/kma_library/api/config/auth_middleware.php') && is_file($doc.'/kma_library/api/config/config.php')){
      require $doc.'/kma_library/api/config/config.php';
      require $doc.'/kma_library/api/config/auth_middleware.php';
      $found=true;
    }
  }
  if(!$found) out(500, ['ok'=>false,'error'=>'Không tìm thấy config/auth_middleware.php']);
  $pdo=new PDO($DB_DSN,$DB_USER,$DB_PASS,$DB_OPTIONS);
} catch(Throwable $e){ out(500, ['ok'=>false,'error'=>'DB connect error']); }

// Auth: allow Reader/Admin/Librarian for create
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) out(401, ['ok'=>false,'error'=>'Unauthorized']);
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian','reader'], true)) out(403, ['ok'=>false,'error'=>'Forbidden']);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') out(405, ['ok'=>false,'error'=>'Method not allowed']);

$input = json_decode(file_get_contents('php://input'), true) ?: [];

// Helpers
function ymd_ok($s){ return preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$s); }
function add_months($ymd,$n){ $dt=DateTime::createFromFormat('Y-m-d',$ymd); if(!$dt) return ''; $dt->modify('+'.(int)$n.' months'); return $dt->format('Y-m-d'); }
function ensure_due_in_range($borrow,$due){ if(!$borrow||!$due) return false; if($due<$borrow) return false; $max=add_months($borrow,6); return $due<=$max; }
function status_for($today,$due){
  if(!$due) return ['Đang mượn',0];
  if($today<$due) return ['Đang mượn',0];
  if($today===$due) return ['Đến hẹn trả',0];
  $d1=DateTime::createFromFormat('Y-m-d',$today); $d2=DateTime::createFromFormat('Y-m-d',$due);
  $diff=$d1->diff($d2); $days=abs((int)$diff->format('%r%a')); if($days<1) $days=1;
  return ['Quá hạn',$days];
}
function today(){ return (new DateTime('today'))->format('Y-m-d'); }
function reserve_stock(PDO $pdo, $maS, $qty){
  $st=$pdo->prepare("UPDATE SACH SET SoLuong = SoLuong - ? WHERE TRIM(maS)=? AND SoLuong >= ?");
  $st->execute([(int)$qty, trim($maS), (int)$qty]);
  if($st->rowCount()===0) throw new Exception('Không đủ số lượng tồn kho', 422);
}

// Validate
foreach (['MaPhieuMuon','MaBanDoc','MaSach','NgayMuon','NgayTra'] as $f){
  if (empty($input[$f])) out(422, ['ok'=>false,'error'=>"$f bắt buộc"]);
}
$SoLuongMuon = isset($input['SoLuongMuon']) ? (int)$input['SoLuongMuon'] : 1;
if ($SoLuongMuon < 1 || $SoLuongMuon > 5) out(422, ['ok'=>false,'error'=>'SoLuongMuon phải từ 1 đến 5']);
if (!ymd_ok($input['NgayMuon']) || !ymd_ok($input['NgayTra'])) out(422, ['ok'=>false,'error'=>'Định dạng ngày không hợp lệ (YYYY-MM-DD)']);
if (!ensure_due_in_range($input['NgayMuon'], $input['NgayTra'])) out(422, ['ok'=>false,'error'=>'Ngày hẹn trả phải trong khoảng từ ngày mượn đến tối đa 6 tháng']);

// Uniqueness + existence checks
$chk = $pdo->prepare("SELECT 1 FROM quanlymuon WHERE TRIM(MaPhieuMuon)=?");
$chk->execute([trim($input['MaPhieuMuon'])]);
if ($chk->fetch()) out(409, ['ok'=>false,'error'=>'MaPhieuMuon đã tồn tại']);

$cBook = $pdo->prepare("SELECT 1 FROM SACH WHERE TRIM(maS)=?");
$cBook->execute([trim($input['MaSach'])]);
if (!$cBook->fetch()) out(422, ['ok'=>false,'error'=>'Mã sách không tồn tại']);

$cReader = $pdo->prepare("SELECT 1 FROM cardregister WHERE TRIM(maSVHV)=?");
$cReader->execute([trim($input['MaBanDoc'])]);
if (!$cReader->fetch()) out(422, ['ok'=>false,'error'=>'Mã bạn đọc không tồn tại']);

// Create
try{
  $pdo->beginTransaction();

  if ($role === 'reader') {
    // ĐẶT TRƯỚC: KHÔNG trừ kho, set trạng thái "Chờ nhận sách"
    $status = 'Chờ nhận sách';
    $overdue = 0; // chưa tính
  } else {
    // Nhân sự thư viện tạo trực tiếp: trừ kho ngay & tính trạng thái
    reserve_stock($pdo, $input['MaSach'], $SoLuongMuon);
    [$status, $overdue] = status_for(today(), $input['NgayTra']);
  }

  $ins = $pdo->prepare("INSERT INTO quanlymuon (MaPhieuMuon, MaBanDoc, MaSach, NgayMuon, NgayTra, SoLuongMuon, TinhTrang, NgayQuaHan)
                        VALUES (?,?,?,?,?,?,?,?)");
  $ins->execute([
    $input['MaPhieuMuon'],
    $input['MaBanDoc'],
    $input['MaSach'],
    $input['NgayMuon'], // ghi tạm ngày đặt; nếu Reader sẽ overwrite khi xác nhận
    $input['NgayTra'],
    $SoLuongMuon,
    $status,
    $overdue
  ]);

  $pdo->commit();
  out(201, ['ok'=>true,'MaPhieuMuon'=>$input['MaPhieuMuon'],'TinhTrang'=>$status]);
}catch(Throwable $e){
  if ($pdo->inTransaction()) $pdo->rollBack();
  $code = (int)($e->getCode() ?: 500);
  if ($code < 400 || $code > 599) $code = 500;
  out($code, ['ok'=>false,'error'=>$e->getMessage()]);
}
