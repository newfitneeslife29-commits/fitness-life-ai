package com.fitnesslife.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

// Shares an image straight to Instagram or Facebook Stories, or to the
// Facebook, Instagram or TikTok app. Rejects with "not_installed" when the
// app is missing, so the web side can fall back to the share sheet.
@CapacitorPlugin(name = "StoryShare")
public class StorySharePlugin extends Plugin {

    // Meta app id of Fitness Life: Instagram and Facebook Stories require it.
    private static final String META_APP_ID = "1083377077815719";
    private static final String INSTAGRAM = "com.instagram.android";
    private static final String FACEBOOK = "com.facebook.katana";
    private static final String[] TIKTOK = { "com.zhiliaoapp.musically", "com.ss.android.ugc.trill" };

    @PluginMethod
    public void share(PluginCall call) {
        String target = call.getString("target", "");
        String path = call.getString("path", "");
        if (path.startsWith("file://")) path = Uri.parse(path).getPath();
        File file = new File(path);
        if (!file.exists()) {
            call.reject("missing_file");
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
        try {
            switch (target) {
                case "instagram-story": {
                    Intent intent = new Intent("com.instagram.share.ADD_TO_STORY");
                    intent.putExtra("source_application", META_APP_ID);
                    intent.setDataAndType(uri, "image/png");
                    start(intent, INSTAGRAM, uri);
                    break;
                }
                case "facebook-story": {
                    Intent intent = new Intent("com.facebook.stories.ADD_TO_STORY");
                    intent.putExtra("com.facebook.platform.extra.APPLICATION_ID", META_APP_ID);
                    intent.setDataAndType(uri, "image/png");
                    start(intent, FACEBOOK, uri);
                    break;
                }
                case "instagram":
                    start(sendIntent(uri), INSTAGRAM, uri);
                    break;
                case "facebook":
                    start(sendIntent(uri), FACEBOOK, uri);
                    break;
                case "tiktok": {
                    ActivityNotFoundException last = null;
                    for (String pkg : TIKTOK) {
                        try {
                            start(sendIntent(uri), pkg, uri);
                            last = null;
                            break;
                        } catch (ActivityNotFoundException e) {
                            last = e;
                        }
                    }
                    if (last != null) throw last;
                    break;
                }
                default:
                    call.reject("unknown_target");
                    return;
            }
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("not_installed");
        } catch (Exception e) {
            call.reject("failed", e);
        }
    }

    private Intent sendIntent(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_STREAM, uri);
        return intent;
    }

    private void start(Intent intent, String pkg, Uri uri) {
        intent.setPackage(pkg);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().grantUriPermission(pkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(intent);
    }
}
