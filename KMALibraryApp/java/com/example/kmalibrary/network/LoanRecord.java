package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

public class LoanRecord implements Serializable {

    @SerializedName("MaPhieuMuon")
    private String maPhieuMuon;
    @SerializedName("MaBanDoc")
    private String maBanDoc;
    @SerializedName("MaSach")
    private String maSach;
    @SerializedName("NgayMuon")
    private String ngayMuon;
    @SerializedName("NgayTra")
    private String ngayTra;
    @SerializedName("SoLuongMuon")
    private Integer soLuongMuon;
    @SerializedName("TinhTrang")
    private String tinhTrang;
    @SerializedName("NgayQuaHan")
    private Integer ngayQuaHan;

    // Enrich
    private String hoTen;
    private String tenSach;

    public String getMaPhieuMuon() { return maPhieuMuon; }
    public String getMaBanDoc() { return maBanDoc; }
    public String getMaSach() { return maSach; }
    public String getNgayMuon() { return ngayMuon; }
    public String getNgayTra() { return ngayTra; }
    public Integer getSoLuongMuon() { return soLuongMuon == null ? 0 : soLuongMuon; }
    public String getTinhTrang() { return tinhTrang; }
    public Integer getNgayQuaHan() { return ngayQuaHan == null ? 0 : ngayQuaHan; }

    public String getHoTen() { return hoTen; }
    public void setHoTen(String hoTen) { this.hoTen = hoTen; }
    public String getTenSach() { return tenSach; }
    public void setTenSach(String tenSach) { this.tenSach = tenSach; }
}