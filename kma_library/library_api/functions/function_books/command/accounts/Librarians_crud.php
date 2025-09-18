<?php
// Librarians_crud.php - CRUD cho bảng accounts (UserID, Username, Email, PasswordHash, Role)
// Thêm: validate Email @gmail.com, kiểm tra tồn tại, validate mật khẩu mạnh, hash SHA-256
// Endpoints:
//   - GET ?id=...                                 -> lấy 1 tài khoản
//   - GET ?action=check_email&email=...           -> kiểm tra email đã tồn tại chưa
//   - POST (JSON)                                 -> tạo {Username, Email, Role, Password}
//   - PUT ?id=... (JSON)                          -> sửa {Username, Email, Role, Password?}
//   - PATCH ?action=reset_password&id=... (JSON)  -> {Password}
//   - DELETE ?id=...                              -> xoá

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_name('PHPSESSID');
  session_start();
}
if (empty($_SESSION['user'])) {
  http_response_code(401);
  echo json_encode(['ok'=>false,'error'=>'Unauthorized'], JSON_UNESCAPED_UNICODE);
  exit;
}

/** Cho phép override config bằng file library_api/config.php */
$rootConfig = dirname(__DIR__, 5) . DIRECTORY_SEPARATOR . 'config.php';
if (is_file($rootConfig)) { require_once $rootConfig; }

$DB_HOST = defined('DB_HOST') ? DB_HOST : '127.0.0.1';
$DB_NAME = defined('DB_NAME') ? DB_NAME : 'kma_library';
$DB_USER = defined('DB_USER') ? DB_USER : 'root';
$DB_PASS = defined('DB_PASS') ? DB_PASS : '';

try {
  $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'DB connection failed'], JSON_UNESCAPED_UNICODE);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

function body_json(): array {
  $raw = file_get_contents('php://input');
  $in = json_decode($raw, true);
  return is_array($in) ? $in : [];
}

function validate_role(string $role): bool {
  return in_array($role, ['Admin','Librarian','Staff'], true);
}

// Regex rules
function is_valid_email_gmail(string $email): bool {
  return (bool)preg_match('/^[A-Za-z0-9._%+\-]+@gmail\.com$/i', $email);
}
function is_strong_password(string $pwd): bool {
  // >=8, có thường, hoa, số, ký tự đặc biệt, không khoảng trắng
  return (bool)preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/', $pwd);
}

// Hash SHA-256 theo yêu cầu
function hash_password_sha256(string $pwd): string {
  return hash('sha256', $pwd);
}

function validate_input(array $in, bool $isCreate = true): array {
  $errors = [];

  $username = trim((string)($in['Username'] ?? ''));
  $email    = trim((string)($in['Email'] ?? ''));
  $role     = trim((string)($in['Role'] ?? ''));
  $password = (string)($in['Password'] ?? '');

  if ($username === '' || !preg_match('/^[A-Za-z0-9._\- ]{3,50}$/', $username)) {
    $errors['Username'] = 'Username 3-50 ký tự, chỉ chữ/số/._- và khoảng trắng';
  }
  if ($email === '' || !is_valid_email_gmail($email)) {
    $errors['Email'] = 'Email bắt buộc và phải là @gmail.com';
  }
  if (!validate_role($role)) {
    $errors['Role'] = 'Role không hợp lệ';
  }

  if ($isCreate) {
    if ($password === '' || !is_strong_password($password)) {
      $errors['Password'] = 'Mật khẩu tối thiểu 8 ký tự, có hoa, thường, số, ký tự đặc biệt và không có khoảng trắng';
    }
  } else {
    if (isset($in['Password']) && $password !== '' && !is_strong_password($password)) {
      $errors['Password'] = 'Mật khẩu tối thiểu 8 ký tự, có hoa, thường, số, ký tự đặc biệt và không có khoảng trắng';
    }
  }

  return [$errors, $username, $email, $role, $password];
}

try {
  // Kiểm tra email tồn tại
  if ($method === 'GET' && $action === 'check_email') {
    $email = trim((string)($_GET['email'] ?? ''));
    if ($email === '' || !is_valid_email_gmail($email)) {
      http_response_code(422);
      echo json_encode(['ok'=>false,'error'=>'Email không hợp lệ'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $st = $pdo->prepare("SELECT COUNT(*) FROM accounts WHERE Email = :e");
    $st->execute([':e'=>$email]);
    $exists = ((int)$st->fetchColumn() > 0);
    echo json_encode(['ok'=>true,'exists'=>$exists], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($method === 'GET' && $id > 0) {
    $stmt = $pdo->prepare("SELECT UserID, Username, Email, Role FROM accounts WHERE UserID = :id");
    $stmt->execute([':id'=>$id]);
    $row = $stmt->fetch();
    if (!$row) {
      http_response_code(404);
      echo json_encode(['ok'=>false,'error'=>'Not found'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    echo json_encode(['ok'=>true,'item'=>$row], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($method === 'POST') {
    $in = body_json();
    [$errors, $username, $email, $role, $password] = validate_input($in, true);
    if ($errors) {
      http_response_code(422);
      echo json_encode(['ok'=>false,'error'=>'Validation error','fields'=>$errors], JSON_UNESCAPED_UNICODE);
      exit;
    }
    // Unique
    $st = $pdo->prepare("SELECT COUNT(*) FROM accounts WHERE Username = :u OR Email = :e");
    $st->execute([':u'=>$username, ':e'=>$email]);
    if ((int)$st->fetchColumn() > 0) {
      http_response_code(409);
      echo json_encode(['ok'=>false,'error'=>'Username hoặc Email đã tồn tại'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $hash = hash_password_sha256($password);
    $st = $pdo->prepare("INSERT INTO accounts (Username, Email, PasswordHash, Role) VALUES (:u, :e, :ph, :r)");
    $st->execute([':u'=>$username, ':e'=>$email, ':ph'=>$hash, ':r'=>$role]);

    echo json_encode(['ok'=>true,'id'=>(int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($method === 'PUT') {
    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(['ok'=>false,'error'=>'Missing id'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $in = body_json();
    [$errors, $username, $email, $role, $password] = validate_input($in, false);
    if ($errors) {
      http_response_code(422);
      echo json_encode(['ok'=>false,'error'=>'Validation error','fields'=>$errors], JSON_UNESCAPED_UNICODE);
      exit;
    }
    // Unique except self
    $st = $pdo->prepare("SELECT COUNT(*) FROM accounts WHERE (Username = :u OR Email = :e) AND UserID <> :id");
    $st->execute([':u'=>$username, ':e'=>$email, ':id'=>$id]);
    if ((int)$st->fetchColumn() > 0) {
      http_response_code(409);
      echo json_encode(['ok'=>false,'error'=>'Username hoặc Email đã tồn tại'], JSON_UNESCAPED_UNICODE);
      exit;
    }

    if ($password !== '') {
      $hash = hash_password_sha256($password);
      $sql = "UPDATE accounts SET Username=:u, Email=:e, Role=:r, PasswordHash=:ph WHERE UserID=:id";
      $args = [':u'=>$username, ':e'=>$email, ':r'=>$role, ':ph'=>$hash, ':id'=>$id];
    } else {
      $sql = "UPDATE accounts SET Username=:u, Email=:e, Role=:r WHERE UserID=:id";
      $args = [':u'=>$username, ':e'=>$email, ':r'=>$role, ':id'=>$id];
    }
    $st = $pdo->prepare($sql);
    $st->execute($args);
    echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($method === 'PATCH' && $action === 'reset_password') {
    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(['ok'=>false,'error'=>'Missing id'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $in = body_json();
    $password = (string)($in['Password'] ?? '');
    if ($password === '' || !is_strong_password($password)) {
      http_response_code(422);
      echo json_encode(['ok'=>false,'error'=>'Mật khẩu tối thiểu 8 ký tự, có hoa, thường, số, ký tự đặc biệt và không khoảng trắng'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $hash = hash_password_sha256($password);
    $st = $pdo->prepare("UPDATE accounts SET PasswordHash=:ph WHERE UserID=:id");
    $st->execute([':ph'=>$hash, ':id'=>$id]);
    echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($method === 'DELETE') {
    if ($id <= 0) {
      http_response_code(400);
      echo json_encode(['ok'=>false,'error'=>'Missing id'], JSON_UNESCAPED_UNICODE);
      exit;
    }
    $st = $pdo->prepare("DELETE FROM accounts WHERE UserID = :id");
    $st->execute([':id'=>$id]);
    echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE);
    exit;
  }

  http_response_code(405);
  echo json_encode(['ok'=>false,'error'=>'Method not allowed'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'Server error'], JSON_UNESCAPED_UNICODE);
}