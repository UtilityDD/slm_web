import React, { useCallback, useEffect, useRef, useState } from 'react';
import { storageUtils } from '../utils/storageUtils';

const UPDATE_CHECK_MS = 60 * 1000;

function isChunkLoadError(error) {
  const msg = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

/**
 * Registers the app service worker and shows "Update available → Reload"
 * when a new version is waiting. Also recovers from stale chunk loads after deploy.
 */
const RegisterSW = () => {
  const [needUpdate, setNeedUpdate] = useState(false);
  const [reloading, setReloading] = useState(false);
  const registrationRef = useRef(null);
  const refreshingRef = useRef(false);

  const language = storageUtils.getItem('appLanguage') || 'bn';
  const isEn = language === 'en';

  const applyUpdate = useCallback(() => {
    const registration = registrationRef.current;
    const waiting = registration?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    setReloading(true);
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || window.Capacitor) return undefined;

    let cancelled = false;
    let updateTimer;

    const onControllerChange = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const trackWaitingWorker = (worker) => {
      if (!worker) return;
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        setNeedUpdate(true);
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setNeedUpdate(true);
        }
      });
    };

    const onUpdateFound = (registration) => {
      trackWaitingWorker(registration.installing);
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (cancelled) return;
        registrationRef.current = registration;

        if (registration.waiting && navigator.serviceWorker.controller) {
          setNeedUpdate(true);
        }

        registration.addEventListener('updatefound', () => onUpdateFound(registration));
        trackWaitingWorker(registration.installing);

        updateTimer = window.setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_MS);

        // Check soon after load in case deploy happened while tab was idle.
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    // Safety net: if a lazy route fails after deploy, reload once.
    const onUnhandledRejection = (event) => {
      if (!isChunkLoadError(event.reason)) return;
      const key = 'slm_chunk_reload';
      const last = Number(sessionStorage.getItem(key) || 0);
      const now = Date.now();
      if (now - last < 15000) return;
      sessionStorage.setItem(key, String(now));
      event.preventDefault?.();
      window.location.reload();
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      cancelled = true;
      if (updateTimer) window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (!needUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[9999] animate-slide-up">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 max-w-sm w-full mx-auto sm:mx-0 ring-1 ring-black/5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Update available' : 'আপডেট উপলব্ধ'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEn
                ? 'A new version of SmartLineman is ready. Reload to apply updates.'
                : 'স্মার্টলাইনম্যানের নতুন ভার্সন প্রস্তুত। আপডেট করতে রিলোড করুন।'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            disabled={reloading}
            onClick={applyUpdate}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-70 text-white text-xs font-bold py-2.5 px-3 rounded-lg transition-colors shadow-sm"
          >
            {reloading
              ? (isEn ? 'Updating…' : 'আপডেট হচ্ছে…')
              : (isEn ? 'Reload' : 'রিলোড')}
          </button>
          <button
            type="button"
            disabled={reloading}
            onClick={() => setNeedUpdate(false)}
            className="px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {isEn ? 'Later' : 'পরে'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterSW;
