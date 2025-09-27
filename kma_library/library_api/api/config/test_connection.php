<?php
// test_connection.php
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = new PDO($DB_DSN, $DB_USER, $DB_PASS, $DB_OPTIONS);

    // kiểm tra nhanh: đếm số bản ghi trong bảng SACH (nếu bảng khác, đổi tên)
    $table = 'SACH';
    $cnt = 0;
    try {
        $stmt = $pdo->query("SELECT COUNT(*) AS cnt FROM `$table`");
        $row = $stmt->fetch();
        $cnt = isset($row['cnt']) ? (int)$row['cnt'] : 0;
    } catch (Throwable $e) {
        // nếu bảng không tồn tại, vẫn coi là kết nối thành công nhưng báo lỗi truy vấn
        $table = null;
        $cnt = null;
    }

    echo json_encode([
        'ok' => true,
        'message' => 'Kết nối DB thành công',
        'db' => $DB_NAME,
        'checked_table' => $table,
        'rows_in_table' => $cnt
    ]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Kết nối DB thất bại',
        'error' => $e->getMessage()
    ]);
    exit;
}