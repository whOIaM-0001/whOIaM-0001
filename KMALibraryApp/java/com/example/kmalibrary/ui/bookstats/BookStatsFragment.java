package com.example.kmalibrary.ui.bookstats;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.Menu; // THÊM MỚI
import android.view.MenuInflater; // THÊM MỚI
import android.view.MenuItem; // THÊM MỚI
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.kmalibrary.R; // THÊM MỚI
import com.example.kmalibrary.databinding.FragmentBookStatsBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.ApiService;
import com.example.kmalibrary.network.Book;
import com.example.kmalibrary.network.BookListResponse;
import com.example.kmalibrary.ui.bookdetail.BookDetailActivity;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class BookStatsFragment extends Fragment {

    private FragmentBookStatsBinding binding;
    private ApiService apiService;
    private BookAdapter bookAdapter;
    private List<Book> bookList = new ArrayList<>();

    // --- KHU VỰC 1: BÁO CÁO RẰNG FRAGMENT NÀY CÓ MENU ---
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setHasOptionsMenu(true); // Quan trọng! Báo cho hệ thống biết fragment này sẽ thêm item vào menu.
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentBookStatsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        apiService = ApiClient.getClient(getContext()).create(ApiService.class);
        setupRecyclerView();
        fetchBookStatistics();
    }

    // --- KHU VỰC 2: GẮN MENU VÀO TOOLBAR ---
    @Override
    public void onCreateOptionsMenu(@NonNull Menu menu, @NonNull MenuInflater inflater) {
        super.onCreateOptionsMenu(menu, inflater);
        inflater.inflate(R.menu.fragment_stats_menu, menu); // Thổi file menu của chúng ta vào menu của Activity
    }

    // --- KHU VỰC 3: XỬ LÝ KHI NGƯỜI DÙNG NHẤN NÚT ---
    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        // Kiểm tra xem có đúng là người dùng đã nhấn vào nút "Làm mới" không
        if (item.getItemId() == R.id.action_refresh) {
            Toast.makeText(getContext(), "Đang làm mới dữ liệu...", Toast.LENGTH_SHORT).show();
            fetchBookStatistics(); // Gọi lại hàm lấy dữ liệu
            return true; // Báo rằng chúng ta đã xử lý sự kiện này
        }
        return super.onOptionsItemSelected(item);
    }

    private void setupRecyclerView() {
        binding.rvBooks.setLayoutManager(new LinearLayoutManager(getContext()));
        bookAdapter = new BookAdapter(bookList, book -> {
            Intent intent = new Intent(getActivity(), BookDetailActivity.class);
            intent.putExtra("BOOK_DETAIL", book);
            startActivity(intent);
        });
        binding.rvBooks.setAdapter(bookAdapter);
    }

    private void fetchBookStatistics() {
        showLoading(true);
        Call<BookListResponse> call = apiService.getAllBooks();
        call.enqueue(new Callback<BookListResponse>() {
            @Override
            public void onResponse(@NonNull Call<BookListResponse> call, @NonNull Response<BookListResponse> response) {
                showLoading(false);
                if (response.isSuccessful() && response.body() != null && response.body().isOk()) {
                    List<Book> books = response.body().getData();
                    if (books != null) {
                        updateUI(books);
                    }
                } else {
                    Toast.makeText(getContext(), "Không thể tải dữ liệu. Lỗi " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<BookListResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(getContext(), "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateUI(List<Book> books) {
        // (Giữ nguyên)
        int totalTitles = books.size();
        int totalQuantity = 0;
        int availableCount = 0;
        int outOfStockCount = 0;
        for (Book book : books) {
            totalQuantity += book.getSoLuong();
            if (book.getTinhTrang() != null && book.getTinhTrang().equalsIgnoreCase("Còn")) {
                availableCount++;
            } else {
                outOfStockCount++;
            }
        }
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        binding.tvTotalTitles.setText(nf.format(totalTitles));
        binding.tvTotalQuantity.setText(nf.format(totalQuantity));
        binding.tvAvailable.setText(nf.format(availableCount));
        binding.tvOutOfStock.setText(nf.format(outOfStockCount));
        bookList.clear();
        bookList.addAll(books);
        bookAdapter.notifyDataSetChanged();
    }

    private void showLoading(boolean isLoading) {
        // (Giữ nguyên)
        binding.progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}