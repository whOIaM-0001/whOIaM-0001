package com.example.kmalibrary.ui.bookstats;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.kmalibrary.databinding.ItemBookSummaryBinding;
import com.example.kmalibrary.network.Book;

import java.util.List;

public class BookAdapter extends RecyclerView.Adapter<BookAdapter.BookViewHolder> {

    private List<Book> bookList;
    private final OnBookClickListener listener;

    public interface OnBookClickListener {
        void onBookClick(Book book);
    }

    public BookAdapter(List<Book> bookList, OnBookClickListener listener) {
        this.bookList = bookList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public BookViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemBookSummaryBinding binding = ItemBookSummaryBinding.inflate(
                LayoutInflater.from(parent.getContext()),
                parent,
                false
        );
        return new BookViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull BookViewHolder holder, int position) {
        Book book = bookList.get(position);
        holder.bind(book, listener);
    }

    @Override
    public int getItemCount() {
        return bookList.size();
    }

    static class BookViewHolder extends RecyclerView.ViewHolder {
        private final ItemBookSummaryBinding binding;

        public BookViewHolder(ItemBookSummaryBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(final Book book, final OnBookClickListener listener) {
            binding.tvBookTitle.setText(book.getTenS());
            binding.tvBookId.setText(book.getMaS());
            itemView.setOnClickListener(v -> listener.onBookClick(book));
        }
    }
}