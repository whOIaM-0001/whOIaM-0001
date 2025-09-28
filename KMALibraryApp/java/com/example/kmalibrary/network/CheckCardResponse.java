package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class CheckCardResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("exists") public Boolean exists; // có thể null
    @SerializedName("hoTen") public String hoTen;
    @SerializedName("error") public String error;
}