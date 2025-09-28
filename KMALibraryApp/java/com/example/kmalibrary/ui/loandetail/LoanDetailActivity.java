package com.example.kmalibrary.ui.loandetail;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.example.kmalibrary.databinding.ActivityLoanDetailBinding;
import com.example.kmalibrary.network.LoanRecord;

public class LoanDetailActivity extends AppCompatActivity {

    private ActivityLoanDetailBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoanDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);
        if (getSupportActionBar()!=null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        LoanRecord r = (LoanRecord) getIntent().getSerializableExtra("LOAN_DETAIL");
        if (r != null) bind(r);
    }

    private void bind(LoanRecord r){
        binding.tvDetailLoanId.setText(r.getMaPhieuMuon());
        binding.tvDetailReaderName.setText(
                (r.getHoTen()!=null && !r.getHoTen().isEmpty()) ? r.getHoTen() : r.getMaBanDoc()
        );
        binding.tvDetailMaBanDoc.setText(r.getMaBanDoc());
        binding.tvDetailMaSach.setText(r.getMaSach());
        binding.tvDetailTenSach.setText(r.getTenSach()!=null ? r.getTenSach() : "—");
        binding.tvDetailNgayMuon.setText(r.getNgayMuon());
        binding.tvDetailNgayTra.setText(r.getNgayTra());
        binding.tvDetailSoLuong.setText(String.valueOf(r.getSoLuongMuon()));
        binding.tvDetailTinhTrang.setText(r.getTinhTrang());
        binding.tvDetailNgayQuaHan.setText(String.valueOf(r.getNgayQuaHan()));
    }
}