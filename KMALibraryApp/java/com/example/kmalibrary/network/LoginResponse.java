package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

// Lớp này chứa toàn bộ phản hồi từ API đăng nhập
public class LoginResponse {
    @SerializedName("ok")
    private boolean ok;

    @SerializedName("user")
    private User user;

    @SerializedName("token")
    private String token;

    @SerializedName("error")
    private String error;

    // Getters
    public boolean isOk() { return ok; }
    public User getUser() { return user; }
    public String getToken() { return token; }
    public String getError() { return error; }
}