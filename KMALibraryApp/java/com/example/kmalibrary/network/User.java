package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

// Ánh xạ linh hoạt: nhận cả khóa HOA (UserID/Username/Email/Role) và thường (id/name/email/role)
public class User {

    @SerializedName(value = "UserID", alternate = {"id"})
    private int userId;

    @SerializedName(value = "Email", alternate = {"email"})
    private String email;

    @SerializedName(value = "Username", alternate = {"name"})
    private String username;

    @SerializedName(value = "Role", alternate = {"role"})
    private String role;

    // Getters "mới"
    public int getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getUsername() { return username; }
    public String getRole() { return role; }

    // Tương thích ngược với code cũ (đang gọi getId()/getName())
    public int getId() { return userId; }
    public String getName() { return username; }
}