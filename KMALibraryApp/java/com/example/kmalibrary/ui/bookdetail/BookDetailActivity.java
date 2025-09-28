package com.example.kmalibrary.ui.bookdetail;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.databinding.ActivityBookDetailBinding;
import com.example.kmalibrary.network.Book;

import java.text.NumberFormat;
import java.util.Locale;

public class BookDetailActivity extends AppCompatActivity {

    private ActivityBookDetailBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityBookDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // Thiết lập nút Back trên Toolbar
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        // Nhận dữ liệu Book từ Intent
        Book book = (Book) getIntent().getSerializableExtra("BOOK_DETAIL");

        if (book != null) {
            populateData(book);
        }
    }

    private void populateData(Book book) {
        binding.tvDetailMaS.setText(book.getMaS());
        binding.tvDetailTenS.setText(book.getTenS());
        binding.tvDetailMaTheLoai.setText(book.getMaTheLoai());
        binding.tvDetailTacGia.setText(book.getTacGia());
        binding.tvDetailNamXB.setText(book.getNamXB());
        binding.tvDetailMaNXB.setText(book.getMaNhaXuatBan());
        binding.tvDetailSoLuong.setText(NumberFormat.getInstance(new Locale("vi", "VN")).format(book.getSoLuong()));
        binding.tvDetailTinhTrang.setText(book.getTinhTrang());
    }
}