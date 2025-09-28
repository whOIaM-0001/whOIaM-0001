package com.example.kmalibrary;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.example.kmalibrary.databinding.ActivityLoginBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.ApiService;
import com.example.kmalibrary.network.LoginRequest;
import com.example.kmalibrary.network.LoginResponse;
import com.example.kmalibrary.network.MeResponse;
import com.example.kmalibrary.network.SessionManager;
import com.example.kmalibrary.network.User;
import com.example.kmalibrary.ui.reader_signup.ReaderSignUpActivity;
import com.google.gson.Gson;

import java.io.IOException;
import java.util.regex.Pattern;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

// Đổi package nếu ReaderMainActivity ở nơi khác
import com.example.kmalibrary.ui.readermain.ReaderMainActivity;

public class LoginActivity extends AppCompatActivity {

    private ActivityLoginBinding binding;
    private ApiService apiService;
    private SessionManager sessionManager;

    private static final Pattern GMAIL_PATTERN =
            Pattern.compile("^[a-zA-Z0-9._%+-]+@gmail\\.com$");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        apiService = ApiClient.getClient(this).create(ApiService.class);
        sessionManager = new SessionManager(this);

        binding.btnLogin.setOnClickListener(v -> handleLogin());

        // MỞ ĐĂNG KÝ (MỚI)
        binding.tvGoSignUp.setOnClickListener(v -> {
            startActivity(new Intent(LoginActivity.this, ReaderSignUpActivity.class));
        });
    }

    private void handleLogin() {
        String email = binding.etEmail.getText().toString().trim();
        String password = binding.etPassword.getText().toString().trim();

        binding.tilEmail.setError(null);
        binding.tilPassword.setError(null);
        boolean isValid = true;
        if (email.isEmpty()) {
            binding.tilEmail.setError("Email không được để trống");
            isValid = false;
        } else if (!GMAIL_PATTERN.matcher(email).matches()) {
            binding.tilEmail.setError("Email phải là một địa chỉ @gmail.com hợp lệ");
            isValid = false;
        }
        if (password.isEmpty()) {
            binding.tilPassword.setError("Mật khẩu không được để trống");
            isValid = false;
        }
        if (!isValid) return;

        showLoading(true);

        apiService.login(new LoginRequest(email, password))
                .enqueue(new Callback<LoginResponse>() {
                    @Override
                    public void onResponse(@NonNull Call<LoginResponse> call, @NonNull Response<LoginResponse> response) {
                        showLoading(false);

                        if (!response.isSuccessful() || response.body() == null) {
                            binding.tilPassword.setError(parseError(response));
                            return;
                        }

                        LoginResponse lr = response.body();
                        if (!lr.isOk() || lr.getToken() == null || lr.getUser() == null) {
                            binding.tilPassword.setError(lr.getError() != null ? lr.getError() : "Đăng nhập thất bại");
                            return;
                        }

                        User u = lr.getUser();
                        String token = lr.getToken();
                        String username = (u.getUsername() != null && !u.getUsername().isEmpty())
                                ? u.getUsername() : u.getName();
                        String email = u.getEmail();
                        String role  = u.getRole();

                        // Lưu trước token/username/email/role (role có thể null)
                        sessionManager.saveUser(token, username, email, role);

                        if (role == null || role.isEmpty()) {
                            // Dự phòng: gọi /me để lấy role từ JWT
                            fetchMeAndNavigate();
                        } else {
                            navigateByRole(role);
                        }
                    }

                    @Override
                    public void onFailure(@NonNull Call<LoginResponse> call, @NonNull Throwable t) {
                        showLoading(false);
                        Toast.makeText(LoginActivity.this, "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
    }

    private void fetchMeAndNavigate() {
        // ApiClient đã đọc token từ SessionManager -> có Authorization header
        apiService.me("me").enqueue(new Callback<MeResponse>() {
            @Override public void onResponse(@NonNull Call<MeResponse> call, @NonNull Response<MeResponse> response) {
                if (response.isSuccessful() && response.body()!=null && response.body().ok && response.body().user!=null) {
                    String role = response.body().user.getRole();
                    if (role != null) sessionManager.saveUserRole(role);
                    navigateByRole(role);
                } else {
                    // Không lấy được role vẫn cho vào MainActivity để tránh kẹt
                    navigateByRole(null);
                }
            }
            @Override public void onFailure(@NonNull Call<MeResponse> call, @NonNull Throwable t) {
                navigateByRole(null);
            }
        });
    }

    private void navigateByRole(String role) {
        Intent intent;
        if (role != null && role.equalsIgnoreCase("Reader")) {
            intent = new Intent(LoginActivity.this, ReaderMainActivity.class);
        } else {
            intent = new Intent(LoginActivity.this, MainActivity.class);
        }
        Toast.makeText(this, "Đăng nhập thành công!", Toast.LENGTH_SHORT).show();
        startActivity(intent);
        finish();
    }

    private String parseError(Response<?> response) {
        String errorMessage = "Lỗi không xác định.";
        if (response.errorBody() != null) {
            try {
                String errorJson = response.errorBody().string();
                LoginResponse errorResponse = new Gson().fromJson(errorJson, LoginResponse.class);
                if (errorResponse != null && errorResponse.getError() != null) {
                    errorMessage = errorResponse.getError();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
        return errorMessage;
    }

    private void showLoading(boolean isLoading) {
        if (isLoading) {
            binding.progressBar.setVisibility(View.VISIBLE);
            binding.btnLogin.setEnabled(false);
            binding.btnLogin.setText("Đang xử lý...");
        } else {
            binding.progressBar.setVisibility(View.GONE);
            binding.btnLogin.setEnabled(true);
            binding.btnLogin.setText("Đăng nhập");
        }
    }
}