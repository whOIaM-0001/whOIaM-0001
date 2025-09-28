package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class MyLoanItem implements Serializable {
    @SerializedName("MaPhieuMuon") public String MaPhieuMuon;
    @SerializedName("MaSach") public String MaSach;
    @SerializedName("TenS") public String TenS;
    @SerializedName("MaBanDoc") public String MaBanDoc;
    @SerializedName("HoTen") public String HoTen;
    @SerializedName("SoLuongMuon") public Integer SoLuongMuon;
    @SerializedName("NgayMuon") public String NgayMuon; // YYYY-MM-DD
    @SerializedName("NgayTra") public String NgayTra;   // YYYY-MM-DD
    @SerializedName("TinhTrang") public String TinhTrang;
    @SerializedName("NgayQuaHan") public Integer NgayQuaHan;
}