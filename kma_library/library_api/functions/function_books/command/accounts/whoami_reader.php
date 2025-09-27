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

// Auth: allow Admin/Librarian/Reader (nhưng chỉ Reader mới có maSVHV)
$jwt = get_bearer_token(); if (!$jwt) $jwt = get_jwt_cookie();
$user = verify_jwt_token($jwt);
if (!$user) out(401, ['ok'=>false,'error'=>'Unauthorized']);

$email = (string)($user['Email'] ?? $user['email'] ?? '');
$role  = strtolower((string)($user['Role'] ?? $user['role'] ?? ''));

if ($email === '') out(422, ['ok'=>false,'error'=>'Thiếu email trong token']);

try{
  $maSVHV = null; $hoTen = null;

  if ($role === 'reader') {
    // Join theo Username (accounts) = hoTen (cardregister)
    $sql = "SELECT c.maSVHV AS maSVHV, c.hoTen AS hoTen
            FROM accounts a
            JOIN cardregister c ON TRIM(c.hoTen) = TRIM(a.Username)
            WHERE LOWER(a.Email) = LOWER(?) AND a.Role = 'Reader'
            LIMIT 1";
    $st = $pdo->prepare($sql);
    $st->execute([$email]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if ($row) {
      $maSVHV = $row['maSVHV'] ?? null;
      $hoTen  = $row['hoTen'] ?? null;
    }
  }

  if (!$maSVHV) {
    out(404, ['ok'=>false,'error'=>'Không tìm thấy mã độc giả tương ứng', 'email'=>$email, 'role'=>$role]);
  }
  out(200, ['ok'=>true, 'email'=>$email, 'role'=>$role, 'maSVHV'=>$maSVHV, 'hoTen'=>$hoTen]);
}catch(Throwable $e){
  out(500, ['ok'=>false,'error'=>'DB error: '.$e->getMessage()]);
}