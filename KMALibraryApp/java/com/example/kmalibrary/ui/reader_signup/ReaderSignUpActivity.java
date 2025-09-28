package com.example.kmalibrary.ui.reader_signup;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.databinding.ActivityReaderSignUpBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.ApiService;
import com.example.kmalibrary.network.CheckCardResponse;
import com.example.kmalibrary.network.CheckEmailResponse;
import com.example.kmalibrary.network.SignUpRequest;
import com.example.kmalibrary.network.SignUpResponse;

import java.util.regex.Pattern;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReaderSignUpActivity extends AppCompatActivity {

    private ActivityReaderSignUpBinding binding;
    private ApiService api;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable cardCheckTask;

    // CHỈ KHAI BÁO Ở ĐÂY (không lặp bên dưới)
    private Runnable emailCheckTask;
    private String lastCheckedEmail = null;

    private String currentHoTen = null;

    private static final Pattern GMAIL_RE = Pattern.compile("^[A-Za-z0-9._%+-]+@gmail\\.com$");
    private static final Pattern PASS_RE  = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])\\S{8,}$");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityReaderSignUpBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> onBackPressed());

        api = ApiClient.getClient(this).create(ApiService.class);

        // Ẩn helperText dưới ô mật khẩu
        binding.tilPassword.setHelperText(null);
        binding.tilPassword.setHelperTextEnabled(false);

        // Nhập mã thẻ -> debounce 500ms -> gọi checkCard
        binding.etMaThe.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                String id = s.toString().trim();
                // reset UI
                binding.tilMaThe.setError(null);
                binding.tvHoTen.setVisibility(View.GONE);
                binding.groupMore.setVisibility(View.GONE);
                currentHoTen = null;
                binding.btnSignUp.setEnabled(false);

                if (cardCheckTask != null) handler.removeCallbacks(cardCheckTask);
                if (id.isEmpty()) return;

                cardCheckTask = () -> checkCard(id);
                handler.postDelayed(cardCheckTask, 500);
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        // TextWatcher dùng chung cho Email/Password/Confirm
        TextWatcher commonWatcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                scheduleEmailCheckIfNeeded();
                updateSignUpEnabled();
            }
            @Override public void afterTextChanged(Editable s) {}
        };
        binding.etEmail.addTextChangedListener(commonWatcher);
        binding.etPassword.addTextChangedListener(commonWatcher);
        binding.etConfirm.addTextChangedListener(commonWatcher);

        // Hiển thị lỗi khi rời ô Password/Confirm
        binding.etPassword.setOnFocusChangeListener((v, hasFocus) -> {
            if (!hasFocus) validatePassword(true);
        });
        binding.etConfirm.setOnFocusChangeListener((v, hasFocus) -> {
            if (!hasFocus) validateConfirm(true);
        });

        binding.btnSignUp.setOnClickListener(v -> submit());
    }

    private void showLoading(boolean on){
        binding.progressBar.setVisibility(on ? View.VISIBLE : View.GONE);
        binding.btnSignUp.setEnabled(!on && binding.groupMore.getVisibility()==View.VISIBLE && currentHoTen!=null);
    }

    private void updateSignUpEnabled(){
        boolean ok = currentHoTen != null
                && binding.groupMore.getVisibility() == View.VISIBLE
                && validateEmail(false)
                && validatePassword(false)
                && validateConfirm(false)
                && binding.tilEmail.getError() == null
                && binding.tilPassword.getError() == null
                && binding.tilConfirm.getError() == null;
        binding.btnSignUp.setEnabled(ok);
    }

    private void checkCard(String maSVHV){
        showLoading(true);
        api.checkReaderCard("checkCard", maSVHV).enqueue(new Callback<CheckCardResponse>() {
            @Override public void onResponse(@NonNull Call<CheckCardResponse> call, @NonNull Response<CheckCardResponse> resp) {
                showLoading(false);
                if (!resp.isSuccessful() || resp.body()==null) {
                    binding.tilMaThe.setError("Kiểm tra mã thẻ thất bại");
                    return;
                }
                CheckCardResponse b = resp.body();
                if (!b.ok) {
                    binding.tilMaThe.setError(b.error != null ? b.error : "Mã thẻ không hợp lệ");
                    return;
                }
                currentHoTen = b.hoTen;
                binding.tvHoTen.setText("Họ tên: " + (currentHoTen==null?"":currentHoTen));
                binding.tvHoTen.setVisibility(View.VISIBLE);
                binding.groupMore.setVisibility(View.VISIBLE);
                updateSignUpEnabled();
            }
            @Override public void onFailure(@NonNull Call<CheckCardResponse> call, @NonNull Throwable t) {
                showLoading(false);
                binding.tilMaThe.setError("Lỗi mạng: " + t.getMessage());
            }
        });
    }

    // Debounce kiểm tra email tồn tại mỗi khi người dùng gõ
    private void scheduleEmailCheckIfNeeded() {
        String email = binding.etEmail.getText().toString().trim();
        if (!GMAIL_RE.matcher(email).matches()) return;
        if (email.equals(lastCheckedEmail)) return;

        if (emailCheckTask != null) handler.removeCallbacks(emailCheckTask);
        emailCheckTask = this::checkEmailExists;
        handler.postDelayed(emailCheckTask, 450);
    }

    private boolean validateEmail(boolean setError){
        String email = binding.etEmail.getText().toString().trim();
        boolean ok = GMAIL_RE.matcher(email).matches();
        if (!ok && setError) binding.tilEmail.setError("Email phải là địa chỉ @gmail.com hợp lệ");
        else if (ok) binding.tilEmail.setError(null);
        return ok;
    }

    private void checkEmailExists(){
        String email = binding.etEmail.getText().toString().trim();
        if (!GMAIL_RE.matcher(email).matches()) { updateSignUpEnabled(); return; }
        api.checkEmail("checkEmail", email)
                .enqueue(new Callback<CheckEmailResponse>() {
                    @Override public void onResponse(@NonNull Call<CheckEmailResponse> call, @NonNull Response<CheckEmailResponse> resp) {
                        if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                            if (resp.body().exists) binding.tilEmail.setError("Email đã tồn tại");
                            else { binding.tilEmail.setError(null); lastCheckedEmail = email; }
                        }
                        updateSignUpEnabled();
                    }
                    @Override public void onFailure(@NonNull Call<CheckEmailResponse> call, @NonNull Throwable t) {
                        updateSignUpEnabled();
                    }
                });
    }

    private boolean validatePassword(boolean setError){
        String pw = binding.etPassword.getText().toString();
        boolean ok = PASS_RE.matcher(pw).matches();
        if (!ok && setError) binding.tilPassword.setError("Mật khẩu chưa đạt yêu cầu");
        else if (ok) binding.tilPassword.setError(null);
        return ok;
    }

    private boolean validateConfirm(boolean setError){
        String pw = binding.etPassword.getText().toString();
        String cf = binding.etConfirm.getText().toString();
        boolean ok = !pw.isEmpty() && pw.equals(cf);
        if (!ok && setError) binding.tilConfirm.setError("Mật khẩu và Xác nhận không khớp");
        else if (ok) binding.tilConfirm.setError(null);
        return ok;
    }

    // ... trong phương thức submit(), thay phần tạo request:
    private void submit(){
        if (currentHoTen == null) {
            binding.tilMaThe.setError("Vui lòng kiểm tra mã thẻ trước");
            return;
        }
        boolean ok = validateEmail(true) & validatePassword(true) & validateConfirm(true);
        if (!ok) return;

        showLoading(true);
        String ma = binding.etMaThe.getText().toString().trim();
        String email = binding.etEmail.getText().toString().trim();
        String pw = binding.etPassword.getText().toString();

        // GỬI KÈM FULLNAME
        SignUpRequest body = new SignUpRequest(ma, email, pw, currentHoTen);

        api.signUp(body).enqueue(new Callback<SignUpResponse>() {
            @Override public void onResponse(@NonNull Call<SignUpResponse> call, @NonNull Response<SignUpResponse> resp) {
                showLoading(false);
                if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                    Toast.makeText(ReaderSignUpActivity.this, "Đăng ký thành công! Mời bạn đăng nhập.", Toast.LENGTH_LONG).show();
                    finish();
                } else {
                    String msg = "Đăng ký thất bại";
                    if (resp.body()!=null && resp.body().error!=null) msg = resp.body().error;
                    Toast.makeText(ReaderSignUpActivity.this, msg, Toast.LENGTH_LONG).show();
                }
            }
            @Override public void onFailure(@NonNull Call<SignUpResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(ReaderSignUpActivity.this, "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }
}