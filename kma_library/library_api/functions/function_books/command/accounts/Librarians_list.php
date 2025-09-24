<?php
// Librarians_list.php - API Phase 1
// Trả JSON (hoặc CSV khi ?export=csv) danh sách tài khoản từ bảng `accounts`
// Cột: UserID, Username, Email, PasswordHash, Role

declare(strict_types=1);

header('Cache-Control: no-store, no-cache, must-revalidate');

if (session_status() !== PHP_SESSION_ACTIVE) {
  session_name('PHPSESSID');
  session_start();
}

// Bảo vệ: yêu cầu đăng nhập
if (empty($_SESSION['user'])) {
  http_response_code(401);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
  exit;
}

/**
 * Cho phép override config bằng file library_api/config.php
 */
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
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'DB connection failed'], JSON_UNESCAPED_UNICODE);
  exit;
}

function pstr(string $k, string $def=''): string { return isset($_GET[$k]) ? trim((string)$_GET[$k]) : $def; }
function pint(string $k, int $def=1): int { $v = isset($_GET[$k]) ? (int)$_GET[$k] : $def; return $v > 0 ? $v : $def; }

$q        = pstr('q', '');
// SỬA Ở ĐÂY: Bỏ mặc định 'Librarian', để mặc định là '' (tất cả)
$role     = pstr('role', ''); 
$page     = pint('page', 1);
$limit    = pint('limit', 20);
$limit    = max(1, min(100, $limit));
$offset   = ($page - 1) * $limit;
$export   = pstr('export', ''); // 'csv' => xuất csv

$sortBy   = pstr('sort_by', 'UserID');
$sortDir  = strtoupper(pstr('sort_dir', 'DESC')) === 'ASC' ? 'ASC' : 'DESC';
$allowSort = ['UserID','Username','Email','Role'];
if (!in_array($sortBy, $allowSort, true)) $sortBy = 'UserID';

// WHERE
$where = [];
$args = [];
if ($role !== '') {
  $where[] = 'Role = :role';
  $args[':role'] = $role;
}
if ($q !== '') {
  $where[] = '(Username LIKE :q OR Email LIKE :q)';
  $args[':q'] = '%' . $q . '%';
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// Count
$sqlCount = "SELECT COUNT(*) FROM accounts $whereSql";
$stmt = $pdo->prepare($sqlCount);
$stmt->execute($args);
$total = (int)($stmt->fetchColumn() ?: 0);

// List
$sqlList = "SELECT UserID, Username, Email, Role
            FROM accounts
            $whereSql
            ORDER BY $sortBy $sortDir
            LIMIT :limit OFFSET :offset";
$stmt = $pdo->prepare($sqlList);
foreach ($args as $k=>$v) $stmt->bindValue($k, $v);
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$items = $stmt->fetchAll();

$totalPages = max(1, (int)ceil($total / $limit));
if ($page > $totalPages) $page = $totalPages;

// Export CSV
if ($export === 'csv') {
  $filename = 'librarians_' . date('Ymd_His') . '.csv';
  header('Content-Type: text/csv; charset=utf-8');
  header("Content-Disposition: attachment; filename=\"$filename\"");
  // BOM để Excel hiển thị UTF-8 đẹp
  echo "\xEF\xBB\xBF";
  $out = fopen('php://output', 'w');
  fputcsv($out, ['UserID','Username','Email','Role']);
  foreach ($items as $r) {
    fputcsv($out, [$r['UserID'],$r['Username'],$r['Email'],$r['Role']]);
  }
  fclose($out);
  exit;
}

// JSON
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
  'ok' => true,
  'page' => $page,
  'limit' => $limit,
  'total' => $total,
  'total_pages' => $totalPages,
  'sort_by' => $sortBy,
  'sort_dir' => $sortDir,
  'items' => $items
], JSON_UNESCAPED_UNICODE);