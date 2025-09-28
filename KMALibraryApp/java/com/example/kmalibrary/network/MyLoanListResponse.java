package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class MyLoanListResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("data") public List<MyLoanItem> data;
    @SerializedName("error") public String error;
}