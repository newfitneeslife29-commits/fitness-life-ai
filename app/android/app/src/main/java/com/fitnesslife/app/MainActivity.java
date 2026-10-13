package com.fitnesslife.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-only plugins (not from npm) are registered before the bridge starts.
        registerPlugin(StorySharePlugin.class);
        registerPlugin(LauncherIconPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
