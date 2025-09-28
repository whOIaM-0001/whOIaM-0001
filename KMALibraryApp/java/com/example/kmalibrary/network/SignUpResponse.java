package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class SignUpResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("UserID") public String userID;
    @SerializedName("Username") public String username;
    @SerializedName("Role") public String role;
    @SerializedName("error") public String error;
}