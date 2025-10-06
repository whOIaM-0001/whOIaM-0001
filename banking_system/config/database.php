<?php
class Database {
    private $host = "localhost";
    private $db_name = "banking_system_optimized";
    private $username = "root";
    private $password = "";
    private $encryption_key = "BankSecure2024!@#";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4", 
                $this->username, 
                $this->password,
                $options
            );
            
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }

    public function getEncryptionKey() {
        return $this->encryption_key;
    }
}
?>