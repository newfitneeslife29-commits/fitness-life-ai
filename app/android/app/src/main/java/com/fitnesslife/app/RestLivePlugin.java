package com.fitnesslife.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// The rest between sets outside the app: an ongoing, silent notification whose
// clock counts down to the end of the rest by itself, then goes away.
@CapacitorPlugin(name = "RestLive")
public class RestLivePlugin extends Plugin {
    private static final String CHANNEL = "rest_live";
    private static final int ID = 7301;

    @PluginMethod
    public void start(PluginCall call) {
        Double endsAt = call.getDouble("endsAt");
        if (endsAt == null) {
            call.reject("bad_data");
            return;
        }
        long ends = endsAt.longValue();
        long left = ends - System.currentTimeMillis();
        Context ctx = getContext();
        NotificationManager manager = ctx.getSystemService(NotificationManager.class);
        if (left <= 0 || manager == null) {
            if (manager != null) manager.cancel(ID);
            call.resolve();
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            call.resolve();
            return;
        }
        NotificationChannel channel = new NotificationChannel(CHANNEL, call.getString("channel", "Rest"), NotificationManager.IMPORTANCE_LOW);
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent tap = open == null ? null : PendingIntent.getActivity(ctx, ID, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setColor(0xFFF26B1D)
            .setContentTitle(call.getString("title", ""))
            .setContentText(call.getString("subtitle", ""))
            .setWhen(ends)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setTimeoutAfter(left)
            .setContentIntent(tap);
        manager.notify(ID, notification.build());
        call.resolve();
    }

    @PluginMethod
    public void end(PluginCall call) {
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager != null) manager.cancel(ID);
        call.resolve();
    }
}
