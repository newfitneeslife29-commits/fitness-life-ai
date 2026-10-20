package com.fitnesslife.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

// Home screen widget: the streak, today's steps and today's workout, as the
// app last saved them (WidgetBridgePlugin). Tapping it opens the app.
public class TodayWidget extends AppWidgetProvider {

    static final String PREFS = "fitness_widget";
    static final String KEY = "data";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
    }

    static void render(Context context, AppWidgetManager manager, int[] ids) {
        JSONObject data;
        try {
            data = new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "{}"));
        } catch (Exception e) {
            data = new JSONObject();
        }
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent tap = open == null ? null
            : PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        // Saved on an earlier day: 0 steps and the next workout (today's isn't done).
        String day = data.optString("day", "");
        boolean stale = !day.isEmpty() && !day.equals(new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
            views.setTextViewText(R.id.widget_streak, data.optString("streak", "0"));
            views.setTextViewText(R.id.widget_streak_label, data.optString("streakLabel", ""));
            views.setTextViewText(R.id.widget_steps, stale ? "0" : data.optString("steps", "0"));
            views.setTextViewText(R.id.widget_steps_label, data.optString("stepsLabel", ""));
            String next = stale ? data.optString("later", data.optString("next", "")) : data.optString("next", "");
            views.setTextViewText(R.id.widget_next_label, data.optString("nextLabel", ""));
            views.setTextViewText(R.id.widget_next, next);
            views.setViewVisibility(R.id.widget_next_row, next.isEmpty() ? View.GONE : View.VISIBLE);
            if (tap != null) views.setOnClickPendingIntent(R.id.widget_root, tap);
            manager.updateAppWidget(id, views);
        }
    }
}
