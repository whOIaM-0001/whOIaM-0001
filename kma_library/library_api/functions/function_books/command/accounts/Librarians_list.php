<?php
// Librarians_list.php - JWT protected list of accounts with CSV export
// Columns: UserID, Username, Email, Role

declare(strict_types=1);

// CORS + caching
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }

// Config + JWT middleware
require __DIR__ . '/../../../../api/config/config.php';
require __DIR__ . '/../../../../api/config/auth_middleware.php';

// Auth: require Admin or Librarian
$jwt = get_bearer_token(); if (!$jwt) { $jwt = get_jwt_cookie(); }
$user = verify_jwt_token($jwt);
if (!$user) { http_response_code(401); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['ok'=>false,'error'=>'Unauthorized'], JSON_UNESCAPED_UNICODE); exit; }
$role = strtolower((string)($user['Role'] ?? ($user['role'] ?? '')));
if (!in_array($role, ['admin','librarian'], true)) { http_response_code(403); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['ok'=>false,'error'=>'Forbidden'], JSON_UNESCAPED_UNICODE); exit; }

// DB
try {
  $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, $DB_OPTIONS);
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'error' => 'DB connection failed'], JSON_UNESCAPED_UNICODE);
  exit;
}

function pstr(string $k, string $def=''): string { return isset($_GET[$k]) ? trim((string)$_GET[$k]) : $def; }
function pint(string $k, int $def=1): int { $v = isset($_GET[$k]) ? (int)$_GET[$k] : $def; return $v > 0 ? $v : $def; }

$q        = pstr('q', '');
// role filter from query (optional). Default '' -> all
$roleFlt  = pstr('role', ''); 
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
if ($roleFlt !== '') {
  $where[] = 'Role = :role';
  $args[':role'] = $roleFlt;
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