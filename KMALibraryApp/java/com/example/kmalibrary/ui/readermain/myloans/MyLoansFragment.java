package com.example.kmalibrary.ui.readermain.myloans;

import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.kmalibrary.databinding.FragmentMyLoansBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.BorrowApiService;
import com.example.kmalibrary.network.CheckCardResponse;
import com.example.kmalibrary.network.MyLoanItem;
import com.example.kmalibrary.network.MyLoanListResponse;
import com.example.kmalibrary.network.WhoAmIReaderResponse;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MyLoansFragment extends Fragment {

    private FragmentMyLoansBinding binding;
    private BorrowApiService api;
    private MyLoansAdapter adapter;

    private SharedPreferences prefs;
    private static final String PREFS = "reader_prefs";
    // Ràng buộc theo token hiện tại (nếu có lưu token string), nếu không thì theo email
    private static final String KEY_CACHED_READER_ID = "cached_reader_id"; // maSVHV hiện hành
    private static final String KEY_CACHED_EMAIL     = "cached_email";     // email hiện hành

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentMyLoansBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        api = ApiClient.getClient(requireContext()).create(BorrowApiService.class);
        prefs = requireContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        adapter = new MyLoansAdapter(new ArrayList<>(), item -> {
            startActivity(MyLoansDetailActivityIntentBuilder.build(requireContext(), item));
        });

        binding.rv.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.rv.setAdapter(adapter);

        binding.swipe.setOnRefreshListener(this::loadAuto);
        binding.btnChangeId.setOnClickListener(v -> askReaderId(true));

        // Lần nào mở màn cũng auto-detect theo token hiện tại
        loadAuto();
    }

    private void loadAuto(){
        showLoading(true);
        api.whoAmIReader().enqueue(new Callback<WhoAmIReaderResponse>() {
            @Override public void onResponse(@NonNull Call<WhoAmIReaderResponse> call, @NonNull Response<WhoAmIReaderResponse> resp) {
                if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                    String email = safe(resp.body().email);
                    String ma    = safe(resp.body().maSVHV);
                    cacheCurrent(email, ma);
                    binding.tvReaderId.setText("Mã độc giả: " + ma);
                    loadLoans(ma);
                } else {
                    // Không tự tìm được → dùng cache nếu còn, hoặc cho nhập
                    String cachedEmail = prefs.getString(KEY_CACHED_EMAIL, "");
                    String cachedMa    = prefs.getString(KEY_CACHED_READER_ID, "");
                    if (cachedMa != null && !cachedMa.trim().isEmpty()) {
                        binding.tvReaderId.setText("Mã độc giả: " + cachedMa + " (cache)");
                        loadLoans(cachedMa);
                    } else {
                        showLoading(false);
                        binding.empty.setVisibility(View.VISIBLE);
                        binding.empty.setText("Không xác định được mã độc giả. Nhấn 'Đổi' để nhập.");
                        adapter.submit(new ArrayList<>());
                    }
                }
            }
            @Override public void onFailure(@NonNull Call<WhoAmIReaderResponse> call, @NonNull Throwable t) {
                // Lỗi mạng → dùng cache nếu có
                String cachedMa = prefs.getString(KEY_CACHED_READER_ID, "");
                if (cachedMa != null && !cachedMa.trim().isEmpty()) {
                    binding.tvReaderId.setText("Mã độc giả: " + cachedMa + " (offline)");
                    loadLoans(cachedMa);
                } else {
                    showLoading(false);
                    binding.empty.setVisibility(View.VISIBLE);
                    binding.empty.setText("Lỗi mạng: " + t.getMessage());
                    adapter.submit(new ArrayList<>());
                }
            }
        });
    }

    private void loadLoans(String ma){
        api.myLoans(ma).enqueue(new Callback<MyLoanListResponse>() {
            @Override public void onResponse(@NonNull Call<MyLoanListResponse> call, @NonNull Response<MyLoanListResponse> resp) {
                showLoading(false);
                if (!resp.isSuccessful() || resp.body()==null || !resp.body().ok) {
                    binding.empty.setVisibility(View.VISIBLE);
                    binding.empty.setText(resp.body()!=null && resp.body().error!=null ? resp.body().error : "Không tải được dữ liệu");
                    adapter.submit(new ArrayList<>());
                    return;
                }
                List<MyLoanItem> list = resp.body().data != null ? resp.body().data : new ArrayList<>();
                if (list.isEmpty()){
                    binding.empty.setVisibility(View.VISIBLE);
                    binding.empty.setText("Không có phiếu mượn");
                } else {
                    binding.empty.setVisibility(View.GONE);
                }
                adapter.submit(list);
            }
            @Override public void onFailure(@NonNull Call<MyLoanListResponse> call, @NonNull Throwable t) {
                showLoading(false);
                binding.empty.setVisibility(View.VISIBLE);
                binding.empty.setText("Lỗi mạng: " + t.getMessage());
                adapter.submit(new ArrayList<>());
            }
        });
    }

    private void askReaderId(boolean isChange){
        final EditText input = new EditText(requireContext());
        input.setHint("Nhập mã độc giả (maSVHV)");
        input.setInputType(InputType.TYPE_CLASS_TEXT);
        new AlertDialog.Builder(requireContext())
                .setTitle(isChange ? "Đổi mã độc giả" : "Mã độc giả của tôi")
                .setView(input)
                .setNegativeButton("Hủy", null)
                .setPositiveButton("Lưu", (DialogInterface dialog, int which) -> {
                    String id = safe(input.getText());
                    if (id.isEmpty()) {
                        Toast.makeText(getContext(), "Vui lòng nhập mã độc giả", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    api.checkCard("checkCard", id).enqueue(new Callback<CheckCardResponse>() {
                        @Override public void onResponse(@NonNull Call<CheckCardResponse> call, @NonNull Response<CheckCardResponse> resp) {
                            if (resp.isSuccessful() && resp.body()!=null && resp.body().ok) {
                                // Gắn theo context hiện tại, không để lẫn giữa user
                                cacheCurrent(prefs.getString(KEY_CACHED_EMAIL, ""), id);
                                binding.tvReaderId.setText("Mã độc giả: " + id);
                                loadLoans(id);
                            } else {
                                String msg = (resp.body()!=null && resp.body().error!=null) ? resp.body().error : "Mã độc giả không hợp lệ";
                                Toast.makeText(getContext(), msg, Toast.LENGTH_LONG).show();
                            }
                        }
                        @Override public void onFailure(@NonNull Call<CheckCardResponse> call, @NonNull Throwable t) {
                            Toast.makeText(getContext(), "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                })
                .show();
    }

    private void cacheCurrent(String email, String ma){
        // Lưu cặp hiện hành để lần sau vào lại vẫn đúng người đang đăng nhập
        if (email != null) prefs.edit().putString(KEY_CACHED_EMAIL, email).apply();
        if (ma != null) prefs.edit().putString(KEY_CACHED_READER_ID, ma).apply();
    }

    private void showLoading(boolean on){
        binding.progress.setVisibility(on ? View.VISIBLE : View.GONE);
        if (!on) binding.swipe.setRefreshing(false);
    }

    private String safe(CharSequence cs){ return cs==null ? "" : cs.toString().trim(); }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}