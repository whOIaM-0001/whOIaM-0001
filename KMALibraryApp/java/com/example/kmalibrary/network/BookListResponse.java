package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class BookListResponse {
    @SerializedName("ok")
    private boolean ok;
    @SerializedName("data")
    private List<Book> data;
    @SerializedName("error")
    private String error;

    // Getters
    public boolean isOk() { return ok; }
    public List<Book> getData() { return data; }
    public String getError() { return error; }
}