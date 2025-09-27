<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
} catch(Throwable $e){
  out(500, ['ok'=>false,'error'=>'DB connect error']);
}

// Auth: allow Admin/Librarian/Reader
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) out(401, ['ok'=>false,'error'=>'Unauthorized']);
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian','reader'], true)) out(403, ['ok'=>false,'error'=>'Forbidden']);

try{
  // Dựa trên định dạng PM + số (giữ pad theo dữ liệu hiện có)
  $sql = "SELECT 
            MAX(CAST(SUBSTRING(MaPhieuMuon, 3) AS UNSIGNED)) AS maxNum,
            MAX(LENGTH(SUBSTRING(MaPhieuMuon, 3)))          AS padLen
          FROM quanlymuon
          WHERE MaPhieuMuon REGEXP '^PM[0-9]+$'";
  $st = $pdo->query($sql);
  $row = $st->fetch(PDO::FETCH_ASSOC) ?: ['maxNum'=>null,'padLen'=>null];

  $maxNum = isset($row['maxNum']) ? (int)$row['maxNum'] : 0;
  $pad    = isset($row['padLen']) && (int)$row['padLen'] > 0 ? (int)$row['padLen'] : 2;

  $next = $maxNum + 1;
  $numStr = str_pad((string)$next, max(2,$pad), '0', STR_PAD_LEFT);
  $nextId = 'PM' . $numStr;

  out(200, ['ok'=>true,'nextId'=>$nextId]);
}catch(Throwable $e){
  out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]);
}