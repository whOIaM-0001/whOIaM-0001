package com.example.kmalibrary.ui.readermain.home;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.databinding.ActivityReaderBookDetailBinding;
import com.example.kmalibrary.network.Book;
import com.example.kmalibrary.ui.borrow.BorrowActivity;

public class ReaderBookDetailActivity extends AppCompatActivity {

    private ActivityReaderBookDetailBinding binding;
    private Book book;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityReaderBookDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        book = (Book) getIntent().getSerializableExtra("BOOK_OBJ");
        if (book != null) {
            binding.tvCode.setText(n(book.getMaS()));
            binding.tvName.setText(n(book.getTenS()));
            binding.tvMaTheLoai.setText(n(book.getMaTheLoai()));
            binding.tvTacGia.setText(n(book.getTacGia()));
            binding.tvNamXB.setText(n(book.getNamXB()));
            binding.tvMaNXB.setText(n(book.getMaNhaXuatBan()));
            binding.tvSoLuong.setText(String.valueOf(book.getSoLuong()));
            binding.tvTinhTrang.setText(n(book.getTinhTrang()));
        }

        binding.fabBorrow.setOnClickListener(v -> {
            String maS = book != null ? book.getMaS() : null;
            Intent i = new Intent(ReaderBookDetailActivity.this, BorrowActivity.class);
            if (maS != null) i.putExtra("EXTRA_MA_SACH", maS);
            startActivity(i);
        });
    }

    private String n(String s){ return (s==null || s.trim().isEmpty()) ? "—" : s; }
}