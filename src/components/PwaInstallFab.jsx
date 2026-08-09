import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { APP_NAME, ANDROID_DOWNLOAD_PAGE_URL } from '../config';
import { isIos, usePwaInstall } from '../utils/pwaInstall';
import { isNativeCapacitorPlatform } from '../utils/webPush';

/**
 * Always-visible Install FAB on the landing page.
 * Opens a clean modal: Not now / OK, or “already installed” when applicable.
 */
export default function PwaInstallFab({ language = 'en', aboveStickyCta = false, onOpenChange }) {
  const { alreadyInstalled, promptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);
  const isNative = isNativeCapacitorPlatform();

  useEffect(() => {
    if (isNative) {
      onOpenChange?.(false);
      return undefined;
    }
    onOpenChange?.(open);
    return undefined;
  }, [open, onOpenChange, isNative]);

  const close = useCallback(() => {
    setOpen(false);
    setShowSteps(false);
  }, []);

  const openModal = useCallback(() => {
    setShowSteps(false);
    setOpen(true);
  }, []);

  const onOk = useCallback(async () => {
    if (alreadyInstalled) {
      close();
      return;
    }
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'manual') {
        setShowSteps(true);
      } else {
        close();
      }
    } finally {
      setBusy(false);
    }
  }, [alreadyInstalled, close, promptInstall]);

  const bn = language === 'bn';
  const fontClass = bn ? 'font-bengali' : '';

  const copy = bn
    ? {
        fab: 'ইনস্টল',
        fabAria: 'অ্যাপ ইনস্টল করুন',
        title: `${APP_NAME} ইনস্টল করবেন?`,
        body: 'হোম স্ক্রিনে যোগ করলে দ্রুত খোলা যাবে এবং অ্যাপের মতো ব্যবহার করা যাবে।',
        alreadyTitle: 'অ্যাপ ইতিমধ্যে আছে',
        alreadyBody: 'আপনার ডিভাইসে ইতিমধ্যে এই অ্যাপ ইনস্টল করা আছে।',
        ok: 'ঠিক আছে',
        later: 'এখন নয়',
        gotIt: 'বুঝেছি',
        stepsIntro: 'অ্যাপ যোগ করতে এই ধাপগুলো অনুসরণ করুন:',
        iosSteps: [
          'নিচের শেয়ার আইকন-এ ট্যাপ করুন।',
          '"Add to Home Screen" সিলেক্ট করুন।',
          '"Add" চাপুন।',
        ],
        genericSteps: [
          'ব্রাউজারের মেনু (⋮) খুলুন।',
          '"Install app" বা "Add to Home screen" বেছে নিন।',
          'নিশ্চিত করুন।',
        ],
        androidApk: 'অ্যান্ড্রয়েড APK',
      }
    : {
        fab: 'Install',
        fabAria: 'Install the app',
        title: `Install ${APP_NAME}?`,
        body: 'Add it to your home screen for quick access and an app-like experience.',
        alreadyTitle: 'App already installed',
        alreadyBody: 'Your device already has this app.',
        ok: 'OK',
        later: 'Not now',
        gotIt: 'Got it',
        stepsIntro: 'Follow these steps to add the app:',
        iosSteps: [
          'Tap the Share icon in the toolbar.',
          'Choose "Add to Home Screen".',
          'Tap "Add".',
        ],
        genericSteps: [
          'Open your browser menu (⋮).',
          'Choose "Install app" or "Add to Home screen".',
          'Confirm to finish.',
        ],
        androidApk: 'Android APK',
      };

  const steps = isIos() ? copy.iosSteps : copy.genericSteps;
  const mode = alreadyInstalled ? 'already' : showSteps ? 'steps' : 'ask';

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[5000] flex items-end justify-center bg-slate-900/55 p-0 animate-fade-in sm:items-center sm:p-4"
            role="presentation"
            onClick={busy ? undefined : close}
          >
            <div
              className="w-full sm:max-w-sm animate-slide-up-sheet sm:animate-scale-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-install-fab-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
                  aria-hidden="true"
                />

                <div className="flex items-start gap-3.5 p-6 pt-7 sm:p-7 text-left">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80"
                    aria-hidden="true"
                  >
                    <img src="/icon.svg" alt="" className="h-9 w-9 object-contain" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="pwa-install-fab-title"
                      className={`text-lg sm:text-xl font-black leading-tight text-slate-900 ${fontClass}`}
                    >
                      {mode === 'already'
                        ? copy.alreadyTitle
                        : mode === 'steps'
                          ? copy.title
                          : copy.title}
                    </h2>
                    <p className={`mt-1 text-sm font-semibold leading-snug text-slate-600 ${fontClass}`}>
                      {mode === 'already'
                        ? copy.alreadyBody
                        : mode === 'steps'
                          ? copy.stepsIntro
                          : copy.body}
                    </p>
                  </div>
                </div>

                {mode === 'steps' ? (
                  <ol className={`space-y-2.5 px-6 pb-2 sm:px-7 ${fontClass}`}>
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-sm font-semibold text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-black text-white">
                          {i + 1}
                        </span>
                        <span className="leading-snug pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white/60 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:flex-wrap sm:p-5 sm:pb-5">
                  {mode === 'ask' ? (
                    <>
                      <button
                        type="button"
                        onClick={close}
                        disabled={busy}
                        className={`order-2 flex min-h-[48px] w-full items-center justify-center rounded-full bg-slate-100 py-3 text-base font-black text-slate-700 transition-all active:scale-[0.98] disabled:opacity-60 sm:order-1 sm:flex-1 ${fontClass}`}
                      >
                        {copy.later}
                      </button>
                      <button
                        type="button"
                        onClick={onOk}
                        disabled={busy}
                        className={`order-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-60 sm:order-2 sm:flex-1 ${fontClass}`}
                      >
                        {busy ? (
                          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          copy.ok
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={close}
                      className={`flex min-h-[48px] w-full items-center justify-center rounded-full bg-gradient-to-r from-orange-600 to-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] ${fontClass}`}
                    >
                      {copy.gotIt}
                    </button>
                  )}
                  {!isIos() && !isNativeCapacitorPlatform() ? (
                    <a
                      href={ANDROID_DOWNLOAD_PAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`order-3 w-full text-center text-sm font-bold text-emerald-700 underline-offset-2 hover:underline sm:basis-full ${fontClass}`}
                    >
                      {copy.androidApk}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (isNative) return null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label={copy.fabAria}
        className={`landing-install-fab ${
          aboveStickyCta ? 'landing-install-fab--above-cta ' : ''
        }fixed z-[240] flex items-center gap-2 rounded-full border-2 border-slate-900 bg-orange-500 px-3.5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_#0f172a] transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_#0f172a] ${fontClass}`}
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
        </svg>
        <span>{copy.fab}</span>
      </button>
      {modal}
    </>
  );
}
