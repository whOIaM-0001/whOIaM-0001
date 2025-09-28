package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class ReaderListResponse {
    @SerializedName("ok")
    private boolean ok;
    @SerializedName("data")
    private List<Reader> data;
    @SerializedName("error")
    private String error;

    // Getters
    public boolean isOk() { return ok; }
    public List<Reader> getData() { return data; }
    public String getError() { return error; }
}