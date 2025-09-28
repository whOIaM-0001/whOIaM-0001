package com.example.kmalibrary.ui.readermain.myloans;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.databinding.ActivityMyLoanDetailBinding;
import com.example.kmalibrary.network.MyLoanItem;

public class MyLoansDetailActivity extends AppCompatActivity {

    private ActivityMyLoanDetailBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMyLoanDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        MyLoanItem it = (MyLoanItem) getIntent().getSerializableExtra("ITEM");
        if (it != null) {
            binding.tvMaPhieu.setText(n(it.MaPhieuMuon));
            binding.tvMaSach.setText(n(it.MaSach));
            binding.tvTenSach.setText(n(it.TenS));
            binding.tvMaDocGia.setText(n(it.MaBanDoc));
            binding.tvTenDocGia.setText(n(it.HoTen));
            binding.tvSoLuong.setText(it.SoLuongMuon==null? "—" : String.valueOf(it.SoLuongMuon));
            binding.tvNgayMuon.setText(n(it.NgayMuon));
            binding.tvNgayTra.setText(n(it.NgayTra));
            binding.tvTinhTrang.setText(n(it.TinhTrang));
            binding.tvNgayQuaHan.setText(it.NgayQuaHan==null? "—" : String.valueOf(it.NgayQuaHan));
        }
    }

    private String n(String s){ return (s==null || s.trim().isEmpty()) ? "—" : s; }
}