<?php
// Confirm pickup — Librarian/Admin xác nhận Reader đã nhận sách
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

function out(int $code, array $data){ http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

// Load config/auth/db robustly
try {
  $found=false;
  for($i=1;$i<=8;$i++){
    $base=dirname(__DIR__, $i);
    $auth=$base.'/api/config/auth_middleware.php';
    $cfg =$base.'/api/config/config.php';
    if (is_file($auth) && is_file($cfg)) { require $cfg; require $auth; $found=true; break; }
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

// Auth: chỉ Admin/Librarian
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) out(401, ['ok'=>false,'error'=>'Unauthorized']);
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian'], true)) out(403, ['ok'=>false,'error'=>'Forbidden']);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') out(405, ['ok'=>false,'error'=>'Method not allowed']);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$maPhieu = trim((string)($input['MaPhieuMuon'] ?? ''));
if ($maPhieu === '') out(422, ['ok'=>false,'error'=>'Thiếu MaPhieuMuon']);

function today(){ return (new DateTime('today'))->format('Y-m-d'); }
function add_months($ymd,$n){ $dt=DateTime::createFromFormat('Y-m-d',$ymd); if(!$dt) return ''; $dt->modify('+'.(int)$n.' months'); return $dt->format('Y-m-d'); }
function days_between($a,$b){ $d1=DateTime::createFromFormat('Y-m-d',$a); $d2=DateTime::createFromFormat('Y-m-d',$b); if(!$d1||!$d2) return 0; return (int)$d1->diff($d2)->format('%a'); }
function status_for($today,$due){
  if(!$due) return ['Đang mượn',0];
  if($today<$due) return ['Đang mượn',0];
  if($today===$due) return ['Đến hẹn trả',0];
  $d1=DateTime::createFromFormat('Y-m-d',$today); $d2=DateTime::createFromFormat('Y-m-d',$due);
  $diff=$d1->diff($d2); $days=abs((int)$diff->format('%r%a')); if($days<1) $days=1;
  return ['Quá hạn',$days];
}
function reserve_stock(PDO $pdo, $maS, $qty){
  $st=$pdo->prepare("UPDATE SACH SET SoLuong = SoLuong - ? WHERE TRIM(maS)=? AND SoLuong >= ?");
  $st->execute([(int)$qty, trim($maS), (int)$qty]);
  if($st->rowCount()===0) throw new Exception('Không đủ số lượng tồn kho', 422);
}

try{
  // Lấy phiếu
  $st = $pdo->prepare("SELECT MaPhieuMuon, MaSach, MaBanDoc, SoLuongMuon, NgayMuon, NgayTra, TinhTrang
                       FROM quanlymuon WHERE TRIM(MaPhieuMuon)=? LIMIT 1");
  $st->execute([$maPhieu]);
  $row = $st->fetch(PDO::FETCH_ASSOC);
  if (!$row) out(404, ['ok'=>false,'error'=>'Không tìm thấy phiếu']);

  if (trim((string)$row['TinhTrang']) !== 'Chờ nhận sách') {
    out(409, ['ok'=>false,'error'=>'Phiếu không ở trạng thái Chờ nhận sách']);
  }

  // Tính độ dài kỳ mượn ban đầu (theo ngày), đẩy lùi theo ngày nhận; chặn trần +6 tháng
  $oldBorrow = (string)$row['NgayMuon']; // ngày đặt tạm
  $oldDue    = (string)$row['NgayTra'];
  $D = max(1, days_between($oldBorrow, $oldDue));
  $today = today();
  $todayPlus6m = add_months($today, 6);
  $newDueCandidate = (new DateTime($today))->modify("+{$D} days")->format('Y-m-d');
  $newDue = ($newDueCandidate <= $todayPlus6m) ? $newDueCandidate : $todayPlus6m;

  // Transaction
  $pdo->beginTransaction();
  reserve_stock($pdo, $row['MaSach'], (int)$row['SoLuongMuon']);
  [$status, $overdue] = status_for($today, $newDue);

  $up = $pdo->prepare("UPDATE quanlymuon
                       SET NgayMuon=?, NgayTra=?, TinhTrang=?, NgayQuaHan=?
                       WHERE TRIM(MaPhieuMuon)=?");
  $up->execute([$today, $newDue, $status, $overdue, $maPhieu]);

  $pdo->commit();
  out(200, ['ok'=>true,'MaPhieuMuon'=>$maPhieu,'TinhTrang'=>$status,'NgayMuon'=>$today,'NgayTra'=>$newDue]);
}catch(Throwable $e){
  if ($pdo->inTransaction()) $pdo->rollBack();
  $code = (int)($e->getCode() ?: 500);
  if ($code < 400 || $code > 599) $code = 500;
  out($code, ['ok'=>false,'error'=>$e->getMessage()]);
}