package com.example.kmalibrary.ui.loanstats;

import android.content.Intent;
import android.os.Bundle;
import android.view.*;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.kmalibrary.R;
import com.example.kmalibrary.databinding.FragmentLoanStatsBinding;
import com.example.kmalibrary.network.*;
import com.example.kmalibrary.ui.loandetail.LoanDetailActivity;

import java.text.NumberFormat;
import java.util.*;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoanStatsFragment extends Fragment {

    private FragmentLoanStatsBinding binding;
    private ApiService apiService;
    private LoanAdapter adapter;
    private final List<LoanRecord> loanList = new ArrayList<>();

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setHasOptionsMenu(true);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        binding = FragmentLoanStatsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view,
                              @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        apiService = ApiClient.getClient(getContext()).create(ApiService.class);
        setupRecycler();
        fetchLoansChain();
    }

    private void setupRecycler() {
        binding.rvLoans.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new LoanAdapter(loanList, record -> {
            Intent i = new Intent(getActivity(), LoanDetailActivity.class);
            i.putExtra("LOAN_DETAIL", record);
            startActivity(i);
        });
        binding.rvLoans.setAdapter(adapter);
    }

    @Override
    public void onCreateOptionsMenu(@NonNull Menu menu, @NonNull MenuInflater inflater) {
        inflater.inflate(R.menu.fragment_stats_menu, menu);
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_refresh) {
            Toast.makeText(getContext(), "Đang làm mới dữ liệu phiếu mượn...", Toast.LENGTH_SHORT).show();
            fetchLoansChain();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void fetchLoansChain() {
        showLoading(true);
        apiService.getAllLoans().enqueue(new Callback<LoanRecordListResponse>() {
            @Override
            public void onResponse(@NonNull Call<LoanRecordListResponse> call,
                                   @NonNull Response<LoanRecordListResponse> response) {
                if (!response.isSuccessful() || response.body() == null || !response.body().isOk()) {
                    showLoading(false);
                    Toast.makeText(getContext(), "Không tải được phiếu mượn", Toast.LENGTH_SHORT).show();
                    return;
                }
                List<LoanRecord> raw = response.body().getData();
                if (raw == null) raw = new ArrayList<>();
                fetchReadersThenBooks(raw);
            }

            @Override
            public void onFailure(@NonNull Call<LoanRecordListResponse> call, @NonNull Throwable t) {
                showLoading(false);
                Toast.makeText(getContext(), "Lỗi kết nối: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void fetchReadersThenBooks(List<LoanRecord> raw) {
        apiService.getAllReaders().enqueue(new Callback<ReaderListResponse>() {
            @Override
            public void onResponse(@NonNull Call<ReaderListResponse> call,
                                   @NonNull Response<ReaderListResponse> response) {
                Map<String,String> readerMap = new HashMap<>();
                if (response.isSuccessful() && response.body()!=null && response.body().isOk()
                        && response.body().getData()!=null) {
                    response.body().getData().forEach(r -> readerMap.put(r.getMaSVHV(), r.getHoTen()));
                }
                fetchBooksEnrich(raw, readerMap);
            }
            @Override
            public void onFailure(@NonNull Call<ReaderListResponse> call, @NonNull Throwable t) {
                fetchBooksEnrich(raw, new HashMap<>());
            }
        });
    }

    private void fetchBooksEnrich(List<LoanRecord> raw, Map<String,String> readerMap) {
        apiService.getAllBooks().enqueue(new Callback<BookListResponse>() {
            @Override
            public void onResponse(@NonNull Call<BookListResponse> call,
                                   @NonNull Response<BookListResponse> response) {
                Map<String,String> bookMap = new HashMap<>();
                if (response.isSuccessful() && response.body()!=null && response.body().isOk()
                        && response.body().getData()!=null) {
                    response.body().getData().forEach(b -> bookMap.put(b.getMaS(), b.getTenS()));
                }
                enrichAndDisplay(raw, readerMap, bookMap);
            }
            @Override
            public void onFailure(@NonNull Call<BookListResponse> call, @NonNull Throwable t) {
                enrichAndDisplay(raw, readerMap, new HashMap<>());
            }
        });
    }

    private void enrichAndDisplay(List<LoanRecord> raw,
                                  Map<String,String> readerMap,
                                  Map<String,String> bookMap) {
        for (LoanRecord lr : raw) {
            if (lr.getHoTen()==null || lr.getHoTen().isEmpty()) {
                String h = readerMap.get(lr.getMaBanDoc());
                if (h != null) lr.setHoTen(h);
            }
            if (lr.getTenSach()==null || lr.getTenSach().isEmpty()) {
                String t = bookMap.get(lr.getMaSach());
                if (t != null) lr.setTenSach(t);
            }
        }
        loanList.clear();
        loanList.addAll(raw);
        adapter.notifyDataSetChanged();
        computeCards(raw);
        showLoading(false);
    }

    private void computeCards(List<LoanRecord> list) {
        int totalLoans = list.size();
        int totalQty = 0;
        int overdue = 0;
        int current = 0;
        int dueToday = 0;
        for (LoanRecord lr : list) {
            totalQty += lr.getSoLuongMuon();
            String tt = safe(lr.getTinhTrang());
            if (tt.equalsIgnoreCase("Quá hạn")) overdue++;
            else if (tt.equalsIgnoreCase("Đang mượn")) current++;
            else if (tt.equalsIgnoreCase("Đến hẹn trả")) dueToday++;
        }
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi","VN"));
        binding.tvTotalLoans.setText(nf.format(totalLoans));
        binding.tvTotalQty.setText(nf.format(totalQty));
        binding.tvOverdue.setText(nf.format(overdue));
        binding.tvCurrent.setText(nf.format(current));
        binding.tvDueToday.setText(nf.format(dueToday));
    }

    private String safe(String s){ return s==null?"":s.trim(); }

    private void showLoading(boolean show){
        binding.progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}