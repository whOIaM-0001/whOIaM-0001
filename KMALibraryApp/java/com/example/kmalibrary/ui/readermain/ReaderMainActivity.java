package com.example.kmalibrary.ui.readermain;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;
import androidx.navigation.ui.AppBarConfiguration;
import androidx.navigation.ui.NavigationUI;

import com.example.kmalibrary.LoginActivity;
import com.example.kmalibrary.R;
import com.example.kmalibrary.databinding.ActivityReaderMainBinding;
import com.example.kmalibrary.network.SessionManager;

public class ReaderMainActivity extends AppCompatActivity {
    private ActivityReaderMainBinding binding;
    private AppBarConfiguration appBarConfiguration;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityReaderMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        setSupportActionBar(binding.toolbar);

        sessionManager = new SessionManager(this);

        DrawerLayout drawer = binding.drawerLayout;
        appBarConfiguration = new AppBarConfiguration.Builder(
                R.id.nav_reader_home,
                R.id.nav_reader_borrow,
                R.id.nav_reader_loans,
                R.id.nav_reader_profile
        ).setOpenableLayout(drawer).build();

        NavController navController =
                Navigation.findNavController(this, R.id.nav_host_fragment_content_reader);

        NavigationUI.setupActionBarWithNavController(this, navController, appBarConfiguration);
        NavigationUI.setupWithNavController(binding.navView, navController);

        binding.navView.setNavigationItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_reader_logout) {
                // XỬ LÝ LOGOUT (MỚI)
                sessionManager.clearSession();
                Intent i = new Intent(ReaderMainActivity.this, LoginActivity.class);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(i);
                return true;
            }
            boolean handled = NavigationUI.onNavDestinationSelected(item, navController);
            binding.drawerLayout.closeDrawer(GravityCompat.START);
            return handled;
        });
    }

    @Override
    public boolean onSupportNavigateUp() {
        NavController navController =
                Navigation.findNavController(this, R.id.nav_host_fragment_content_reader);
        return NavigationUI.navigateUp(navController, appBarConfiguration) || super.onSupportNavigateUp();
    }
}