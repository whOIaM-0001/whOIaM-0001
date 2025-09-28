package com.example.kmalibrary.ui.readerdetail;

import android.os.Bundle;
// Bỏ import View vì không cần dùng nữa
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.R;
import com.example.kmalibrary.databinding.ActivityReaderDetailBinding;
import com.example.kmalibrary.databinding.DetailItemRowBinding; // <-- THÊM MỚI: Import lớp Binding của layout được include
import com.example.kmalibrary.network.Reader;

public class ReaderDetailActivity extends AppCompatActivity {

    private ActivityReaderDetailBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityReaderDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        // Bắt sự kiện cho nút back trên Toolbar
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        Reader reader = (Reader) getIntent().getSerializableExtra("READER_DETAIL");

        if (reader != null) {
            populateDetails(reader);
        }

        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Chi tiết Độc giả");
        }
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }

    private void populateDetails(Reader reader) {
        binding.tvDetailReaderName.setText(reader.getHoTen());
        binding.tvDetailReaderId.setText(reader.getMaSVHV());

        // --- KHU VỰC ĐÃ SỬA LỖI ---
        // Bây giờ chúng ta truyền trực tiếp đối tượng Binding vào hàm
        setDetailRow(binding.rowNgaySinh, "Ngày sinh", reader.getNgaySinh());
        setDetailRow(binding.rowLop, "Lớp", reader.getLop());
        setDetailRow(binding.rowSdt, "Số điện thoại", reader.getSdt());
        setDetailRow(binding.rowGmail, "Gmail", reader.getGmail());
        setDetailRow(binding.rowGioiTinh, "Giới tính", reader.getGioiTinh());
        setDetailRow(binding.rowChucVu, "Chức vụ", reader.getChucVu());
        setDetailRow(binding.rowNgayLamThe, "Ngày làm thẻ", reader.getNgayLamThe());
        setDetailRow(binding.rowNgayHetHan, "Ngày hết hạn", reader.getNgayHetHanThe());
    }

    /**
     * --- HÀM ĐÃ ĐƯỢC NÂNG CẤP ---
     * Hàm helper bây giờ nhận vào một DetailItemRowBinding thay vì một View.
     * Cách này an toàn hơn vì chúng ta không cần dùng findViewById nữa.
     */
    private void setDetailRow(DetailItemRowBinding rowBinding, String label, String value) {
        // Truy cập trực tiếp vào các TextView thông qua đối tượng binding
        rowBinding.tvLabel.setText(label);
        rowBinding.tvValue.setText(value != null && !value.isEmpty() ? value : "N/A");
    }
}