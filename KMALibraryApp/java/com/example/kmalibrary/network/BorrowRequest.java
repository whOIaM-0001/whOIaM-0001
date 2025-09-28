package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class BorrowRequest {
    @SerializedName("MaPhieuMuon") public String maPhieuMuon;
    @SerializedName("MaSach") public String maSach;
    @SerializedName("MaBanDoc") public String maBanDoc;
    @SerializedName("SoLuongMuon") public int soLuongMuon;
    @SerializedName("NgayMuon") public String ngayMuon; // YYYY-MM-DD
    @SerializedName("NgayTra") public String ngayTra;   // YYYY-MM-DD

    public BorrowRequest(String maPhieuMuon, String maSach, String maBanDoc,
                         int soLuongMuon, String ngayMuon, String ngayTra) {
        this.maPhieuMuon = maPhieuMuon;
        this.maSach = maSach;
        this.maBanDoc = maBanDoc;
        this.soLuongMuon = soLuongMuon;
        this.ngayMuon = ngayMuon;
        this.ngayTra = ngayTra;
    }
}