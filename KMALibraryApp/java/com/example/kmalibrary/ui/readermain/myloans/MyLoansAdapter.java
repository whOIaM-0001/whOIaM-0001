package com.example.kmalibrary.ui.readermain.myloans;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.kmalibrary.R;
import com.example.kmalibrary.network.MyLoanItem;

import java.util.ArrayList;
import java.util.List;

public class MyLoansAdapter extends RecyclerView.Adapter<MyLoansAdapter.VH> {

    public interface OnClick { void onItemClick(MyLoanItem item); }

    private final List<MyLoanItem> data = new ArrayList<>();
    private final OnClick click;

    public MyLoansAdapter(List<MyLoanItem> init, OnClick click) {
        if (init != null) data.addAll(init);
        this.click = click;
        setHasStableIds(true);
    }

    public void submit(List<MyLoanItem> items){
        data.clear();
        if (items != null) data.addAll(items);
        notifyDataSetChanged();
    }

    @Override public long getItemId(int position) {
        String id = data.get(position).MaPhieuMuon;
        return id!=null ? id.hashCode() : position;
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_my_loan, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        MyLoanItem it = data.get(position);
        h.tvId.setText(s(it.MaPhieuMuon));
        h.tvBook.setText(s(it.MaSach) + " • " + s(it.TenS));
        h.tvDates.setText("Mượn: " + s(it.NgayMuon) + "   •   Hẹn trả: " + s(it.NgayTra));
        h.tvStatus.setText(s(it.TinhTrang));

        int color = colorFor(it.TinhTrang);
        h.tvStatus.setTextColor(color);

        h.itemView.setOnClickListener(v -> { if (click!=null) click.onItemClick(it); });
    }

    private String s(Object o){ return o==null? "—" : String.valueOf(o); }

    private int colorFor(String status){
        if (status == null) return 0xFFB0BEC5; // grey-ish
        String st = status.trim();
        if (st.equalsIgnoreCase("Đang mượn")) return 0xFF2E7D32; // green
        if (st.equalsIgnoreCase("Đến hẹn trả")) return 0xFFFBC02D; // amber
        if (st.equalsIgnoreCase("Quá hạn")) return 0xFFC62828; // red
        return 0xFFB0BEC5;
    }

    @Override public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvId, tvBook, tvDates, tvStatus;
        VH(@NonNull View itemView) {
            super(itemView);
            tvId = itemView.findViewById(R.id.tvId);
            tvBook = itemView.findViewById(R.id.tvBook);
            tvDates = itemView.findViewById(R.id.tvDates);
            tvStatus = itemView.findViewById(R.id.tvStatus);
        }
    }
}