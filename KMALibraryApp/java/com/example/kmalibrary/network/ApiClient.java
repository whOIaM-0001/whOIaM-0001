package com.example.kmalibrary.network;

import android.content.Context;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {

    // Vẫn giữ BASE_URL của bạn
    private static final String BASE_URL = "http://192.168.3.199/kma_library/";
    private static Retrofit retrofit = null;

    /**
     * Phương thức getClient bây giờ sẽ yêu cầu Context
     * để có thể tạo SessionManager và lấy token.
     */
    public static Retrofit getClient(Context context) {
        if (retrofit == null) {
            // --- BẮT ĐẦU PHẦN NÂNG CẤP ---

            // 1. Tạo "gián điệp" để log request/response ra Logcat (rất hữu ích để debug)
            HttpLoggingInterceptor loggingInterceptor = new HttpLoggingInterceptor();
            loggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);

            // 2. Tạo SessionManager để có thể lấy token
            final SessionManager sessionManager = new SessionManager(context);

            // 3. Tạo một Interceptor tùy chỉnh để tự động thêm Header Authorization
            Interceptor authInterceptor = new Interceptor() {
                @Override
                public Response intercept(Chain chain) throws IOException {
                    // Lấy request gốc
                    Request originalRequest = chain.request();

                    // Lấy token từ "két sắt"
                    String token = sessionManager.fetchAuthToken();

                    // Nếu có token, tạo một request mới và thêm Header vào
                    if (token != null && !token.isEmpty()) {
                        Request.Builder builder = originalRequest.newBuilder()
                                .header("Authorization", "Bearer " + token); // Định dạng chuẩn là "Bearer <token>"
                        Request newRequest = builder.build();
                        return chain.proceed(newRequest);
                    }

                    // Nếu không có token (chưa đăng nhập), cứ gửi request gốc đi
                    return chain.proceed(originalRequest);
                }
            };

            // 4. Tạo OkHttpClient và gắn các "gián điệp", "người thêm header" vào
            OkHttpClient okHttpClient = new OkHttpClient.Builder()
                    .addInterceptor(authInterceptor) // Gắn người thêm header
                    .addInterceptor(loggingInterceptor) // Gắn gián điệp log
                    .build();

            // 5. Tạo Retrofit và chỉ định dùng OkHttpClient đã được nâng cấp
            retrofit = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .client(okHttpClient) // DÙNG HTTP CLIENT ĐÃ ĐƯỢC NÂNG CẤP
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();

            // --- KẾT THÚC PHẦN NÂNG CẤP ---
        }
        return retrofit;
    }
}