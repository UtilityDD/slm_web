import { useCallback, useEffect, useState } from 'react';

const STORAGE_DONE = 'slm_pwa_install_done';

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

export function markInstallDone() {
  try {
    localStorage.setItem(STORAGE_DONE, '1');
  } catch {
    /* ignore */
  }
}

function getDeferredPrompt() {
  if (typeof window === 'undefined') return null;
  return (window.__pwaInstall && window.__pwaInstall.deferred) || null;
}

/**
 * Landing-page install helpers.
 * `alreadyInstalled` — running as installed app / Capacitor / prior success.
 * `promptInstall` — native Chromium prompt, or `'manual'` when steps are needed.
 */
export function usePwaInstall() {
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [, setPromptReady] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const sync = () => {
      const done =
        Boolean(window.Capacitor) ||
        isStandaloneDisplay() ||
        Boolean(window.__pwaInstall?.installed) ||
        (() => {
          try {
            return localStorage.getItem(STORAGE_DONE) === '1';
          } catch {
            return false;
          }
        })();
      setAlreadyInstalled(done);
      setPromptReady((n) => n + 1);
    };

    sync();

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      if (window.__pwaInstall) window.__pwaInstall.deferred = e;
      sync();
    };

    const onAppInstalled = () => {
      markInstallDone();
      if (window.__pwaInstall) window.__pwaInstall.deferred = null;
      setAlreadyInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const ev = getDeferredPrompt();
    if (!ev?.prompt) return 'manual';

    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice?.outcome === 'accepted') {
        markInstallDone();
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
