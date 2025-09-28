package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class WhoAmIReaderResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("email") public String email;
    @SerializedName("role") public String role;
    @SerializedName("maSVHV") public String maSVHV;
    @SerializedName("hoTen") public String hoTen;
    @SerializedName("error") public String error;
}