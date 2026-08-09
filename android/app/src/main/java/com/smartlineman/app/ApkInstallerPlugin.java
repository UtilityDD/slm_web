package com.smartlineman.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Sideload APK updater: download to cache + launch the system package installer.
 * Avoids Chrome Custom Tabs, which often block or mishandle .apk downloads.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {
    private static final String UPDATE_FILE_NAME = "smartlineman-update.apk";
    private static final int CONNECT_TIMEOUT_MS = 30000;
    private static final int READ_TIMEOUT_MS = 120000;

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("allowed", canRequestPackageInstalls());
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + activity.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open install permission settings: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.trim().isEmpty()) {
            call.reject("path is required");
            return;
        }
        try {
            File apk = resolveApkFile(path.trim());
            launchInstaller(apk);
            JSObject ret = new JSObject();
            ret.put("completed", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Install failed: " + e.getMessage(), e);
        }
    }

    /**
     * Download APK on a background thread (avoids WebView base64 memory pressure), then install.
     */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
            return;
        }
        final String apkUrl = url.trim();

        if (!canRequestPackageInstalls()) {
            JSObject ret = new JSObject();
            ret.put("completed", false);
            ret.put("needsPermission", true);
            call.resolve(ret);
            return;
        }

        execute(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection connection = null;
                try {
                    File outFile = new File(getContext().getCacheDir(), UPDATE_FILE_NAME);
                    if (outFile.exists() && !outFile.delete()) {
                        // Continue — FileOutputStream will overwrite when possible.
                    }

                    URL endpoint = new URL(apkUrl);
                    connection = (HttpURLConnection) endpoint.openConnection();
                    connection.setInstanceFollowRedirects(true);
                    connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
                    connection.setReadTimeout(READ_TIMEOUT_MS);
                    connection.setRequestMethod("GET");
                    connection.setRequestProperty("Accept", "application/vnd.android.package-archive,*/*");
                    connection.connect();

                    int status = connection.getResponseCode();
                    // Follow one manual redirect hop if needed (some stacks disable auto for HTTPS).
                    if (status == HttpURLConnection.HTTP_MOVED_PERM
                            || status == HttpURLConnection.HTTP_MOVED_TEMP
                            || status == HttpURLConnection.HTTP_SEE_OTHER
                            || status == 307
                            || status == 308) {
                        String location = connection.getHeaderField("Location");
                        connection.disconnect();
                        if (location == null || location.isEmpty()) {
                            call.reject("APK download redirect missing Location");
                            return;
                        }
                        connection = (HttpURLConnection) new URL(location).openConnection();
                        connection.setInstanceFollowRedirects(true);
                        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
                        connection.setReadTimeout(READ_TIMEOUT_MS);
                        connection.setRequestMethod("GET");
                        connection.connect();
                        status = connection.getResponseCode();
                    }

                    if (status < 200 || status >= 300) {
                        call.reject("APK download failed with HTTP " + status);
                        return;
                    }

                    long total = connection.getContentLengthLong();
                    try (InputStream in = new BufferedInputStream(connection.getInputStream());
                         FileOutputStream out = new FileOutputStream(outFile)) {
                        byte[] buffer = new byte[64 * 1024];
                        long written = 0;
                        int read;
                        int lastPct = -1;
                        while ((read = in.read(buffer)) != -1) {
                            out.write(buffer, 0, read);
                            written += read;
                            if (total > 0) {
                                int pct = (int) Math.min(99, (written * 100) / total);
                                if (pct != lastPct && (pct % 5 == 0 || pct >= 99)) {
                                    lastPct = pct;
                                    JSObject progress = new JSObject();
                                    progress.put("percent", pct);
                                    progress.put("bytesWritten", written);
                                    progress.put("totalBytes", total);
                                    notifyListeners("downloadProgress", progress);
                                }
                            }
                        }
                        out.flush();
                    }

                    if (!outFile.exists() || outFile.length() < 1024) {
                        call.reject("Downloaded APK is missing or too small");
                        return;
                    }

                    // Switch to UI thread for startActivity.
                    final File apkFile = outFile;
                    getBridge().executeOnMainThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                launchInstaller(apkFile);
                                JSObject ret = new JSObject();
                                ret.put("completed", true);
                                ret.put("needsPermission", false);
                                ret.put("path", apkFile.getAbsolutePath());
                                call.resolve(ret);
                            } catch (Exception e) {
                                call.reject("Install failed: " + e.getMessage(), e);
                            }
                        }
                    });
                } catch (Exception e) {
                    call.reject("Download failed: " + e.getMessage(), e);
                } finally {
                    if (connection != null) {
                        connection.disconnect();
                    }
                }
            }
        });
    }

    private boolean canRequestPackageInstalls() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }
        PackageManager pm = getContext().getPackageManager();
        return pm != null && pm.canRequestPackageInstalls();
    }

    private File resolveApkFile(String path) throws Exception {
        String cleaned = path;
        if (cleaned.startsWith("file://")) {
            cleaned = Uri.parse(cleaned).getPath();
        }
        if (cleaned == null || cleaned.isEmpty()) {
            throw new Exception("Invalid APK path");
        }
        File file = new File(cleaned);
        if (!file.exists() || !file.isFile()) {
            throw new Exception("APK file not found");
        }
        return file;
    }

    private void launchInstaller(File apkFile) throws Exception {
        Activity activity = getActivity();
        if (activity == null) {
            throw new Exception("Activity unavailable");
        }
        if (!canRequestPackageInstalls()) {
            throw new Exception("Install unknown apps permission required");
        }

        Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity.startActivity(intent);
    }
}
