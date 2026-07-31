import { useCallback, useEffect, useState } from 'react';

/**
 * Older builds cached "installed" in localStorage, which survived an uninstall
 * and left the button stuck on "already installed". Detection is live now, so
 * these are only cleared.
 */
const LEGACY_KEYS = ['slm_pwa_install_done', 'slm_pwa_install_snooze_until'];

function clearLegacyInstallFlags() {
  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return true;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  } catch {
    /* ignore */
  }
  return window.navigator.standalone === true;
}

export function isIos() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const iOsDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = ua.includes('Macintosh') && 'ontouchend' in document;
  return iOsDevice || iPadOs;
}

/** True only while actually running as the installed app. */
function isRunningInstalled() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.Capacitor) || isStandaloneDisplay();
}

function getDeferredPrompt() {
  if (typeof window === 'undefined') return null;
  return (window.__pwaInstall && window.__pwaInstall.deferred) || null;
}

/** Chromium can tell us whether this PWA is installed right now. */
async function hasInstalledRelatedApp() {
  try {
    if (typeof navigator === 'undefined' || !navigator.getInstalledRelatedApps) return false;
    const apps = await navigator.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}

/**
 * Live install state for the Install button.
 * `alreadyInstalled` is re-checked when the tab regains focus so uninstalling
 * on the device is picked up without a hard reload.
 */
export function usePwaInstall() {
  const [alreadyInstalled, setAlreadyInstalled] = useState(isRunningInstalled);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    clearLegacyInstallFlags();

    let cancelled = false;

    const refresh = async () => {
      if (isRunningInstalled()) {
        if (!cancelled) setAlreadyInstalled(true);
        return;
      }
      // A pending install prompt is proof the app is not installed.
      if (getDeferredPrompt()) {
        if (!cancelled) setAlreadyInstalled(false);
        return;
      }
      const installed = await hasInstalledRelatedApp();
      if (!cancelled) setAlreadyInstalled(installed);
    };

    refresh();

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (window.__pwaInstall) window.__pwaInstall.deferred = e;
      if (!cancelled) setAlreadyInstalled(false);
    };

    const onAppInstalled = () => {
      if (window.__pwaInstall) window.__pwaInstall.deferred = null;
      if (!cancelled) setAlreadyInstalled(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  /** Resolves to 'installed', 'dismissed', or 'manual' when steps are needed. */
  const promptInstall = useCallback(async () => {
    const ev = getDeferredPrompt();
    if (!ev?.prompt) return 'manual';

    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice?.outcome === 'accepted') {
        setAlreadyInstalled(true);
        return 'installed';
      }
      return 'dismissed';
    } catch {
      return 'dismissed';
    } finally {
      if (window.__pwaInstall) window.__pwaInstall.deferred = null;
    }
  }, []);

  return { alreadyInstalled, promptInstall };
}
