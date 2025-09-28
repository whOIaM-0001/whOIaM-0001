package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.io.Serializable;

// Implement Serializable để có thể truyền object này giữa các Activity
public class Book implements Serializable {
    @SerializedName("maS")
    private String maS;
    @SerializedName("TenS")
    private String tenS;
    @SerializedName("MaTheLoai")
    private String maTheLoai;
    @SerializedName("Tacgia")
    private String tacGia;
    @SerializedName("NamXB")
    private String namXB;
    @SerializedName("MaNhaXuatBan")
    private String maNhaXuatBan;
    @SerializedName("SoLuong")
    private int soLuong;
    @SerializedName("TinhTrang")
    private String tinhTrang;

    // Getters
    public String getMaS() { return maS; }
    public String getTenS() { return tenS; }
    public String getMaTheLoai() { return maTheLoai; }
    public String getTacGia() { return tacGia; }
    public String getNamXB() { return namXB; }
    public String getMaNhaXuatBan() { return maNhaXuatBan; }
    public int getSoLuong() { return soLuong; }
    public String getTinhTrang() { return tinhTrang; }
}