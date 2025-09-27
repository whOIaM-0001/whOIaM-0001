<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');

function out(int $code, array $data){ http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

// Load config/auth/db robustly
try{
  $found=false;
  for($i=1;$i<=8;$i++){
    $base=dirname(__DIR__, $i);
    $auth=$base.'/api/config/auth_middleware.php';
    $cfg =$base.'/api/config/config.php';
    if (is_file($auth) && is_file($cfg)){ require $cfg; require $auth; $found=true; break; }
  }
  if(!$found){
    $doc=rtrim($_SERVER['DOCUMENT_ROOT']??'','/\\');
    if($doc && is_file($doc.'/kma_library/api/config/config.php') && is_file($doc.'/kma_library/api/config/auth_middleware.php')){
      require $doc.'/kma_library/api/config/config.php';
      require $doc.'/kma_library/api/config/auth_middleware.php';
      $found=true;
    }
  }
  if(!$found) out(500, ['ok'=>false,'error'=>'Không tìm thấy config/auth_middleware.php']);
  $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, $DB_OPTIONS);
}catch(Throwable $e){
  out(500, ['ok'=>false,'error'=>'DB connect error']);
}

// Auth: allow Admin/Librarian/Reader
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) out(401, ['ok'=>false,'error'=>'Unauthorized']);
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian','reader'], true)) out(403, ['ok'=>false,'error'=>'Forbidden']);

$ma = trim((string)($_GET['ma'] ?? ''));
if ($ma === '') out(422, ['ok'=>false,'error'=>'Thiếu tham số ma (maSVHV)']);

function today(){ return (new DateTime('today'))->format('Y-m-d'); }
function compute_status($today, $due){
  if(!$due) return ['Đang mượn', 0];
  if($today < $due) return ['Đang mượn', 0];
  if($today === $due) return ['Đến hẹn trả', 0];
  $d1=DateTime::createFromFormat('Y-m-d',$today); $d2=DateTime::createFromFormat('Y-m-d',$due);
  $diff=$d1->diff($d2); $days=abs((int)$diff->format('%r%a')); if($days<1) $days=1;
  return ['Quá hạn', $days];
}

try{
  $sql = "SELECT q.MaPhieuMuon, q.MaSach, q.MaBanDoc, q.SoLuongMuon,
                 q.NgayMuon, q.NgayTra, q.TinhTrang, q.NgayQuaHan,
                 s.TenS AS TenS,
                 c.hoTen AS HoTen
          FROM quanlymuon q
          LEFT JOIN SACH s ON TRIM(s.maS) = TRIM(q.MaSach)
          LEFT JOIN cardregister c ON TRIM(c.maSVHV) = TRIM(q.MaBanDoc)
          WHERE TRIM(q.MaBanDoc) = ?
          ORDER BY q.NgayMuon DESC, q.MaPhieuMuon DESC";
  $st = $pdo->prepare($sql);
  $st->execute([$ma]);
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);

  // Cập nhật trạng thái trong response (không ép buộc ghi DB)
  $today = today();
  foreach ($rows as &$r){
    if (($r['TinhTrang'] ?? '') !== 'Đã trả') {
      [$status, $overdue] = compute_status($today, $r['NgayTra'] ?? '');
      $r['TinhTrang'] = $status;
      $r['NgayQuaHan'] = $overdue;
    }
    if (!isset($r['TenS'])) $r['TenS'] = null;
    if (!isset($r['HoTen'])) $r['HoTen'] = null;
  }

  out(200, ['ok'=>true,'data'=>$rows]);
}catch(Throwable $e){
  out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]);
}