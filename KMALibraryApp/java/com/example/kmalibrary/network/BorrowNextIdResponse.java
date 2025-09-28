package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class BorrowNextIdResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("nextId") public String nextId;
    @SerializedName("error") public String error;
}