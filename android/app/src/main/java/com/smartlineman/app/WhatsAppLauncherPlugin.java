package com.smartlineman.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Open a specific WhatsApp / WhatsApp Business package so dual-app users
 * are not asked every time. Visibility comes from manifest &lt;queries&gt;.
 */
@CapacitorPlugin(name = "WhatsAppLauncher")
public class WhatsAppLauncherPlugin extends Plugin {
    private static final String[] KNOWN = new String[] {
            "com.whatsapp",
            "com.whatsapp.w4b"
    };

    @PluginMethod
    public void listApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Map<String, String> found = new LinkedHashMap<>();

        addHandlers(pm, found, Uri.parse("whatsapp://send?phone=910000000000"));
        addHandlers(pm, found, Uri.parse("https://wa.me/910000000000"));
        addHandlers(pm, found, Uri.parse("https://api.whatsapp.com/send?phone=910000000000"));

        for (String pkg : KNOWN) {
            if (found.containsKey(pkg)) continue;
            if (isInstalled(pm, pkg)) {
                found.put(pkg, labelFor(pm, pkg));
            }
        }

        JSArray apps = new JSArray();
        List<String> order = new ArrayList<>(found.keySet());
        order.sort((a, b) -> Integer.compare(knownRank(a), knownRank(b)));
        for (String pkg : order) {
            JSObject app = new JSObject();
            app.put("packageName", pkg);
            app.put("label", found.get(pkg));
            apps.put(app);
        }
        JSObject ret = new JSObject();
        ret.put("apps", apps);
        call.resolve(ret);
    }

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("packageName", "");
        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
            return;
        }
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (packageName != null && !packageName.trim().isEmpty()) {
                intent.setPackage(packageName.trim());
            }
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open WhatsApp: " + e.getMessage(), e);
        }
    }

    private static int knownRank(String pkg) {
        if ("com.whatsapp".equals(pkg)) return 0;
        if ("com.whatsapp.w4b".equals(pkg)) return 1;
        return 2;
    }

    private void addHandlers(PackageManager pm, Map<String, String> found, Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        List<ResolveInfo> list;
        if (Build.VERSION.SDK_INT >= 33) {
            list = pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0));
        } else {
            list = pm.queryIntentActivities(intent, 0);
        }
        if (list == null) return;
        String self = getContext().getPackageName();
        for (ResolveInfo info : list) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            if (pkg == null || pkg.isEmpty() || pkg.equals(self) || found.containsKey(pkg)) continue;
            CharSequence label = info.loadLabel(pm);
            found.put(pkg, label != null && label.length() > 0 ? label.toString() : labelFor(pm, pkg));
        }
    }

    private static boolean isInstalled(PackageManager pm, String pkg) {
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                pm.getPackageInfo(pkg, PackageManager.PackageInfoFlags.of(0));
            } else {
                pm.getPackageInfo(pkg, 0);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String labelFor(PackageManager pm, String pkg) {
        try {
            CharSequence label = pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0));
            if (label != null && label.length() > 0) return label.toString();
        } catch (Exception ignored) {
            // fall through
        }
        if ("com.whatsapp.w4b".equals(pkg)) return "WhatsApp Business";
        if ("com.whatsapp".equals(pkg)) return "WhatsApp";
        return pkg;
    }
}
