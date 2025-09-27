<?php
// Sign Up API: check email/admin role and create account
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { header("Content-Type: application/json; charset=utf-8"); exit; }
header("Content-Type: application/json; charset=utf-8");

// Không in warning ra output để tránh phá JSON
error_reporting(E_ALL);
ini_set('display_errors', '0');

function json_ok($arr = []) { echo json_encode(array_merge(['ok'=>true], $arr)); exit; }
function json_err($msg, $code = 400) { http_response_code($code); echo json_encode(['ok'=>false,'error'=>$msg]); exit; }

// ===== Locate db.php robustly =====
$attempts = [];
$found = false;
$pdo = null;

// 1) Walk up ancestors to find api/config/db.php (1..8 levels)
for ($i = 1; $i <= 8; $i++) {
  $base = dirname(__DIR__, $i);
  $p = $base . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'db.php';
  $attempts[] = $p;
  if (is_file($p)) { require $p; $found = true; break; }
}

// 2) Try DOCUMENT_ROOT + kma_library/api/config/db.php
if (!$found) {
  $docroot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', "/\\");
  if ($docroot) {
    $p2 = $docroot . DIRECTORY_SEPARATOR . 'kma_library' . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'db.php';
    $attempts[] = $p2;
    if (is_file($p2)) { require $p2; $found = true; }
  }
}

// 3) Try DOCUMENT_ROOT + kma_library/library_api/api/config/db.php (nếu ai đó để trong library_api)
if (!$found && !empty($docroot)) {
  $p3 = $docroot . DIRECTORY_SEPARATOR . 'kma_library' . DIRECTORY_SEPARATOR . 'library_api' . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'db.php';
  $attempts[] = $p3;
  if (is_file($p3)) { require $p3; $found = true; }
}

if (!$found) {
  json_err("Không tìm thấy file db.php. Đã thử các đường dẫn:\n- " . implode("\n- ", $attempts), 500);
}

if (!isset($pdo) || !$pdo) json_err('Database connection not available', 500);

// ===== Helpers =====
function email_exists(PDO $pdo, $email) {
  $stmt = $pdo->prepare("SELECT 1 FROM accounts WHERE LOWER(Email)=LOWER(?) LIMIT 1");
  $stmt->execute([$email]);
  return (bool)$stmt->fetchColumn();
}
function admin_exists(PDO $pdo) {
  $stmt = $pdo->query("SELECT 1 FROM accounts WHERE Role='Admin' LIMIT 1");
  return (bool)$stmt->fetchColumn();
}
function normalize_name($s) { return trim($s ?? ''); }
function valid_name($s) { return (bool)preg_match('/^[\p{L}\s]+$/u', $s); }
function valid_gmail($s) { return (bool)preg_match('/^[A-Za-z0-9._%+\-]+@gmail\.com$/i', $s); }
function valid_password($s) {
  if (preg_match('/\s/', $s)) return false;
  $okLen = strlen($s) >= 8;
  $okLower = preg_match('/[a-z]/', $s);
  $okUpper = preg_match('/[A-Z]/', $s);
  $okDigit = preg_match('/\d/', $s);
  $okSpecial = preg_match('/[^A-Za-z0-9]/', $s);
  return $okLen && $okLower && $okUpper && $okDigit && $okSpecial;
}
function next_user_id(PDO $pdo, $role) {
  $used = [];
  $rs = $pdo->query("SELECT UserID FROM accounts");
  while ($row = $rs->fetch(PDO::FETCH_ASSOC)) {
    $id = $row['UserID'] ?? '';
    if (preg_match('/^ID(\d{5})$/', $id, $m)) $used[(int)$m[1]] = true;
  }
  if ($role === 'Admin') {
    if (!empty($used[1])) return null; // Admin duy nhất
    $n = 1;
  } else {
    $n = 2;
    while (isset($used[$n])) $n++;
  }
  return 'ID' . str_pad((string)$n, 5, '0', STR_PAD_LEFT);
}

// ===== Main =====
try {
  $method = $_SERVER['REQUEST_METHOD'];
  $action = isset($_GET['action']) ? trim($_GET['action']) : '';

  if ($method === 'GET') {
    if ($action === 'checkEmail') {
      $email = trim($_GET['email'] ?? '');
      if ($email === '') json_err('Email required', 422);
      json_ok(['exists' => email_exists($pdo, $email)]);
    }
    if ($action === 'roles') {
      $exists = admin_exists($pdo);
      $roles = $exists ? ['Librarian'] : ['Admin','Librarian'];
      json_ok(['admin_exists' => $exists, 'roles' => $roles]);
    }
    // THÊM MỚI: public checkCard để app đăng ký Reader dùng
    if ($action === 'checkCard') {
      $id = trim($_GET['id'] ?? '');
      if ($id === '') json_err('id required', 422);
      $st = $pdo->prepare("SELECT hoTen FROM cardregister WHERE TRIM(maSVHV)=? LIMIT 1");
      $st->execute([$id]);
      $r = $st->fetch(PDO::FETCH_ASSOC);
      if (!$r) json_err('Mã thẻ không tồn tại', 404);
      json_ok(['exists'=>true,'hoTen'=>$r['hoTen'] ?? '']);
    }
    json_err('Unknown action', 400);
  }

  if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $name = normalize_name($input['fullname'] ?? '');
    $email = trim($input['email'] ?? '');
    $pass = (string)($input['password'] ?? '');
    $role = ($input['role'] ?? 'Librarian');
    if ($role !== 'Admin' && $role !== 'Librarian' && $role !== 'Reader') $role = 'Librarian';
    $maSVHV = trim($input['maSVHV'] ?? '');

    // Validate
    if ($name === '') json_err('Vui lòng nhập họ tên', 422);
    if (!valid_name($name)) json_err('Họ tên chỉ gồm chữ cái và khoảng trắng', 422);
    if ($email === '') json_err('Vui lòng nhập email', 422);
    if (!valid_gmail($email)) json_err('Email phải kết thúc bằng @gmail.com', 422);
    if (email_exists($pdo, $email)) json_err('Email đã tồn tại', 409);
    if (!valid_password($pass)) json_err('Mật khẩu chưa đạt yêu cầu', 422);

    // Rule: Admin duy nhất
    if ($role === 'Admin' && admin_exists($pdo)) {
      json_err('Đã có tài khoản Admin', 409);
    }

     // Xác định fullname
    $name = normalize_name($input['fullname'] ?? '');
    if ($role === 'Reader') {
      if ($maSVHV === '') json_err('maSVHV required for Reader', 422);
      // tra hoTen từ cardregister
      $st = $pdo->prepare("SELECT hoTen FROM cardregister WHERE TRIM(maSVHV)=? LIMIT 1");
      $st->execute([$maSVHV]);
      $r = $st->fetch(PDO::FETCH_ASSOC);
      if (!$r) json_err('Mã thẻ không tồn tại', 404);
      $name = normalize_name($r['hoTen'] ?? '');
    }

    if ($name === '' || !valid_name($name)) {
      json_err('Họ tên không hợp lệ', 422);
    }

    // Compute UserID
    $userID = next_user_id($pdo, $role);
    if (!$userID) json_err('Không thể cấp UserID', 500);

    // Hash password SHA-256
    $hash = hash('sha256', $pass);

    // Insert
    $sql = "INSERT INTO accounts (UserID, Username, Email, PasswordHash, Role) VALUES (?,?,?,?,?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userID, $name, $email, $hash, $role]);

    // json_ok(['UserID' => $userID]);
    http_response_code(201);
    json_ok(['UserID' => $userID, 'Username'=>$name, 'Role'=>$role]);
  }

  json_err('Method not allowed', 405);
} catch (PDOException $e) {
  json_err($e->getMessage(), 500);
}