package com.example.kmalibrary.ui.loanstats;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.kmalibrary.R;
import com.example.kmalibrary.network.LoanRecord;

import java.util.List;

public class LoanAdapter extends RecyclerView.Adapter<LoanAdapter.LoanVH> {

    public interface OnLoanClickListener {
        void onLoanClick(LoanRecord record);
    }

    private final List<LoanRecord> data;
    private final OnLoanClickListener listener;

    public LoanAdapter(List<LoanRecord> data, OnLoanClickListener listener) {
        this.data = data;
        this.listener = listener;
    }

    @NonNull
    @Override
    public LoanVH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_loan_record, parent, false);
        return new LoanVH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull LoanVH holder, int position) {
        LoanRecord r = data.get(position);
        holder.tvLoanId.setText(r.getMaPhieuMuon());
        String name = (r.getHoTen() != null && !r.getHoTen().isEmpty()) ? r.getHoTen() : r.getMaBanDoc();
        holder.tvLoanReader.setText(name);
        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onLoanClick(r);
        });
    }

    @Override
    public int getItemCount() {
        return data.size();
    }

    static class LoanVH extends RecyclerView.ViewHolder {
        TextView tvLoanId, tvLoanReader;
        LoanVH(@NonNull View itemView) {
            super(itemView);
            tvLoanId = itemView.findViewById(R.id.tvLoanId);
            tvLoanReader = itemView.findViewById(R.id.tvLoanReader);
        }
    }
}