package com.fitnesslife.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.PowerManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

// The app icon color chosen in Settings. Each color is a launcher
// <activity-alias> in AndroidManifest.xml (".IconNaranja", ".IconRojo"...);
// exactly one is enabled. Disabling the entry the app was opened from closes
// its task, so the switch waits until the person leaves the app for the home
// screen: not while the camera, a sign-in page or a permission screen is
// open on top of it, and not when the screen just turns off.
@CapacitorPlugin(name = "LauncherIcon")
public class LauncherIconPlugin extends Plugin {

    static final List<String> ICONS = Arrays.asList("naranja", "rojo", "rosa", "morado", "azul", "verde", "dorado", "blanco", "claro");
    private static final String DEFAULT = "naranja";
    private static final String PREFS = "launcher_icon";
    private static final String PENDING = "pending";

    @PluginMethod
    public void get(PluginCall call) {
        String pending = prefs().getString(PENDING, null);
        JSObject result = new JSObject();
        result.put("name", pending != null ? pending : enabled());
        call.resolve(result);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String name = call.getString("name");
        if (name == null || !ICONS.contains(name)) {
            call.reject("unknown_icon");
            return;
        }
        prefs().edit().putString(PENDING, name).apply();
        call.resolve();
    }

    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        if (leftTheApp()) apply();
    }

    // True when the app went to the background with nothing of it on screen:
    // the screen is on and our task still ends in MainActivity (another
    // screen opened from the app, like the camera or a browser tab, would be
    // on top of it in the same task).
    private boolean leftTheApp() {
        Activity activity = getActivity();
        if (activity == null || activity.isChangingConfigurations()) return false;
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        if (power != null && !power.isInteractive()) return false;
        ActivityManager manager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) return false;
        for (ActivityManager.AppTask task : manager.getAppTasks()) {
            ActivityManager.RecentTaskInfo info = task.getTaskInfo();
            if (info.persistentId != activity.getTaskId()) continue;
            return info.topActivity != null && MainActivity.class.getName().equals(info.topActivity.getClassName());
        }
        return false;
    }

    private void apply() {
        String pending = prefs().getString(PENDING, null);
        if (pending == null) return;
        PackageManager pm = getContext().getPackageManager();
        // Enable the new entry first, so the app is never left without one.
        pm.setComponentEnabledSetting(alias(pending), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        for (String icon : ICONS) {
            if (!icon.equals(pending)) {
                pm.setComponentEnabledSetting(alias(icon), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            }
        }
        prefs().edit().remove(PENDING).apply();
    }

    private String enabled() {
        PackageManager pm = getContext().getPackageManager();
        for (String icon : ICONS) {
            int state = pm.getComponentEnabledSetting(alias(icon));
            boolean on = state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                || (state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT && icon.equals(DEFAULT));
            if (on) return icon;
        }
        return DEFAULT;
    }

    private ComponentName alias(String icon) {
        String name = icon.substring(0, 1).toUpperCase(Locale.ROOT) + icon.substring(1);
        // Aliases are named after the code package, which stays the same in every build.
        return new ComponentName(getContext(), LauncherIconPlugin.class.getPackage().getName() + ".Icon" + name);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
