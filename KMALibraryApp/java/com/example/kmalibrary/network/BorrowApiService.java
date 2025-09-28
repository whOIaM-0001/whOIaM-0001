package com.example.kmalibrary.network;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface BorrowApiService {

    // NEXT ID cho PM
    @GET("library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan_nextid.php")
    Call<BorrowNextIdResponse> getNextId();

    // Danh sách phiếu (fallback nếu nextId lỗi)
    @GET("library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan.php")
    Call<BookLoanListResponse> listLoans();

    // Tạo phiếu mượn (Reader)
    @POST("library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan_public_create.php")
    Call<BorrowResponse> createLoan(@Body BorrowRequest body);

    // Kiểm tra mã độc giả (cardregister)
    @GET("library_api/functions/function_books/command/accounts/sign_up.php")
    Call<CheckCardResponse> checkCard(@Query("action") String action, @Query("id") String maSVHV);

    @GET("library_api/functions/function_books/command/accounts/whoami_reader.php")
    Call<WhoAmIReaderResponse> whoAmIReader();

    @GET("library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan_my.php")
    Call<MyLoanListResponse> myLoans(@Query("ma") String maSVHV);
}