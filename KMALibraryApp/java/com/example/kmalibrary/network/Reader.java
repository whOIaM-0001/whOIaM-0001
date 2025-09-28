package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class Reader implements Serializable {
    @SerializedName("maSVHV")
    private String maSVHV;
    @SerializedName("hoTen")
    private String hoTen;
    @SerializedName("ngaySinh")
    private String ngaySinh;
    @SerializedName("lop")
    private String lop;
    @SerializedName("sdt")
    private String sdt;
    @SerializedName("gmail")
    private String gmail;
    @SerializedName("gioiTinh")
    private String gioiTinh;
    @SerializedName("chucVu")
    private String chucVu;
    @SerializedName("he") // <-- THÊM DÒNG NÀY
    private String he;      // <-- THÊM DÒNG NÀY
    @SerializedName("ngayLamThe")
    private String ngayLamThe;
    @SerializedName("ngayHetHanThe")
    private String ngayHetHanThe;

    // Getters
    public String getMaSVHV() { return maSVHV; }
    public String getHoTen() { return hoTen; }
    public String getNgaySinh() { return ngaySinh; }
    public String getLop() { return lop; }
    public String getSdt() { return sdt; }
    public String getGmail() { return gmail; }
    public String getGioiTinh() { return gioiTinh; }
    public String getChucVu() { return chucVu; }
    public String getHe() { return he; } // <-- THÊM HÀM NÀY
    public String getNgayLamThe() { return ngayLamThe; }
    public String getNgayHetHanThe() { return ngayHetHanThe; }
}