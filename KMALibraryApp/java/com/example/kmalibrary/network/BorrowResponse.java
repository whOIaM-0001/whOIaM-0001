package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class BorrowResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("MaPhieuMuon") public String maPhieuMuon;
    @SerializedName("error") public String error;
}