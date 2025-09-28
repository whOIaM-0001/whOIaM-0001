package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class BookLoanItem {
    @SerializedName("MaPhieuMuon") public String MaPhieuMuon;
    @SerializedName("MaSach") public String MaSach;
    @SerializedName("MaBanDoc") public String MaBanDoc;
    @SerializedName("SoLuongMuon") public Integer SoLuongMuon;
    @SerializedName("NgayMuon") public String NgayMuon;
    @SerializedName("NgayTra") public String NgayTra;
    @SerializedName("TinhTrang") public String TinhTrang;
    @SerializedName("NgayQuaHan") public Integer NgayQuaHan;
}