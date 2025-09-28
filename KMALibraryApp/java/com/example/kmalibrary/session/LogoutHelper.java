package com.example.kmalibrary.session;

import android.content.Context;
import android.content.SharedPreferences;

public class LogoutHelper {
    public static void clearReaderCache(Context ctx){
        SharedPreferences prefs = ctx.getSharedPreferences("reader_prefs", Context.MODE_PRIVATE);
        prefs.edit()
                .remove("cached_reader_id")
                .remove("cached_email")
                .apply();
    }
}