import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_SNOOZE = 'slm_pwa_install_snooze_until';
const STORAGE_DONE = 'slm_pwa_install_done';
/** Session flag so dev auto-banner does not reappear after dismiss in the same tab. */
const SESSION_DEV_BANNER = 'slm_pwa_dev_install_banner_dismissed';

function isStandaloneDisplay() {
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

function isSnoozedOrInstalled() {
  try {
    if (localStorage.getItem(STORAGE_DONE) === '1') return true;
    const raw = localStorage.getItem(STORAGE_SNOOZE);
    if (!raw) return false;
    const until = parseInt(raw, 10);
    if (Number.isNaN(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

/**
 * Chromium PWA install: captures beforeinstallprompt, shows a bottom sheet above the tab bar when applicable.
 */
export default function PwaInstallPrompt({ language = 'en', offsetForBottomNav = false }) {
  const deferredRef = useRef(null);
  const devTimerSuppressedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [devUiPreview, setDevUiPreview] = useState(false);
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.Capacitor) return undefined;
    if (isStandaloneDisplay()) return undefined;
    let devAutoTimer;
    if (import.meta.env.DEV) {
      try {
        if (new URL(window.location.href).searchParams.get('debugPwaBanner') === '1') {
          setDevUiPreview(true);
          setVisible(true);
        }
      } catch {
        /* ignore */
      }
      devAutoTimer = window.setTimeout(() => {
        if (devTimerSuppressedRef.current) return;
        if (deferredRef.current) return;
        if (isSnoozedOrInstalled()) return;
        try {
          if (sessionStorage.getItem(SESSION_DEV_BANNER) === '1') return;
        } catch {
          /* ignore */
        }
        setDevUiPreview(true);
        setVisible(true);
      }, 2000);
    }

    const onBeforeInstallPrompt = (e) => {
      if (isSnoozedOrInstalled()) return;
      e.preventDefault();
      deferredRef.current = e;
      setDevUiPreview(false);
      setVisible(true);
    };

    const onAppInstalled = () => {
      try {
        localStorage.setItem(STORAGE_DONE, '1');
      } catch {
        /* ignore */
      }
      deferredRef.current = null;
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      if (devAutoTimer != null) window.clearTimeout(devAutoTimer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const dismissSnooze = useCallback(() => {
    const hadDeferred = !!deferredRef.current;
    if (import.meta.env.DEV && devUiPreview && !hadDeferred) {
      devTimerSuppressedRef.current = true;
      try {
        sessionStorage.setItem(SESSION_DEV_BANNER, '1');
      } catch {
        /* ignore */
      }
      setDevUiPreview(false);
      setVisible(false);
      return;
    }
    try {
      localStorage.setItem(STORAGE_SNOOZE, String(Date.now() + SNOOZE_MS));
    } catch {
      /* ignore */
    }
    deferredRef.current = null;
    setDevUiPreview(false);
    setVisible(false);
  }, [devUiPreview]);

  const runInstall = useCallback(async () => {
    const ev = deferredRef.current;
    if (!ev?.prompt) {
      if (import.meta.env.DEV && devUiPreview) {
        window.alert(
          'No install prompt from the browser yet. On localhost, Chrome often waits until install checks pass. Try a production HTTPS URL, Chrome on Android, or reload after interacting with the page.'
        );
      }
      return;
    }
    setBusy(true);
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      /* user dismissed native dialog or prompt failed */
    } finally {
      setBusy(false);
      deferredRef.current = null;
      setVisible(false);
    }
  }, [devUiPreview]);

  if (!visible || typeof document === 'undefined') return null;

  const liftNav = offsetForBottomNav && narrow;
  const bottomOffset = liftNav
    ? 'calc(4rem + env(safe-area-inset-bottom, 0px))'
    : 'env(safe-area-inset-bottom, 0px)';

  const copy =
    language === 'bn'
      ? {
          title: 'স্মার্ট লাইনম্যান ইনস্টল করবেন?',
          body: 'হোম স্ক্রিনে যোগ করলে দ্রুত খোলা যাবে এবং অ্যাপের মতো ব্যবহার করা যাবে।',
          install: 'ইনস্টল',
          later: 'এখন নয়',
        }
      : {
          title: 'Install Smart Lineman?',
          body: 'Add it to your home screen for quick access and an app-like experience.',
          install: 'Install',
          later: 'Not now',
        };

  const devHint =
    import.meta.env.DEV && devUiPreview
      ? language === 'bn'
        ? '(ডেভ সার্ভার — Chrome প্রায়ই ইনস্টল প্রম্পট পাঠায় না; আসল টেস্টের জন্য HTTPS ডিপ্লয় ব্যবহার করুন।)'
        : '(Dev server — Chrome often never sends the install prompt here. Test a real install on your deployed HTTPS site or Chrome on Android. Optional: add ?debugPwaBanner=1 to open this sheet immediately.)'
      : null;

  const sheet = (
    <div
      className="fixed left-0 right-0 z-[5000] px-3 pointer-events-none animate-slide-up"
      style={{ bottom: bottomOffset }}
    >
      <div className="max-w-lg mx-auto pointer-events-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.25)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.title}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{copy.body}</p>
        {devHint ? (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-1.5 font-medium leading-snug">
            {devHint}
          </p>
        ) : null}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={dismissSnooze}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {copy.later}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={runInstall}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-60 shadow-md shadow-orange-900/20 transition-colors"
          >
            {busy ? '…' : copy.install}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
