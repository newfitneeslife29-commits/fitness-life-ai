package com.fitnesslife.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// The home screen widget's data (streak, steps, today's workout), written by
// the app as JSON with the texts already in the person's language.
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null || data.length() > 4000) {
            call.reject("bad_data");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE).edit().putString(TodayWidget.KEY, data).apply();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TodayWidget.class));
        if (ids.length > 0) TodayWidget.render(context, manager, ids);
        call.resolve();
    }
}
