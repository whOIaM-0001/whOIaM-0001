package com.example.kmalibrary.network;

// Lớp này chứa dữ liệu gửi đi khi đăng nhập
public class LoginRequest {
    private String email;
    private String password;

    public LoginRequest(String email, String password) {
        this.email = email;
        this.password = password;
    }
}