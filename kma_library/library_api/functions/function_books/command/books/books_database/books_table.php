<?php
// books_table.php — list for table (TinhTrang tự tính theo SoLuong)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

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
    echo json_encode(['ok'=>true,'data'=>$rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}