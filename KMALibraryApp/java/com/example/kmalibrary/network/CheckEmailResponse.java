package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class CheckEmailResponse {
    @SerializedName("ok") public boolean ok;
    @SerializedName("exists") public boolean exists;
    @SerializedName("error") public String error;
}