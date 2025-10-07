package com.example.kmalibrary.network;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
// Bỏ import Header vì không dùng nữa
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface ApiService {

    @POST("library_api/functions/function_books/command/accounts/sign_in.php")
    Call<LoginResponse> login(@Body LoginRequest loginRequest);

    // ApiClient tự gắn Authorization
    @GET("library_api/functions/function_books/command/books/books_database/books_table.php")
    Call<BookListResponse> getAllBooks();

    @GET("library_api/functions/function_books/command/accounts/sign_in.php")
    Call<MeResponse> me(@Query("action") String action);

    // THÊM: whoAmI_reader để lấy maSVHV cho người dùng hiện tại
    @GET("library_api/functions/function_books/command/accounts/whoami_reader.php")
    Call<WhoAmIReaderResponse> whoAmIReader();

    @GET("library_api/functions/function_books/command/card/card_manage/cardregister.php")
    Call<ReaderListResponse> getAllReaders();

    @GET("library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan.php")
    Call<LoanRecordListResponse> getAllLoans();

    // THÊM: phiếu mượn của tôi (ma = maSVHV)
    @GET("library_api/functions/function_books/command/book_loan_manage/bookloan_create/bookloan_my.php")
    Call<MyLoanListResponse> getMyLoans(@Query("ma") String ma);

    // Reader SignUp
    @GET("library_api/functions/function_books/command/accounts/sign_up.php")
    Call<CheckCardResponse> checkReaderCard(@Query("action") String action, @Query("id") String maSVHV);

    @GET("library_api/functions/function_books/command/accounts/sign_up.php")
    Call<CheckEmailResponse> checkEmail(@Query("action") String action, @Query("email") String email);

    @POST("library_api/functions/function_books/command/accounts/sign_up.php")
    Call<SignUpResponse> signUp(@Body SignUpRequest body);

    @GET("library_api/functions/function_books/command/books/books_database/books_table_public.php")
    Call<BookListResponse> getBooksForReader();
}
