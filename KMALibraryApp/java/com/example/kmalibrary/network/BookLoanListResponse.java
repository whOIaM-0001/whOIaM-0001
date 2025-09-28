package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class BookLoanListResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("data") public List<BookLoanItem> data;
    @SerializedName("error") public String error;
}