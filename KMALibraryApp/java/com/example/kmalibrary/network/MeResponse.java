package com.example.kmalibrary.network;

import com.google.gson.annotations.SerializedName;

public class MeResponse {
    @SerializedName("ok")    public boolean ok;
    @SerializedName("user")  public User user;
    @SerializedName("error") public String error;
}