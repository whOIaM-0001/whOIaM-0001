package com.example.kmalibrary.ui.readermain.home;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.kmalibrary.R;
import com.example.kmalibrary.network.Book;

import java.util.ArrayList;
import java.util.List;

public class ReaderBookAdapter extends RecyclerView.Adapter<ReaderBookAdapter.VH> {

    public interface OnClick { void onItemClick(Book book); }

    private final List<Book> data = new ArrayList<>();
    private final OnClick click;

    public ReaderBookAdapter(List<Book> init, OnClick click) {
        if (init != null) data.addAll(init);
        this.click = click;
        setHasStableIds(true);
    }

    public void submit(List<Book> items) {
        data.clear();
        if (items != null) data.addAll(items);
        notifyDataSetChanged();
    }

    @Override public long getItemId(int position) {
        Book b = data.get(position);
        String code = b.getMaS();
        return code != null ? code.hashCode() : position;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_reader_book, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Book b = data.get(position);
        h.tvCode.setText(b.getMaS() != null ? b.getMaS() : "—");
        h.tvName.setText(b.getTenS() != null ? b.getTenS() : "—");
        h.itemView.setOnClickListener(v -> { if (click != null) click.onItemClick(b); });
    }

    @Override public int getItemCount() { return data.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvCode, tvName;
        VH(@NonNull View itemView) {
            super(itemView);
            tvCode = itemView.findViewById(R.id.tvBookCode);
            tvName = itemView.findViewById(R.id.tvBookName);
        }
    }
}