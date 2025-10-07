package com.example.kmalibrary.ui.util;

import android.content.Context;
import androidx.annotation.ColorInt;
import androidx.core.content.ContextCompat;
import com.example.kmalibrary.R;

public final class StatusUi {
    private StatusUi() {}

    @ColorInt
    public static int colorFor(Context ctx, String st) {
        if (st == null) {
            return ContextCompat.getColor(ctx, R.color.status_returned);
        }
        switch (st.trim()) {
            case "Chờ nhận sách":
                return ContextCompat.getColor(ctx, R.color.status_pending);
            case "Đang mượn":
                return ContextCompat.getColor(ctx, R.color.status_borrowing);
            case "Đến hẹn trả":
                return ContextCompat.getColor(ctx, R.color.status_due);
            case "Quá hạn":
                return ContextCompat.getColor(ctx, R.color.status_overdue);
            case "Đã trả":
            default:
                return ContextCompat.getColor(ctx, R.color.status_returned);
        }
    }

    public static boolean canReturn(String st) {
        // Not allowed when pending or already returned
        return st != null
                && !st.trim().equals("Chờ nhận sách")
                && !st.trim().equals("Đã trả");
    }
}
