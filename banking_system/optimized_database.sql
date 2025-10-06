-- Tạo database
CREATE DATABASE banking_system_optimized;
USE banking_system_optimized;

-- ===============================
-- BẢNG CREDIT CARDS - TỐI ƯU
-- ===============================
CREATE TABLE credit_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- 🔴 CÁC CỘT MÃ HÓA (chỉ 3 cột thực sự nhạy cảm)
    card_number VARBINARY(255) COMMENT 'Số thẻ - MÃ HÓA',
    cvv VARBINARY(255) COMMENT 'Mã CVV - MÃ HÓA', 
    pin_code VARBINARY(255) COMMENT 'Mã PIN - MÃ HÓA',
    
    -- 🟢 CÁC CỘT KHÔNG MÃ HÓA (performance cao)
    card_holder_name VARCHAR(255) NOT NULL COMMENT 'Tên chủ thẻ',
    expiry_date VARCHAR(10) NOT NULL COMMENT 'Ngày hết hạn (MM/YYYY)',
    card_type ENUM('Visa', 'MasterCard', 'JCB', 'American Express') NOT NULL,
    bank_name VARCHAR(255) NOT NULL COMMENT 'Tên ngân hàng',
    credit_limit DECIMAL(15,2) DEFAULT 0 COMMENT 'Hạn mức tín dụng (VNĐ)',
    current_balance DECIMAL(15,2) DEFAULT 0 COMMENT 'Số dư hiện tại',
    available_credit DECIMAL(15,2) DEFAULT 0 COMMENT 'Tín dụng khả dụng',
    billing_address TEXT COMMENT 'Địa chỉ thanh toán',
    phone_number VARCHAR(20) COMMENT 'Số điện thoại',
    email VARCHAR(255) COMMENT 'Email liên hệ',
    issue_date VARCHAR(10) COMMENT 'Ngày phát hành',
    
    -- Metadata và status
    status ENUM('active', 'inactive', 'blocked', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 🚀 INDEX CHO PERFORMANCE CAO
    INDEX idx_user_id (user_id),
    INDEX idx_card_holder (card_holder_name),
    INDEX idx_bank_name (bank_name),
    INDEX idx_card_type (card_type),
    INDEX idx_status (status),
    INDEX idx_phone (phone_number),
    INDEX idx_email (email)
);

-- ===============================
-- BẢNG CCCD - TỐI ƯU  
-- ===============================
CREATE TABLE cccd_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 🔴 CÁC CỘT MÃ HÓA (chỉ 2 cột thực sự nhạy cảm)
    cccd_number VARBINARY(255) COMMENT 'Số CCCD - MÃ HÓA',
    date_of_birth VARBINARY(255) COMMENT 'Ngày sinh - MÃ HÓA',
    
    -- 🟢 CÁC CỘT KHÔNG MÃ HÓA
    full_name VARCHAR(255) NOT NULL COMMENT 'Họ và tên đầy đủ',
    gender ENUM('Nam', 'Nữ', 'Khác') NOT NULL COMMENT 'Giới tính',
    nationality VARCHAR(100) DEFAULT 'Việt Nam' COMMENT 'Quốc tịch',
    hometown VARCHAR(500) COMMENT 'Quê quán',
    permanent_address TEXT COMMENT 'Địa chỉ thường trú',
    current_address TEXT COMMENT 'Địa chỉ tạm trú',
    phone_number VARCHAR(20) COMMENT 'Số điện thoại',
    email VARCHAR(255) COMMENT 'Email',
    
    -- Thông tin nghề nghiệp
    occupation VARCHAR(255) COMMENT 'Nghề nghiệp',
    workplace VARCHAR(500) COMMENT 'Nơi làm việc',
    monthly_income DECIMAL(15,2) COMMENT 'Thu nhập hàng tháng',
    education_level ENUM('Tiểu học', 'THCS', 'THPT', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ') COMMENT 'Trình độ học vấn',
    
    -- Thông tin gia đình
    marital_status ENUM('Độc thân', 'Đã kết hôn', 'Đã ly hôn', 'Góa phụ') COMMENT 'Tình trạng hôn nhân',
    father_name VARCHAR(255) COMMENT 'Tên cha',
    mother_name VARCHAR(255) COMMENT 'Tên mẹ',
    spouse_name VARCHAR(255) COMMENT 'Tên vợ/chồng',
    number_of_children INT DEFAULT 0 COMMENT 'Số con',
    
    -- Liên hệ khẩn cấp
    emergency_contact VARCHAR(255) COMMENT 'Người liên hệ khẩn cấp',
    emergency_phone VARCHAR(20) COMMENT 'SĐT khẩn cấp',
    emergency_relationship VARCHAR(100) COMMENT 'Mối quan hệ với người liên hệ',
    
    -- Thông tin giấy tờ
    issue_date VARCHAR(10) COMMENT 'Ngày cấp',
    issue_place VARCHAR(500) COMMENT 'Nơi cấp',
    expiry_date VARCHAR(10) COMMENT 'Ngày hết hạn',
    
    -- Metadata
    status ENUM('active', 'inactive', 'expired', 'lost') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 🚀 INDEX CHO TÌM KIẾM NHANH
    INDEX idx_full_name (full_name),
    INDEX idx_phone (phone_number),
    INDEX idx_email (email),
    INDEX idx_occupation (occupation),
    INDEX idx_workplace (workplace),
    INDEX idx_hometown (hometown),
    INDEX idx_status (status),
    INDEX idx_education (education_level),
    FULLTEXT idx_search (full_name, occupation, workplace, hometown)
);

-- ===============================
-- DỮ LIỆU MẪU TỐI ƯU
-- ===============================

-- Credit Cards
INSERT INTO credit_cards (
    user_id, 
    -- Chỉ mã hóa 3 cột nhạy cảm
    card_number, cvv, pin_code,
    -- Còn lại không mã hóa
    card_holder_name, expiry_date, card_type, bank_name, credit_limit, 
    current_balance, available_credit, billing_address, phone_number, 
    email, issue_date
) VALUES 
(1, 
    AES_ENCRYPT('4532123456789012', 'BankSecure2024!@#'), 
    AES_ENCRYPT('123', 'BankSecure2024!@#'), 
    AES_ENCRYPT('1234', 'BankSecure2024!@#'),
    'Nguyễn Văn An', '12/2027', 'Visa', 'Vietcombank', 50000000.00,
    15000000.00, 35000000.00, '123 Đường Lê Lợi, Q1, TP.HCM', 
    '0901234567', 'nguyenvanan@gmail.com', '01/2022'
),
(2,
    AES_ENCRYPT('5555444433332222', 'BankSecure2024!@#'),
    AES_ENCRYPT('456', 'BankSecure2024!@#'), 
    AES_ENCRYPT('5678', 'BankSecure2024!@#'),
    'Trần Thị Bích Ngọc', '08/2026', 'MasterCard', 'Techcombank', 30000000.00,
    8000000.00, 22000000.00, '456 Đường Nguyễn Huệ, Q1, TP.HCM',
    '0907654321', 'tranbich@yahoo.com', '03/2021'
),
(3,
    AES_ENCRYPT('6011123456789012', 'BankSecure2024!@#'),
    AES_ENCRYPT('789', 'BankSecure2024!@#'),
    AES_ENCRYPT('9101', 'BankSecure2024!@#'),
    'Lê Minh Tuấn', '06/2028', 'Visa', 'VPBank', 75000000.00,
    25000000.00, 50000000.00, '789 Đường Võ Văn Tần, Q3, TP.HCM',
    '0912345678', 'leminhtuan@outlook.com', '05/2023'
);

-- CCCD Details  
INSERT INTO cccd_details (
    -- Chỉ mã hóa 2 cột nhạy cảm
    cccd_number, date_of_birth,
    -- Còn lại không mã hóa
    full_name, gender, nationality, hometown, permanent_address, current_address,
    phone_number, email, occupation, workplace, monthly_income, education_level,
    marital_status, father_name, mother_name, spouse_name, number_of_children,
    emergency_contact, emergency_phone, emergency_relationship,
    issue_date, issue_place, expiry_date
) VALUES 
(
    AES_ENCRYPT('001234567890', 'BankSecure2024!@#'),
    AES_ENCRYPT('15/05/1990', 'BankSecure2024!@#'),
    'Nguyễn Văn An', 'Nam', 'Việt Nam', 'Hà Nội', 
    '456 Đường Giải Phóng, Q. Hai Bà Trưng, Hà Nội',
    '123 Đường Lê Lợi, Q1, TP.HCM', '0901234567', 'nguyenvanan@gmail.com',
    'Kỹ sư phần mềm', 'Công ty FPT Software', 25000000.00, 'Đại học',
    'Đã kết hôn', 'Nguyễn Văn Bình', 'Trần Thị Cúc', 'Phạm Thị Mai', 2,
    'Nguyễn Thị Lan', '0987654321', 'Chị gái',
    '01/01/2020', 'Công an TP.HCM', '01/01/2030'
),
(
    AES_ENCRYPT('001987654321', 'BankSecure2024!@#'),
    AES_ENCRYPT('22/08/1985', 'BankSecure2024!@#'),
    'Trần Thị Bích Ngọc', 'Nữ', 'Việt Nam', 'Đà Nẵng',
    '789 Đường Lê Duẩn, Q. Hải Châu, Đà Nẵng',
    '456 Đường Nguyễn Huệ, Q1, TP.HCM', '0907654321', 'tranbich@yahoo.com',
    'Giám đốc Marketing', 'Công ty Vinamilk', 35000000.00, 'Thạc sĩ',
    'Đã kết hôn', 'Trần Văn Đức', 'Nguyễn Thị Hoa', 'Lê Văn Nam', 1,
    'Trần Văn Minh', '0903456789', 'Em trai',
    '15/03/2019', 'Công an Đà Nẵng', '15/03/2029'
);

-- ===============================
-- VIEW TỐI ƯU CHO BÁO CÁO
-- ===============================

-- View credit card summary (không giải mã, chỉ thống kê)
CREATE VIEW credit_card_summary AS
SELECT 
    id,
    card_holder_name,
    card_type,
    bank_name,
    credit_limit,
    current_balance,
    available_credit,
    status,
    created_at
FROM credit_cards
WHERE status = 'active';

-- View CCCD summary (không giải mã, chỉ thống kê)
CREATE VIEW cccd_summary AS
SELECT 
    id,
    full_name,
    gender,
    occupation,
    education_level,
    marital_status,
    hometown,
    status,
    created_at
FROM cccd_details
WHERE status = 'active';