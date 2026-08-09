import { App } from '@capacitor/app';
import {
  ANDROID_DOWNLOAD_PAGE_URL,
  ANDROID_LATEST_MANIFEST_URL,
  CURRENT_APP_RELEASE_NOTES,
} from '../config';
import { isNativeCapacitorPlatform } from './webPush';

function parseVersionCode(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
  const updateUrl = remote.apk_url || remote.download_page || ANDROID_DOWNLOAD_PAGE_URL;

  return {
    version_name: remote.version_name || String(remoteCode),
    update_url: updateUrl,
    release_notes: remote.release_notes || CURRENT_APP_RELEASE_NOTES,
    forceUpdate,
    installed_version_code: installedCode,
    remote_version_code: remoteCode,
  };
}
