package com.example.kmalibrary.ui.readerstats;

import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.kmalibrary.R;
import com.example.kmalibrary.databinding.FragmentReaderStatsBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.ApiService;
import com.example.kmalibrary.network.Reader;
import com.example.kmalibrary.network.ReaderListResponse;
import com.example.kmalibrary.ui.readerdetail.ReaderDetailActivity;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReaderStatsFragment extends Fragment {

    private FragmentReaderStatsBinding binding;
    private ApiService apiService;
    private ReaderAdapter readerAdapter;
    private final List<Reader> readerList = new ArrayList<>();

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // BẮT BUỘC: Báo cho hệ thống biết fragment này có menu
        setHasOptionsMenu(true);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentReaderStatsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                              @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        apiService = ApiClient.getClient(getContext()).create(ApiService.class);
        setupRecyclerView();
        fetchReaderStatistics();
    }

    /* ====== MENU (THÊM MỚI) ====== */
    @Override
    public void onCreateOptionsMenu(@NonNull Menu menu,
                                    @NonNull MenuInflater inflater) {
        super.onCreateOptionsMenu(menu, inflater);
        // Tái sử dụng luôn menu của thống kê sách
        inflater.inflate(R.menu.fragment_stats_menu, menu);
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_refresh) {
            Toast.makeText(getContext(), "Đang làm mới dữ liệu độc giả...", Toast.LENGTH_SHORT).show();
            fetchReaderStatistics();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
    /* ====== HẾT PHẦN MENU ====== */

    private void setupRecyclerView() {
        binding.rvReaders.setLayoutManager(new LinearLayoutManager(getContext()));
        readerAdapter = new ReaderAdapter(readerList, reader -> {
            Intent intent = new Intent(getActivity(), ReaderDetailActivity.class);
            intent.putExtra("READER_DETAIL", reader);
            startActivity(intent);
        });
        binding.rvReaders.setAdapter(readerAdapter);
    }

    private void fetchReaderStatistics() {
        showLoading(true);
        Call<ReaderListResponse> call = apiService.getAllReaders();
        call.enqueue(new Callback<ReaderListResponse>() {
            @Override
            public void onResponse(@NonNull Call<ReaderListResponse> call,
                                   @NonNull Response<ReaderListResponse> response) {
                showLoading(false);
                if (response.isSuccessful()
                        && response.body() != null
                        && response.body().isOk()
                        && response.body().getData() != null) {
                    updateUI(response.body().getData());
                } else {
                    Toast.makeText(getContext(),
                            "Không thể tải dữ liệu độc giả. Lỗi " + response.code(),
                            Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<ReaderListResponse> call,
                                  @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(getContext(),
                        "Lỗi kết nối: " + t.getMessage(),
                        Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateUI(List<Reader> readers) {
        int totalReaders = readers.size();
        int totalMale = 0, totalFemale = 0;
        int totalStudents = 0, totalTrainees = 0;
        int totalCivilian = 0, totalInternational = 0;

        for (Reader r : readers) {
            String gt = r.getGioiTinh() == null ? "" : r.getGioiTinh().trim();
            if (gt.equalsIgnoreCase("Nam")) totalMale++;
            else if (gt.equalsIgnoreCase("Nữ")) totalFemale++;

            String cv = r.getChucVu() == null ? "" : r.getChucVu().trim();
            if (cv.equalsIgnoreCase("Sinh viên")) totalStudents++;
            else if (cv.equalsIgnoreCase("Học viên")) totalTrainees++;

            String he = r.getHe() == null ? "" : r.getHe().trim();
            if (he.equalsIgnoreCase("Dân sự")) totalCivilian++;
            else if (he.equalsIgnoreCase("Quốc tế")) totalInternational++;
        }

        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        binding.tvTotalReaders.setText(nf.format(totalReaders));
        binding.tvTotalMale.setText(nf.format(totalMale));
        binding.tvTotalFemale.setText(nf.format(totalFemale));
        binding.tvTotalStudents.setText(nf.format(totalStudents));
        binding.tvTotalTrainees.setText(nf.format(totalTrainees));
        binding.tvTotalCivilian.setText(nf.format(totalCivilian));
        binding.tvTotalInternational.setText(nf.format(totalInternational));

        readerList.clear();
        readerList.addAll(readers);
        readerAdapter.notifyDataSetChanged();
    }

    private void showLoading(boolean show) {
        binding.progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}