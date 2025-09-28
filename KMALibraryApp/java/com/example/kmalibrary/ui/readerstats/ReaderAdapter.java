package com.example.kmalibrary.ui.readerstats;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.kmalibrary.R;
import com.example.kmalibrary.network.Reader;

import java.util.List;

public class ReaderAdapter extends RecyclerView.Adapter<ReaderAdapter.ReaderViewHolder> {

    private final List<Reader> readerList;
    private final OnReaderClickListener listener;

    // Interface để xử lý sự kiện click
    public interface OnReaderClickListener {
        void onReaderClick(Reader reader);
    }

    public ReaderAdapter(List<Reader> readerList, OnReaderClickListener listener) {
        this.readerList = readerList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ReaderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        // Lấy bản vẽ item_reader_summary.xml để tạo ra một dòng
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_reader_summary, parent, false);
        return new ReaderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ReaderViewHolder holder, int position) {
        // Lấy độc giả ở vị trí hiện tại và "gắn" dữ liệu vào view
        Reader reader = readerList.get(position);
        holder.bind(reader, listener);
    }

    @Override
    public int getItemCount() {
        return readerList.size();
    }

    // Lớp này giữ các view của một dòng (để không phải tìm lại nhiều lần)
    static class ReaderViewHolder extends RecyclerView.ViewHolder {
        private final TextView tvReaderName;
        private final TextView tvReaderId;

        public ReaderViewHolder(@NonNull View itemView) {
            super(itemView);
            tvReaderName = itemView.findViewById(R.id.tvReaderName);
            tvReaderId = itemView.findViewById(R.id.tvReaderId);
        }

        public void bind(final Reader reader, final OnReaderClickListener listener) {
            tvReaderName.setText(reader.getHoTen());
            tvReaderId.setText(reader.getMaSVHV());
            // Bắt sự kiện khi người dùng nhấn vào cả dòng
            itemView.setOnClickListener(v -> listener.onReaderClick(reader));
        }
    }
}