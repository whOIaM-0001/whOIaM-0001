-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 08, 2025 at 12:14 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kma_library`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `UserID` int(11) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `Role` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`UserID`, `Username`, `Email`, `PasswordHash`, `Role`) VALUES
(1, 'Admin', 'Admin@gmail.com', '6f2cb9dd8f4b65e24e1c3f3fa5bc57982349237f11abceacd45bbcb74d621c25', 'Admin'),
(2, 'Nanthaxay', 'Nan@gmail.com', '29aa00c2398a3e5acebd4ea68992fe64ee7d76c34e9ef573807787977ef78ff7', 'Reader'),
(4, 'Tha', 'tha@gmail.com', '55233a17dac9f45744c2ac56b7fc1f2bb2c452c099b4b2a7743c5253b040e281', 'Reader'),
(5, 'Champathong', 'champa@gmail.com', 'e785803e092554bcfdac727c78da8a700df701e7683d50a4aaf0b580de431fe6', 'Librarian');

-- --------------------------------------------------------

--
-- Table structure for table `bandoc`
--

CREATE TABLE `bandoc` (
  `maBD` varchar(25) NOT NULL,
  `HoTen` varchar(100) NOT NULL,
  `NgaySinh` date NOT NULL,
  `Lop` varchar(50) DEFAULT NULL,
  `Khoa` varchar(50) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `SoDienThoai` varchar(20) DEFAULT NULL,
  `DiaChi` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Triggers `bandoc`
--
DELIMITER $$
CREATE TRIGGER `trg_bandoc_before_insert` BEFORE INSERT ON `bandoc` FOR EACH ROW BEGIN
  IF NEW.NgaySinh >= CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NgaySinh must be before today';
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_bandoc_before_update` BEFORE UPDATE ON `bandoc` FOR EACH ROW BEGIN
  IF NEW.NgaySinh >= CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NgaySinh must be before today';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `cardregister`
--

CREATE TABLE `cardregister` (
  `maSVHV` varchar(25) NOT NULL,
  `hoTen` varchar(100) NOT NULL,
  `ngaySinh` date DEFAULT NULL,
  `lop` varchar(50) DEFAULT NULL,
  `sdt` varchar(100) DEFAULT NULL,
  `gmail` varchar(100) DEFAULT NULL,
  `gioiTinh` enum('Nam','Nữ') NOT NULL,
  `chucVu` enum('Học viên','Sinh viên') NOT NULL,
  `he` enum('Quốc tế','Dân Sự') NOT NULL,
  `ngayLamThe` date DEFAULT NULL,
  `ngayHetHanThe` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cardregister`
--

INSERT INTO `cardregister` (`maSVHV`, `hoTen`, `ngaySinh`, `lop`, `sdt`, `gmail`, `gioiTinh`, `chucVu`, `he`, `ngayLamThe`, `ngayHetHanThe`) VALUES
('010001', 'Nguyễn Văn An', '2001-05-12', 'CTK41', '0912345671', 'an.nguyen01@example.com', 'Nam', 'Sinh viên', 'Dân Sự', '2024-08-01', '2027-07-31'),
('010002', 'Trần Thị Bích', '2002-11-03', 'CTK42', '0912345672', 'bich.tran02@example.com', 'Nữ', 'Học viên', 'Quốc tế', '2024-09-05', '2027-09-04'),
('010003', 'Lê Minh Cường', '2000-02-28', 'KT01', '0912345673', 'cuong.le03@example.com', 'Nam', 'Sinh viên', 'Dân Sự', '2024-07-15', '2027-07-14'),
('010004', 'Phạm Thị Dương', '2003-07-19', 'KT02', '0912345674', 'duong.pham04@example.com', 'Nữ', 'Học viên', 'Quốc tế', '2024-10-01', '2027-09-30'),
('010005', 'Hoàng Văn E', '1999-12-05', 'CTK41', '0912345675', 'e.hoang05@example.com', 'Nam', 'Sinh viên', 'Dân Sự', '2024-06-20', '2027-06-19'),
('010006', 'Đỗ Thị Hạnh', '2001-03-22', 'CTK43', '0912345676', 'hanh.do06@example.com', 'Nữ', 'Học viên', 'Dân Sự', '2024-08-10', '2027-08-09'),
('010007', 'Vũ Quốc Huy', '2002-09-09', 'KT01', '0912345677', 'huy.vu07@example.com', 'Nam', 'Sinh viên', 'Quốc tế', '2024-11-12', '2027-11-11'),
('010008', 'Ngô Thị Kim', '2000-01-30', 'CTK42', '0912345678', 'kim.ngo08@example.com', 'Nữ', 'Học viên', 'Dân Sự', '2024-05-03', '2027-05-02'),
('010009', 'Bùi Văn Long', '2003-04-14', 'CTK44', '0912345679', 'long.bui09@gmail.com', 'Nam', 'Học viên', 'Quốc tế', '2024-12-01', '2027-11-30'),
('010010', 'Trương Thị My', '2001-08-25', 'KT02', '0912345680', 'my.truong10@example.com', 'Nữ', 'Học viên', 'Dân Sự', '2024-09-20', '2027-09-19'),
('010011', 'Nanthaxay', '2000-11-18', 'CTL01', '0123456789', 'nan@gmail.com', 'Nam', 'Học viên', 'Quốc tế', '2025-10-08', '2026-08-30'),
('010012', 'Tha', '1998-10-31', 'CTL01', '0123456789', 'tha@gmail.com', 'Nam', 'Học viên', 'Quốc tế', '2025-10-08', '2025-10-31');

-- --------------------------------------------------------

--
-- Table structure for table `iden`
--

CREATE TABLE `iden` (
  `ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `phieumuon`
--

CREATE TABLE `phieumuon` (
  `MaBD` varchar(25) NOT NULL,
  `MaS` char(10) NOT NULL,
  `NgayMuon` date NOT NULL,
  `NgayHenTra` date NOT NULL,
  `TraSach` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quanlymuon`
--

CREATE TABLE `quanlymuon` (
  `MaPhieuMuon` varchar(25) NOT NULL,
  `MaBanDoc` varchar(25) NOT NULL,
  `MaSach` char(10) NOT NULL,
  `NgayMuon` date NOT NULL,
  `NgayTra` date NOT NULL,
  `SoLuongMuon` int(11) NOT NULL,
  `TinhTrang` varchar(15) DEFAULT NULL,
  `NgayQuaHan` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quanlymuon`
--

INSERT INTO `quanlymuon` (`MaPhieuMuon`, `MaBanDoc`, `MaSach`, `NgayMuon`, `NgayTra`, `SoLuongMuon`, `TinhTrang`, `NgayQuaHan`) VALUES
('NAN001', '010003', 'DTD06', '2025-09-19', '2025-11-11', 5, 'Đã trả', 0),
('PM01', '010001', 'MS005', '2025-04-03', '2025-05-05', 3, 'Quá hạn', 156),
('PM02', '010003', 'MS005', '2025-04-03', '2025-05-06', 3, 'Quá hạn', 155),
('PM03', '010002', 'MS004', '2025-02-10', '2025-03-18', 3, 'Quá hạn', 204),
('PM04', '010003', 'MS005', '2025-03-21', '2025-03-21', 3, 'Quá hạn', 201),
('PM05', '010004', 'MS006', '2025-02-11', '2025-04-15', 2, 'Quá hạn', 176),
('PM06', '010005', 'MS006', '2025-03-21', '2025-04-02', 4, 'Quá hạn', 189),
('PM07', '010006', 'MS007', '2025-05-10', '2025-05-11', 2, 'Quá hạn', 150),
('PM08', '010003', 'MS002', '2025-09-17', '2025-09-19', 3, 'Quá hạn', 19),
('PM09', '010012', 'MS003', '2025-10-08', '2025-10-31', 3, 'Đang mượn', 0);

-- --------------------------------------------------------

--
-- Table structure for table `quanlynhaxb`
--

CREATE TABLE `quanlynhaxb` (
  `MaNhaXuatBan` varchar(20) NOT NULL,
  `TenNhaXuatBan` varchar(100) NOT NULL,
  `DiaChi` varchar(100) NOT NULL,
  `SoDienThoai` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quanlynhaxb`
--

INSERT INTO `quanlynhaxb` (`MaNhaXuatBan`, `TenNhaXuatBan`, `DiaChi`, `SoDienThoai`) VALUES
('NXB0001', 'Nhà xuất bản Trẻ', 'Hà Nội', '5426753428'),
('NXB0002', 'Liêu Trí Phong', 'Hà Nội', '6734672309'),
('NXB0003', 'Dân Trí', 'Hà Nội', '9573527855'),
('NXB0004', 'Thông tin & Truyền thông', 'Hà Nội', '011223344'),
('NXB0005', 'Bách khoa Hà Nội', 'Hà Nội', '022334455'),
('NXB0006', 'Khoa học và Kỹ thuật', 'Hà Nội', '033445566'),
('NXB0007', 'Văn Học', 'TP.HCM', '044556677'),
('NXB0008', 'Đại học quốc gia Hà Nội', 'Hà Nội', '055667788'),
('NXB0009', 'Đại học Sư phạm TPHCM', 'TP.HCM', '066778899'),
('NXB0010', 'Hội Nhà Văn', 'Hà Nội', '077889900'),
('NXB0011', 'KMA', 'Hà Nội', '088990011');

-- --------------------------------------------------------

--
-- Table structure for table `quanlytheloai`
--

CREATE TABLE `quanlytheloai` (
  `MaTheLoai` varchar(20) NOT NULL,
  `TenTheLoai` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quanlytheloai`
--

INSERT INTO `quanlytheloai` (`MaTheLoai`, `TenTheLoai`) VALUES
('TL001', 'Giáo trình'),
('TL002', 'Tham khảo'),
('TL003', 'Tiểu thuyết'),
('TL004', 'Luận văn');

-- --------------------------------------------------------

--
-- Table structure for table `sach`
--

CREATE TABLE `sach` (
  `maS` char(10) NOT NULL,
  `TenS` varchar(100) NOT NULL,
  `MaTheLoai` varchar(20) NOT NULL,
  `Tacgia` varchar(50) NOT NULL,
  `NamXB` int(11) NOT NULL,
  `MaNhaXuatBan` varchar(20) NOT NULL,
  `SoLuong` int(11) NOT NULL,
  `TinhTrang` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sach`
--

INSERT INTO `sach` (`maS`, `TenS`, `MaTheLoai`, `Tacgia`, `NamXB`, `MaNhaXuatBan`, `SoLuong`, `TinhTrang`) VALUES
('DTD06', 'Ðời thay đổi khi chúng ta thay đổi', 'TL003', 'Andrew Matthews', 1988, 'NXB0001', 8, 'Còn'),
('MLVN04', 'Mỗi lần vấp ngã là một lần Trưởng Thành', 'TL003', 'Liêu Trí Phong', 2022, 'NXB0002', 33, 'Còn'),
('MS001', 'Lập trình Matlab và ứng dụng', 'TL001', 'Nguyễn Hoàng Hải', 2020, 'NXB0006', 108, 'Còn'),
('MS002', 'Thiết kế mạng Intranet', 'TL001', 'TS. Phạm Huy Hoàng', 2018, 'NXB0005', 73, 'Còn'),
('MS003', 'Tư tưởng Hồ Chí Minh', 'TL001', 'Bộ Giáo dục và Đào tạo', 2021, 'NXB0002', 63, 'Còn'),
('MS004', 'Cơ sở dữ liệu', 'TL001', 'Ngô Thị Bích Thủy', 2011, 'NXB0004', 29, 'Còn'),
('MS005', 'Kỹ năng viết bài văn nghị luận văn học', 'TL001', 'Lê Mai Phương', 2023, 'NXB0002', 25, 'Còn'),
('MS006', 'Sổ tay ngữ văn', 'TL004', 'Hà Thuỳ Linh', 2024, 'NXB0003', 41, 'Còn'),
('MS007', 'Các chuyên đề Lí luận văn học', 'TL004', 'Nguyễn Ngọc Anh', 2024, 'NXB0007', 21, 'Còn'),
('MS008', 'Bộ đề kiểm tra Toán 9', 'TL003', 'Trịnh Văn Bằng', 2024, 'NXB0006', 70, 'Còn'),
('MS009', 'Kỹ năng đọc hiểu chuyên sâu tiếng Anh', 'TL002', 'Lưu Hoằng Trí', 2021, 'NXB0008', 79, 'Còn'),
('MS010', 'Ôn tập & Kiểm tra Tiếng Anh 6', 'TL002', 'Trường Sơn', 2024, 'NXB0009', 21, 'Còn'),
('MS012', 'Phát triển phần mềm ứng dụng', 'TL001', 'Lê Bá Cường', 2025, 'NXB0011', 4, 'Còn'),
('NTLCC08', 'Những Tấm Lòng Cao Cả', 'TL004', 'Edmondo De Amicis', 1886, 'NXB0001', 0, 'Hết'),
('TAVHP03', 'Tội Ác Và Hình Phạt', 'TL003', 'Fyodor Dostoevsky', 1877, 'NXB0010', 21, 'Còn'),
('TTDGBN05', 'Tuổi Trẻ Đáng Giá Bao Nhiêu?', 'TL003', 'Rosie Nguyễn', 2021, 'NXB0010', 0, 'Hết');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Username` (`Username`);

--
-- Indexes for table `bandoc`
--
ALTER TABLE `bandoc`
  ADD PRIMARY KEY (`maBD`);

--
-- Indexes for table `cardregister`
--
ALTER TABLE `cardregister`
  ADD PRIMARY KEY (`maSVHV`);

--
-- Indexes for table `iden`
--
ALTER TABLE `iden`
  ADD PRIMARY KEY (`ID`);

--
-- Indexes for table `phieumuon`
--
ALTER TABLE `phieumuon`
  ADD PRIMARY KEY (`MaBD`,`MaS`),
  ADD KEY `FK_SACH` (`MaS`);

--
-- Indexes for table `quanlymuon`
--
ALTER TABLE `quanlymuon`
  ADD PRIMARY KEY (`MaPhieuMuon`,`MaBanDoc`,`MaSach`),
  ADD KEY `FK_MuonSach` (`MaSach`),
  ADD KEY `FK_MaBanDoc` (`MaBanDoc`);

--
-- Indexes for table `quanlynhaxb`
--
ALTER TABLE `quanlynhaxb`
  ADD PRIMARY KEY (`MaNhaXuatBan`);

--
-- Indexes for table `quanlytheloai`
--
ALTER TABLE `quanlytheloai`
  ADD PRIMARY KEY (`MaTheLoai`);

--
-- Indexes for table `sach`
--
ALTER TABLE `sach`
  ADD PRIMARY KEY (`maS`),
  ADD KEY `FK_TheLoai` (`MaTheLoai`),
  ADD KEY `FK_NhaXB` (`MaNhaXuatBan`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `iden`
--
ALTER TABLE `iden`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `phieumuon`
--
ALTER TABLE `phieumuon`
  ADD CONSTRAINT `FK_BANDOC` FOREIGN KEY (`MaBD`) REFERENCES `bandoc` (`maBD`),
  ADD CONSTRAINT `FK_SACH` FOREIGN KEY (`MaS`) REFERENCES `sach` (`maS`);

--
-- Constraints for table `quanlymuon`
--
ALTER TABLE `quanlymuon`
  ADD CONSTRAINT `FK_MaBanDoc` FOREIGN KEY (`MaBanDoc`) REFERENCES `cardregister` (`maSVHV`) ON UPDATE CASCADE,
  ADD CONSTRAINT `FK_MuonSach` FOREIGN KEY (`MaSach`) REFERENCES `sach` (`maS`);

--
-- Constraints for table `sach`
--
ALTER TABLE `sach`
  ADD CONSTRAINT `FK_NhaXB` FOREIGN KEY (`MaNhaXuatBan`) REFERENCES `quanlynhaxb` (`MaNhaXuatBan`),
  ADD CONSTRAINT `FK_TheLoai` FOREIGN KEY (`MaTheLoai`) REFERENCES `quanlytheloai` (`MaTheLoai`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
