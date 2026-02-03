package com.zuria.patincarrera;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class PatinFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "patincarrera_general";
    private static final String PREFS_NAME = "patincarrera_prefs";
    private static final String AUTH_TOKEN_KEY = "auth_token";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        registerTokenWithBackend(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        showNotification(remoteMessage);
    }

    private void showNotification(RemoteMessage message) {
        String title = "PatinCarrera";
        String body = "";

        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) {
                title = message.getNotification().getTitle();
            }
            if (message.getNotification().getBody() != null) {
                body = message.getNotification().getBody();
            }
        } else if (!message.getData().isEmpty()) {
            if (message.getData().containsKey("title")) {
                title = message.getData().get("title");
            }
            if (message.getData().containsKey("body")) {
                body = message.getData().get("body");
            }
        }

        NotificationManager manager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Notificaciones PatinCarrera",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            manager.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true);

        manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private void registerTokenWithBackend(String token) {
        String backendBaseUrl = getString(R.string.backend_base_url);
        if (backendBaseUrl == null || backendBaseUrl.trim().isEmpty()) {
            return;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String authToken = prefs.getString(AUTH_TOKEN_KEY, null);
        if (authToken == null || authToken.trim().isEmpty()) {
            return;
        }

        String sanitizedBase = backendBaseUrl.trim();
        if (sanitizedBase.endsWith("/")) {
            sanitizedBase = sanitizedBase.substring(0, sanitizedBase.length() - 1);
        }

        String endpoint = String.format(Locale.US, "%s/api/device-tokens", sanitizedBase);
        String payload = String.format(
            Locale.US,
            "{\"token\":\"%s\",\"plataforma\":\"android\"}",
            token
        );

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(endpoint);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Authorization", "Bearer " + authToken);
                connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                byte[] bodyBytes = payload.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(bodyBytes.length);

                try (OutputStream outputStream = connection.getOutputStream()) {
                    outputStream.write(bodyBytes);
                }

                connection.getResponseCode();
            } catch (Exception ignored) {
                // Silenciar errores de red para evitar crash en background.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }
}
