package com.example.kmalibrary.ui.borrow;

import android.app.DatePickerDialog;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.DatePicker;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.databinding.ActivityBorrowBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.BorrowApiService;
import com.example.kmalibrary.network.BorrowNextIdResponse;
import com.example.kmalibrary.network.BorrowRequest;
import com.example.kmalibrary.network.BorrowResponse;
import com.example.kmalibrary.network.BookLoanItem;
import com.example.kmalibrary.network.BookLoanListResponse;
import com.example.kmalibrary.network.CheckCardResponse;

import java.util.Calendar;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class BorrowActivity extends AppCompatActivity {

    private static final String TAG = "BorrowActivity";
    private ActivityBorrowBinding binding;
    private BorrowApiService api;
    private static final Pattern PM_PATTERN = Pattern.compile("^PM(\\d+)$");
    private String cachedNextId = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityBorrowBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        Log.d(TAG, "onCreate: BorrowActivity opened");

        api = ApiClient.getClient(this).create(BorrowApiService.class);

        // Prefill MaSach từ detail (nếu có)
        String maSach = getIntent().getStringExtra("EXTRA_MA_SACH");
        if (maSach != null && !maSach.trim().isEmpty()) {
            binding.etMaSach.setText(maSach.trim());
        }

        // Ngày mượn = hôm nay (readonly)
        String today = ymdToday();
        binding.etNgayMuon.setText(today);
        binding.etNgayMuon.setEnabled(false);

        // Ngày hẹn trả mặc định = hôm nay + 7 ngày để tránh quên chọn
        String defaultDue = addDays(today, 7);
        binding.etNgayTra.setText(defaultDue);
        binding.etNgayTra.setOnClickListener(v -> openDueDatePicker());

        // Gắn click listeners
        binding.btnBorrow.setOnClickListener(v -> {
            Log.d(TAG, "btnBorrow clicked");
            submitBorrow();
        });
        binding.btnBack.setOnClickListener(v -> {
            Log.d(TAG, "btnBack clicked");
            onBackPressed();
        });

        // Kiểm tra mã độc giả khi rời focus (không chặn bấm Mượn; server sẽ kiểm tra lại)
        binding.etMaDocGia.setOnFocusChangeListener((v, hasFocus) -> {
            if (!hasFocus) checkReaderId();
        });

        // Lấy danh sách phiếu để tự sinh mã tiếp
        fetchNextId();
    }

    private void showLoading(boolean on){
        binding.progress.setVisibility(on ? View.VISIBLE : View.GONE);
        binding.btnBorrow.setEnabled(!on);
    }

    private void fetchNextId(){
        Log.d(TAG, "fetchNextId: requesting getNextId()");
        showLoading(true);
        api.getNextId().enqueue(new Callback<BorrowNextIdResponse>() {
            @Override public void onResponse(@NonNull Call<BorrowNextIdResponse> call, @NonNull Response<BorrowNextIdResponse> resp) {
                if (resp.isSuccessful() && resp.body()!=null && resp.body().ok && resp.body().nextId!=null) {
                    showLoading(false);
                    cachedNextId = resp.body().nextId;
                    Log.d(TAG, "getNextId ok: " + cachedNextId);
                    binding.etMaPhieuMuon.setText(cachedNextId);
                    binding.etMaPhieuMuon.setEnabled(false);
                } else {
                    Log.w(TAG, "getNextId failed, fallback listLoans. code="+resp.code());
                    fallbackNextIdByList();
                }
            }
            @Override public void onFailure(@NonNull Call<BorrowNextIdResponse> call, @NonNull Throwable t) {
                Log.e(TAG, "getNextId onFailure: " + t.getMessage());
                fallbackNextIdByList();
            }
        });
    }

    private void fallbackNextIdByList(){
        api.listLoans().enqueue(new Callback<BookLoanListResponse>() {
            @Override public void onResponse(@NonNull Call<BookLoanListResponse> call, @NonNull Response<BookLoanListResponse> resp) {
                showLoading(false);
                if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                    cachedNextId = computeNextId(resp.body().data);
                } else {
                    cachedNextId = "PM01";
                }
                Log.d(TAG, "fallback nextId: " + cachedNextId);
                binding.etMaPhieuMuon.setText(cachedNextId);
                binding.etMaPhieuMuon.setEnabled(false);
            }
            @Override public void onFailure(@NonNull Call<BookLoanListResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Log.e(TAG, "listLoans onFailure: " + t.getMessage());
                cachedNextId = "PM01";
                binding.etMaPhieuMuon.setText(cachedNextId);
                binding.etMaPhieuMuon.setEnabled(false);
            }
        });
    }

    private String computeNextId(List<BookLoanItem> rows){
        int maxNum = 0;
        int pad = 2;
        if (rows != null) {
            for (BookLoanItem r : rows) {
                String id = r.MaPhieuMuon != null ? r.MaPhieuMuon.trim() : "";
                Matcher m = PM_PATTERN.matcher(id);
                if (m.matches()) {
                    String numStr = m.group(1);
                    int n = 0;
                    try { n = Integer.parseInt(numStr); } catch(Exception ignored){}
                    if (n > maxNum) {
                        maxNum = n;
                        pad = Math.max(pad, numStr.length());
                    }
                }
            }
        }
        int next = maxNum + 1;
        String fmt = String.format("%0" + pad + "d", next);
        return "PM" + fmt;
    }

    private void openDueDatePicker(){
        String start = binding.etNgayMuon.getText().toString().trim();
        Calendar min = ymdToCal(start);
        Calendar max = (Calendar) min.clone();
        max.add(Calendar.MONTH, 6);

        Calendar init = ymdToCal(binding.etNgayTra.getText().toString().trim());
        if (init == null) init = (Calendar) min.clone();

        DatePickerDialog dlg = new DatePickerDialog(this,
                (DatePicker view, int year, int month, int dayOfMonth) -> {
                    String s = String.format("%04d-%02d-%02d", year, month+1, dayOfMonth);
                    binding.etNgayTra.setText(s);
                },
                init.get(Calendar.YEAR),
                init.get(Calendar.MONTH),
                init.get(Calendar.DAY_OF_MONTH));

        dlg.getDatePicker().setMinDate(min.getTimeInMillis());
        dlg.getDatePicker().setMaxDate(max.getTimeInMillis());
        dlg.show();
    }

    private void checkReaderId(){
        String id = binding.etMaDocGia.getText().toString().trim();
        if (id.isEmpty()) return;
        Log.d(TAG, "checkReaderId: " + id);
        api.checkCard("checkCard", id).enqueue(new Callback<CheckCardResponse>() {
            @Override public void onResponse(@NonNull Call<CheckCardResponse> call, @NonNull Response<CheckCardResponse> resp) {
                if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                    binding.tilMaDocGia.setError(null);
                } else {
                    String msg = (resp.body()!=null && resp.body().error!=null) ? resp.body().error : "Mã độc giả không hợp lệ";
                    binding.tilMaDocGia.setError(msg);
                }
            }
            @Override public void onFailure(@NonNull Call<CheckCardResponse> call, @NonNull Throwable t) {
                Log.e(TAG, "checkReaderId onFailure: " + t.getMessage());
            }
        });
    }

    private void submitBorrow(){
        Log.d(TAG, "submitBorrow: start");
        String maPhieu = safe(binding.etMaPhieuMuon.getText());
        String maSach = safe(binding.etMaSach.getText());
        String maDocGia = safe(binding.etMaDocGia.getText());
        String ngayMuon = safe(binding.etNgayMuon.getText());
        String ngayTra  = safe(binding.etNgayTra.getText());
        int soLuong;
        try { soLuong = Integer.parseInt(safe(binding.etSoLuong.getText())); } catch(Exception e){ soLuong = 1; }

        // Validate nhẹ phía client
        if (maPhieu.isEmpty() || maSach.isEmpty() || maDocGia.isEmpty() || ngayTra.isEmpty()) {
            Toast.makeText(this, "Vui lòng nhập đủ thông tin", Toast.LENGTH_SHORT).show();
            Log.w(TAG, "submitBorrow: missing fields");
            return;
        }
        if (soLuong < 1 || soLuong > 5) {
            Toast.makeText(this, "Số lượng mượn 1..5", Toast.LENGTH_SHORT).show();
            Log.w(TAG, "submitBorrow: invalid qty=" + soLuong);
            return;
        }
        if (!isDueInRange(ngayMuon, ngayTra)) {
            Toast.makeText(this, "Ngày hẹn trả không hợp lệ (<= 6 tháng, >= ngày mượn)", Toast.LENGTH_SHORT).show();
            Log.w(TAG, "submitBorrow: due out of range: " + ngayTra);
            return;
        }

        showLoading(true);
        BorrowRequest body = new BorrowRequest(maPhieu, maSach, maDocGia, soLuong, ngayMuon, ngayTra);
        Log.d(TAG, "submitBorrow: calling API createLoan with " +
                "MaPhieu=" + maPhieu + ", MaSach=" + maSach + ", MaBanDoc=" + maDocGia +
                ", SL=" + soLuong + ", NgayMuon=" + ngayMuon + ", NgayTra=" + ngayTra);

        api.createLoan(body).enqueue(new Callback<BorrowResponse>() {
            @Override public void onResponse(@NonNull Call<BorrowResponse> call, @NonNull Response<BorrowResponse> resp) {
                showLoading(false);
                Log.d(TAG, "createLoan onResponse: code=" + resp.code());
                if (resp.isSuccessful() && resp.body()!=null) {
                    Log.d(TAG, "createLoan body: ok=" + resp.body().ok + " error=" + resp.body().error);
                }
                if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                    Toast.makeText(BorrowActivity.this, "Mượn sách thành công!", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    String msg = "Mượn thất bại";
                    if (resp.body()!=null && resp.body().error!=null) msg = resp.body().error;
                    Toast.makeText(BorrowActivity.this, msg, Toast.LENGTH_LONG).show();
                }
            }
            @Override public void onFailure(@NonNull Call<BorrowResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Log.e(TAG, "createLoan onFailure: " + t.getMessage(), t);
                Toast.makeText(BorrowActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    // Utils
    private String safe(CharSequence cs){ return cs==null ? "" : cs.toString().trim(); }

    private String ymdToday(){
        Calendar c = Calendar.getInstance();
        return String.format("%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH)+1, c.get(Calendar.DAY_OF_MONTH));
    }
    private String addDays(String ymd, int days){
        Calendar c = ymdToCal(ymd);
        if (c == null) c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, days);
        return String.format("%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH)+1, c.get(Calendar.DAY_OF_MONTH));
    }
    private Calendar ymdToCal(String ymd){
        if (ymd==null || !ymd.matches("^\\d{4}-\\d{2}-\\d{2}$")) return null;
        String[] p = ymd.split("-");
        Calendar c = Calendar.getInstance();
        c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1])-1, Integer.parseInt(p[2]), 0,0,0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }
    private boolean isDueInRange(String borrow, String due){
        Calendar b = ymdToCal(borrow); Calendar d = ymdToCal(due);
        if (b==null || d==null) return false;
        Calendar max = (Calendar) b.clone(); max.add(Calendar.MONTH, 6);
        return !d.before(b) && !d.after(max);
    }
}