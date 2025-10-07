package com.example.kmalibrary.network;

import android.content.Context;
import android.content.SharedPreferences;

public class SessionManager {

    private static final String PREF_NAME = "KmaLibrarySession";
    private static final String KEY_AUTH_TOKEN = "auth_token";
    private static final String KEY_USER_NAME  = "user_name";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_ROLE  = "user_role"; // THÊM: lưu Role
    private static final String KEY_CARD_ID    = "card_id";   // THÊM: lưu maSVHV

    private final SharedPreferences prefs;
    private final SharedPreferences.Editor editor;

    public SessionManager(Context context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        editor = prefs.edit();
    }

    // Giữ tương thích ngược
    public void saveUser(String token, String username, String email) {
        saveUser(token, username, email, null);
    }

    // Mới: lưu kèm Role (nếu có)
    public void saveUser(String token, String username, String email, String role) {
        editor.putString(KEY_AUTH_TOKEN, token);
        editor.putString(KEY_USER_NAME, username);
        editor.putString(KEY_USER_EMAIL, email);
        if (role != null) editor.putString(KEY_USER_ROLE, role);
        editor.apply();
    }

    // Cho phép cập nhật riêng Role sau này (khi gọi /me)
    public void saveUserRole(String role) {
        editor.putString(KEY_USER_ROLE, role);
        editor.apply();
    }

    // THÊM: set/get maSVHV
    public void saveCardId(String cardId) {
        if (cardId == null) return;
        editor.putString(KEY_CARD_ID, cardId.trim());
        editor.apply();
    }
    public String fetchCardId() {
        return prefs.getString(KEY_CARD_ID, null);
    }

    public String fetchAuthToken()   { return prefs.getString(KEY_AUTH_TOKEN, null); }
    public String fetchUsername()    { return prefs.getString(KEY_USER_NAME, "KMA User"); }
    public String fetchUserEmail()   { return prefs.getString(KEY_USER_EMAIL, "user@kma.edu.vn"); }
    public String fetchUserRole()    { return prefs.getString(KEY_USER_ROLE, null); }

    public void clearSession() {
        editor.clear();
        editor.apply();
    }
}
