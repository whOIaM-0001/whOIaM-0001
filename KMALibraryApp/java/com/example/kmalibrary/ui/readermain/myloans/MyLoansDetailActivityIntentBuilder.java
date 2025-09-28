package com.example.kmalibrary.ui.readermain.myloans;

import android.content.Context;
import android.content.Intent;

import com.example.kmalibrary.network.MyLoanItem;

public class MyLoansDetailActivityIntentBuilder {
    public static Intent build(Context ctx, MyLoanItem item){
        Intent i = new Intent(ctx, MyLoansDetailActivity.class);
        i.putExtra("ITEM", item);
        return i;
    }
}