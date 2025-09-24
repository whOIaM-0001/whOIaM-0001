<?php
// books_table.php — Được nâng cấp để kiểm tra quyền Admin
header("Access-Control-Allow-Origin: *");
// Thêm 'Authorization' vào danh sách các header được phép
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Trả về OK cho các yêu cầu pre-flight của trình duyệt
    http_response_code(200);
    exit;
}
header('Content-Type: application/json; charset=utf-8');

// --- BẮT ĐẦU PHẦN KIỂM TRA QUYỀN ---

// Import file chứa hàm xác thực token
require __DIR__ . '/../../../../../api/config/auth_middleware.php';

// Lấy token từ header hoặc từ cookie (đã đăng nhập bằng sign_in.php)
$token = get_bearer_token();
if (!$token) $token = get_jwt_cookie();

// Xác thực token và lấy thông tin người dùng
$user_data = verify_jwt_token($token);

// Nếu token không hợp lệ hoặc hết hạn -> Dừng lại và báo lỗi
if (!$user_data) {
    http_response_code(401); // 401 Unauthorized
    echo json_encode(['ok' => false, 'error' => 'Authentication failed or token expired.']);
    exit;
}

// Kiểm tra vai trò (role) của người dùng: cho phép Admin/Librarian
$role = $user_data['Role'] ?? ($user_data['role'] ?? '');
$role = strtolower((string)$role);
if (!in_array($role, ['admin','librarian'], true)) {
    http_response_code(403); // 403 Forbidden
    echo json_encode(['ok' => false, 'error' => 'Access denied. Administrator or Librarian privileges required.']);
    exit;
}

// --- KẾT THÚC PHẦN KIỂM TRA QUYỀN ---
// Nếu code chạy đến đây, nghĩa là người dùng đã đăng nhập và là admin.

require __DIR__ . '/../../../../../api/config/db.php';

try {
    $sql = "
      SELECT
        TRIM(maS) AS maS, TenS, MaTheLoai, Tacgia, NamXB, MaNhaXuatBan, SoLuong,
        CASE WHEN COALESCE(SoLuong,0) > 0 THEN 'Còn' ELSE 'Hết' END AS TinhTrang
      FROM SACH
      ORDER BY TenS ASC
      LIMIT 2000";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Trả về dữ liệu sách nếu mọi thứ thành công
    echo json_encode(['ok' => true, 'data' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database query failed: ' . $e->getMessage()]);
}