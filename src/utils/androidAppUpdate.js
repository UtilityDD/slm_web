import { registerPlugin } from '@capacitor/core';
import {
  ANDROID_APK_URL,
  ANDROID_DOWNLOAD_PAGE_URL,
  ANDROID_LATEST_MANIFEST_URL,
  CURRENT_APP_RELEASE_NOTES,
} from '../config';
import { isNativeCapacitorPlatform } from './webPush';
import { App } from '@capacitor/app';

const ApkInstaller = registerPlugin('ApkInstaller');

function parseVersionCode(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toWwwUrl(url) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'smartlineman.in') {
      u.hostname = 'www.smartlineman.in';
      return u.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

function resolveApkDownloadUrl(remoteUrl) {
  const url = toWwwUrl(remoteUrl || ANDROID_APK_URL);
  if (!url) return ANDROID_APK_URL;
  // Older manifests / fallbacks may point at the HTML download page.
  if (/\/download\/?($|\?)/i.test(url)) return ANDROID_APK_URL;
  return url;
}

/**
 * Fetch live APK channel metadata and compare with the installed native build.
 * Returns null when no update is needed or the check cannot run (web/PWA).
 */
export async function checkNativeAndroidUpdate() {
  if (!isNativeCapacitorPlatform()) return null;

  let installed;
  try {
    installed = await App.getInfo();
  } catch (err) {
    console.warn('Native App.getInfo failed', err);
    return null;
  }

  const installedCode = parseVersionCode(installed.build);
  let remote;
  try {
    const res = await fetch(ANDROID_LATEST_MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    remote = await res.json();
  } catch (err) {
    console.warn('Android latest manifest fetch failed', err);
    return null;
  }

  const remoteCode = parseVersionCode(remote.version_code);
  if (!remoteCode || remoteCode <= installedCode) return null;

  const minSupported = parseVersionCode(remote.min_supported_version_code);
  const forceUpdate = Boolean(remote.force_update) || (minSupported > 0 && installedCode < minSupported);
  const apkUrl = resolveApkDownloadUrl(remote.apk_url || ANDROID_APK_URL);
  const downloadPage = toWwwUrl(remote.download_page || ANDROID_DOWNLOAD_PAGE_URL);

  return {
    version_name: remote.version_name || String(remoteCode),
    /** Direct APK URL for in-app download+install (not Custom Tabs). */
    update_url: apkUrl,
    download_page: downloadPage,
    release_notes: remote.release_notes || CURRENT_APP_RELEASE_NOTES,
    forceUpdate,
    installed_version_code: installedCode,
    remote_version_code: remoteCode,
  };
}

/**
 * Download the APK inside the app and open the system package installer.
 * @param {string} apkUrl
 * @param {{ onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<{ ok: boolean, needsPermission?: boolean, error?: string, path?: string }>}
 */
export async function downloadAndInstallNativeUpdate(apkUrl, options = {}) {
  if (!isNativeCapacitorPlatform()) {
    return { ok: false, error: 'Not a native Android build' };
  }

  const url = resolveApkDownloadUrl(apkUrl || ANDROID_APK_URL);
  if (!url) {
    return { ok: false, error: 'Missing APK URL' };
  }

  let progressHandle;
  try {
    if (typeof options.onProgress === 'function') {
      progressHandle = await ApkInstaller.addListener('downloadProgress', (event) => {
        const pct = Number(event?.percent);
        if (Number.isFinite(pct)) options.onProgress(pct);
      });
    }

    const result = await ApkInstaller.downloadAndInstall({ url });
    if (result?.needsPermission) {
      return { ok: false, needsPermission: true };
    }
    if (result?.completed) {
      options.onProgress?.(100);
      return { ok: true, path: result.path || null };
    }
    return { ok: false, error: 'Install did not start' };
  } catch (err) {
    const message = err?.message || String(err) || 'Download failed';
    console.warn('downloadAndInstallNativeUpdate failed', err);
    return { ok: false, error: message };
  } finally {
    try {
      await progressHandle?.remove?.();
    } catch {
      /* ignore */
    }
  }
}

/** Open Android settings so the user can allow “Install unknown apps” for SmartLineman. */
export async function openNativeInstallPermissionSettings() {
  if (!isNativeCapacitorPlatform()) return;
  try {
    await ApkInstaller.openInstallPermissionSettings();
  } catch (err) {
    console.warn('openInstallPermissionSettings failed', err);
  }
}

/** True when the app may launch the package installer (Android 8+ unknown-sources grant). */
export async function canNativeInstallPackages() {
  if (!isNativeCapacitorPlatform()) return false;
  try {
    const res = await ApkInstaller.canInstallPackages();
    return Boolean(res?.allowed);
  } catch {
    return false;
  }
}
