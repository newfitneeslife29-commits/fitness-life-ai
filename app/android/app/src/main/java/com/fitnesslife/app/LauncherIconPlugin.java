package com.fitnesslife.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
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
// exactly one is enabled. The switch happens when the app goes to the
// background, because changing the launcher entry of the running app can
// close it on some phones.
@CapacitorPlugin(name = "LauncherIcon")
public class LauncherIconPlugin extends Plugin {

    static final List<String> ICONS = Arrays.asList("naranja", "rojo", "rosa", "morado", "azul", "verde", "dorado", "blanco", "claro");
    private static final String DEFAULT = "naranja";
    private static final String PREFS = "launcher_icon";
    private static final String PENDING = "pending";

    @Override
    public void load() {
        // A change the app did not get to apply (it was closed first).
        apply();
    }

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
        apply();
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
