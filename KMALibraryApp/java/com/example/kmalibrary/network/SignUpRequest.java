package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class SignUpRequest {
    @SerializedName("maSVHV")
    public String maSVHV;

    @SerializedName("email")
    public String email;

    @SerializedName("password")
    public String password;

    // Server đang yêu cầu fullname → thêm trường này
    @SerializedName("fullname")
    public String fullname;

    @SerializedName("role")
    public String role = "Reader";

    // Constructor 4 tham số (khuyến nghị dùng cho Reader)
    public SignUpRequest(String maSVHV, String email, String password, String fullname) {
        this.maSVHV = maSVHV;
        this.email = email;
        this.password = password;
        this.fullname = fullname;
        this.role = "Reader";
    }

    // Giữ tương thích ngược nếu nơi khác vẫn gọi 3 tham số
    public SignUpRequest(String maSVHV, String email, String password) {
        this.maSVHV = maSVHV;
        this.email = email;
        this.password = password;
        this.role = "Reader";
    }
}