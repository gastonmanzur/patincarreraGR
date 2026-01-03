package com.zuria.patincarrera;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import android.widget.TextView;
import android.widget.FrameLayout;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        FrameLayout root = new FrameLayout(this);
        TextView textView = new TextView(this);
        textView.setText("PatinCarrera Android");
        textView.setTextSize(18f);
        textView.setPadding(32, 32, 32, 32);
        root.addView(textView);

        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            WindowInsetsCompat systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.getLeft(), systemBars.getTop(), systemBars.getRight(), systemBars.getBottom());
            return insets;
        });

        setContentView(root);
    }
}
