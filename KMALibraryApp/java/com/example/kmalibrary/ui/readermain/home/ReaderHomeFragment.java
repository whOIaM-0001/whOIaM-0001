package com.example.kmalibrary.ui.readermain.home;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.kmalibrary.databinding.FragmentReaderHomeBinding;
import com.example.kmalibrary.network.ApiClient;
import com.example.kmalibrary.network.ApiService;
import com.example.kmalibrary.network.Book;
import com.example.kmalibrary.network.BookListResponse;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import java.util.ArrayList;
import java.util.List;

public class ReaderHomeFragment extends Fragment {

    private FragmentReaderHomeBinding binding;
    private ApiService api;
    private ReaderBookAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentReaderHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        api = ApiClient.getClient(requireContext()).create(ApiService.class);

        adapter = new ReaderBookAdapter(new ArrayList<>(), book -> {
            Intent i = new Intent(getActivity(), ReaderBookDetailActivity.class);
            i.putExtra("BOOK_OBJ", book); // Book implements Serializable
            startActivity(i);
        });

        binding.rvBooks.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.rvBooks.setAdapter(adapter);

        binding.swipe.setOnRefreshListener(this::loadBooks);
        loadBooks();
    }

    private void loadBooks() {
        showLoading(true);
        api.getBooksForReader().enqueue(new Callback<BookListResponse>() {
            @Override
            public void onResponse(@NonNull Call<BookListResponse> call,
                                   @NonNull Response<BookListResponse> response) {
                showLoading(false);
                if (!response.isSuccessful() || response.body() == null || !response.body().isOk()) {
                    Toast.makeText(getContext(), response.body()!=null? response.body().getError():"Không tải được danh sách sách", Toast.LENGTH_SHORT).show();
                    return;
                }
                List<Book> list = response.body().getData();
                if (list == null || list.isEmpty()) {
                    adapter.submit(new ArrayList<>());
                    binding.empty.setVisibility(View.VISIBLE);
                    return;
                }
                binding.empty.setVisibility(View.GONE);
                adapter.submit(list);
            }

            @Override
            public void onFailure(@NonNull Call<BookListResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(getContext(), "Lỗi mạng: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void showLoading(boolean on) {
        binding.progress.setVisibility(on ? View.VISIBLE : View.GONE);
        binding.swipe.setRefreshing(false);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}