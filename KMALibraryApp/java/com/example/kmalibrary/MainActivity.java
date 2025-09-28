package com.example.kmalibrary;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.view.Menu;
import android.widget.TextView;
import android.widget.Toast;

import com.example.kmalibrary.network.SessionManager;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.material.navigation.NavigationView;

import androidx.annotation.NonNull;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;
import androidx.navigation.ui.AppBarConfiguration;
import androidx.navigation.ui.NavigationUI;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;

import com.example.kmalibrary.databinding.ActivityMainBinding;

public class MainActivity extends AppCompatActivity {

    private AppBarConfiguration mAppBarConfiguration;
    private ActivityMainBinding binding;
    private SessionManager sessionManager; // Khai báo SessionManager

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        // Khởi tạo SessionManager
        sessionManager = new SessionManager(this);

        setSupportActionBar(binding.appBarMain.toolbar);
        if (binding.appBarMain.toolbar != null) {
            binding.appBarMain.toolbar.setOnClickListener(view -> Snackbar.make(view, "Replace with your own action", Snackbar.LENGTH_LONG)
                    .setAction("Action", null)
                    .setAnchorView(binding.appBarMain.toolbar)
                    .show());
        }
        DrawerLayout drawer = binding.drawerLayout;
        NavigationView navigationView = binding.navView;
        mAppBarConfiguration = new AppBarConfiguration.Builder(
                R.id.nav_book_stats, R.id.nav_reader_stats, R.id.nav_loan_stats)
                .setOpenableLayout(drawer)
                .build();
        NavController navController = Navigation.findNavController(this, R.id.nav_host_fragment_content_main);
        NavigationUI.setupActionBarWithNavController(this, navController, mAppBarConfiguration);
        NavigationUI.setupWithNavController(navigationView, navController);

        // --- BẮT ĐẦU PHẦN NÂNG CẤP ---
        updateNavHeader();
        setupLogout();
        // --- KẾT THÚC PHẦN NÂNG CẤP ---
    }

    /**
     * Lấy thông tin từ SessionManager và cập nhật lên Header của Navigation Drawer.
     */
    private void updateNavHeader() {
        NavigationView navigationView = binding.navView;
        View headerView = navigationView.getHeaderView(0); // Lấy view của header

        // Tìm các TextView bằng ID đã đặt trong nav_header_main.xml
        TextView tvUsername = headerView.findViewById(R.id.tvNavUsername);
        TextView tvEmail = headerView.findViewById(R.id.tvNavEmail);

        // Lấy dữ liệu từ "két sắt" và hiển thị
        tvUsername.setText(sessionManager.fetchUsername());
        tvEmail.setText(sessionManager.fetchUserEmail());
    }

    /**
     * Xử lý sự kiện nhấn nút Đăng xuất.
     */
//    private void setupLogout() {
//        binding.navView.setNavigationItemSelectedListener(new NavigationView.OnNavigationItemSelectedListener() {
//            @Override
//            public boolean onNavigationItemSelected(@NonNull MenuItem item) {
//                // Kiểm tra xem có phải người dùng nhấn nút Đăng xuất không
//                if (item.getItemId() == R.id.nav_logout) {
//                    // Xóa phiên đăng nhập
//                    sessionManager.clearSession();
//                    Toast.makeText(MainActivity.this, "Đã đăng xuất", Toast.LENGTH_SHORT).show();
//
//                    // Chuyển về màn hình Đăng nhập
//                    Intent intent = new Intent(MainActivity.this, LoginActivity.class);
//                    // Xóa hết các Activity cũ khỏi stack để người dùng không thể back lại
//                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
//                    startActivity(intent);
//
//                    return true; // Đã xử lý xong
//                }
//
//                // Đối với các item khác, để NavigationUI tự xử lý
//                return NavigationUI.onNavDestinationSelected(item, Navigation.findNavController(MainActivity.this, R.id.nav_host_fragment_content_main));
//            }
//        });
//    }

    // ... bên trong lớp MainActivity
    private void setupLogout() {
        binding.navView.setNavigationItemSelectedListener(item -> {
            int id = item.getItemId();

            if (id == R.id.nav_logout) {
                sessionManager.clearSession();
                Toast.makeText(this, "Đã đăng xuất", Toast.LENGTH_SHORT).show();
                Intent intent = new Intent(this, LoginActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
            } else {
                // Điều hướng đến fragment tương ứng
                NavController navController =
                        Navigation.findNavController(this, R.id.nav_host_fragment_content_main);
                NavigationUI.onNavDestinationSelected(item, navController);
            }

            // Đóng Drawer sau khi chọn
            binding.drawerLayout.closeDrawer(androidx.core.view.GravityCompat.START);
            return true;
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onSupportNavigateUp() {
        NavController navController = Navigation.findNavController(this, R.id.nav_host_fragment_content_main);
        return NavigationUI.navigateUp(navController, mAppBarConfiguration)
                || super.onSupportNavigateUp();
    }
}