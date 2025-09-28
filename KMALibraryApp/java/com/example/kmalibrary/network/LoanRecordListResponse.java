package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class LoanRecordListResponse {
    @SerializedName("ok")
    private boolean ok;
    @SerializedName("data")
    private List<LoanRecord> data;
    @SerializedName("error")
    private String error;

    public boolean isOk() { return ok; }
    public List<LoanRecord> getData() { return data; }
    public String getError() { return error; }
}