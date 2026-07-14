import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** How long after the visit before the install dialog appears. */
const SHOW_AFTER_MS = 4000;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_SNOOZE = 'slm_pwa_install_snooze_until';
const STORAGE_DONE = 'slm_pwa_install_done';

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

function isIos() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const iOsDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect via touch support.
  const iPadOs = ua.includes('Macintosh') && 'ontouchend' in document;
  return iOsDevice || iPadOs;
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
 * Shows an install dialog a few seconds after the user visits the page.
 * On Chromium it triggers the native install prompt; on iOS Safari it shows
 * the "Add to Home Screen" steps (Safari has no programmatic install).
 */
export default function PwaInstallPrompt({ language = 'en', offsetForBottomNav = false }) {
  const deferredRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );

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

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredRef.current = e;
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

    let timer;
    if (!isSnoozedOrInstalled()) {
      timer = window.setTimeout(() => {
        // Only auto-show if the browser can install (native prompt captured) or it's iOS.
        if (deferredRef.current || isIos()) setVisible(true);
      }, SHOW_AFTER_MS);
    }

    return () => {
      if (timer != null) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const dismissSnooze = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_SNOOZE, String(Date.now() + SNOOZE_MS));
    } catch {
      /* ignore */
    }
    setShowIosHelp(false);
    setVisible(false);
  }, []);

  const runInstall = useCallback(async () => {
    const ev = deferredRef.current;
    if (!ev?.prompt) {
      // iOS / browsers without programmatic install: show the manual steps.
      setShowIosHelp(true);
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
  }, []);

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
          iosSteps: [
            'নিচের শেয়ার আইকন-এ ট্যাপ করুন।',
            '"Add to Home Screen" সিলেক্ট করুন।',
            '"Add" চাপুন — অ্যাপটি হোম স্ক্রিনে যোগ হবে।',
          ],
        }
      : {
          title: 'Install Smart Lineman?',
          body: 'Add it to your home screen for quick access and an app-like experience.',
          install: 'Install',
          later: 'Not now',
          iosSteps: [
            'Tap the Share icon in the toolbar.',
            'Choose "Add to Home Screen".',
            'Tap "Add" — the app lands on your home screen.',
          ],
        };

  const sheet = (
    <div
      className="fixed left-0 right-0 z-[5000] px-3 pointer-events-none animate-slide-up"
      style={{ bottom: bottomOffset }}
    >
      <div className="max-w-lg mx-auto pointer-events-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.25)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.title}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{copy.body}</p>

        {showIosHelp ? (
          <ol className="mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {copy.iosSteps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-none w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={dismissSnooze}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {copy.later}
          </button>
          {!showIosHelp ? (
            <button
              type="button"
              disabled={busy}
              onClick={runInstall}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-60 shadow-md shadow-orange-900/20 transition-colors"
            >
              {busy ? '…' : copy.install}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
