import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

function notesText(language, releaseNotes) {
  if (!releaseNotes) return '';
  if (typeof releaseNotes === 'string') return releaseNotes;
  if (language === 'en') return releaseNotes.en || releaseNotes.bn || '';
  return releaseNotes.bn || releaseNotes.en || '';
}

/**
 * Full-screen version-update takeover (PWA refresh or APK download).
 * Preview mode never refreshes or downloads — admin can close even “required” variants.
 */
export default function AppUpdateModal({
  language = 'bn',
  updateInfo,
  isForceUpdate = false,
  updateBusy = false,
  updateProgress = 0,
  updateNeedsPermission = false,
  updateError = '',
  preview = false,
  onPrimary,
  onOpenDownloadPage,
  onLater,
  onClosePreview,
}) {
  const bn = language === 'bn';
  const isApk = updateInfo?.channel === 'apk';
  const hasDownloadUrl = Boolean(updateInfo?.update_url && updateInfo.update_url !== '#');
  const notes = notesText(language, updateInfo?.release_notes);
  const pct = Math.max(4, Math.min(100, updateProgress || 0));
  const showLater = !isForceUpdate;

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClosePreview?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview, onClosePreview]);

  if (!updateInfo) return null;

  const title = bn ? 'নতুন আপডেট' : 'New update';
  const subtitle = isApk
    ? (isForceUpdate
      ? (bn
        ? `অ্যাপ চালাতে v${updateInfo.version_name} আপডেট করুন।`
        : `Please update to v${updateInfo.version_name} to keep using the app.`)
      : (bn
        ? `নতুন ভার্সন ${updateInfo.version_name} এসেছে। আপডেট ডাউনলোড করে ইনস্টল করুন।`
        : `Version ${updateInfo.version_name} is ready. Download and install the update.`))
    : (isForceUpdate
      ? (bn
        ? `এগিয়ে যেতে v${updateInfo.version_name} আপডেট করুন।`
        : `Please update to v${updateInfo.version_name} to continue.`)
      : (bn ? 'নতুন ভার্সন আপডেট করুন।' : 'A new version is ready. Please update now.'));

  const primaryLabel = updateBusy
    ? (bn ? 'ডাউনলোড হচ্ছে…' : 'Downloading…')
    : hasDownloadUrl
      ? (bn ? 'আপডেট ডাউনলোড করুন' : 'Download Update')
      : (bn ? 'আপডেট করুন' : 'Update now');

  const node = (
    <div
      className="fixed inset-0 z-[10070] flex flex-col overflow-hidden bg-[#fffdf7] animate-fade-in safe-area-inset-top"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
    >
      {preview ? (
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3">
          <span className={`rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-orange-800 ${bn ? 'font-bengali' : ''}`}>
            {bn ? 'প্রিভিউ' : 'Preview'}
          </span>
          <button
            type="button"
            onClick={onClosePreview}
            className={`rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ${bn ? 'font-bengali' : ''}`}
          >
            {bn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      ) : (
        <div className="h-3 shrink-0" />
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-4">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-orange-100 text-4xl shadow-sm"
            aria-hidden="true"
          >
            🚀
          </span>
          <h2
            id="app-update-title"
            className={`mt-5 text-2xl font-black leading-tight text-slate-900 sm:text-3xl ${bn ? 'font-bengali' : ''}`}
          >
            {title}
          </h2>
          {updateInfo.version_name ? (
            <p className="mt-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-black tracking-wide text-white">
              v{updateInfo.version_name}
              {isApk ? (bn ? ' · অ্যাপ' : ' · APK') : (bn ? ' · ওয়েব' : ' · PWA')}
            </p>
          ) : null}
          <p className={`mt-4 max-w-sm text-base font-semibold leading-snug text-slate-600 ${bn ? 'font-bengali' : ''}`}>
            {subtitle}
          </p>
          {notes ? (
            <p className={`mt-4 w-full rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold leading-snug text-orange-900 ${bn ? 'font-bengali' : ''}`}>
              {notes}
            </p>
          ) : null}
          {updateBusy && isApk ? (
            <div className="mt-5 w-full">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={`mt-2 text-xs font-bold text-orange-800 ${bn ? 'font-bengali' : ''}`}>
                {bn
                  ? `ডাউনলোড হচ্ছে… ${Math.min(100, Math.round(updateProgress || 0))}%`
                  : `Downloading… ${Math.min(100, Math.round(updateProgress || 0))}%`}
              </p>
            </div>
          ) : null}
          {updateNeedsPermission ? (
            <p className={`mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-snug text-amber-950 ${bn ? 'font-bengali' : ''}`}>
              {bn
                ? 'SmartLineman-এর জন্য “অজানা অ্যাপ ইনস্টল” অনুমতি দিন, তারপর আবার Download Update চাপুন।'
                : 'Allow “Install unknown apps” for SmartLineman, then tap Download Update again.'}
            </p>
          ) : null}
          {updateError ? (
            <p className={`mt-4 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-snug text-rose-900 ${bn ? 'font-bengali' : ''}`}>
              {updateError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white/80 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <button
            type="button"
            disabled={updateBusy && !preview}
            onClick={preview ? onClosePreview : onPrimary}
            className={`w-full min-h-[48px] rounded-full bg-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-60 ${bn ? 'font-bengali' : ''}`}
          >
            {primaryLabel}
          </button>
          {isApk && (updateError || updateNeedsPermission) ? (
            <button
              type="button"
              disabled={updateBusy && !preview}
              onClick={preview ? onClosePreview : onOpenDownloadPage}
              className={`w-full min-h-[48px] rounded-full border border-orange-200 bg-orange-50 py-3 text-base font-bold text-orange-900 shadow-sm transition-all hover:bg-orange-100 active:scale-[0.98] disabled:opacity-60 ${bn ? 'font-bengali' : ''}`}
            >
              {bn ? 'ডাউনলোড পেজ খুলুন' : 'Open download page'}
            </button>
          ) : null}
          {showLater ? (
            <button
              type="button"
              disabled={updateBusy && !preview}
              onClick={preview ? onClosePreview : onLater}
              className={`w-full min-h-[48px] rounded-full border border-slate-200/80 bg-white py-3 text-base font-bold text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-[0.98] disabled:opacity-60 ${bn ? 'font-bengali' : ''}`}
            >
              {bn ? 'পরে' : 'Later'}
            </button>
          ) : null}
          {preview ? (
            <p className={`text-center text-[11px] font-semibold text-slate-400 ${bn ? 'font-bengali' : ''}`}>
              {bn
                ? 'শুধু প্রিভিউ — ট্যাপে আসল আপডেট হবে না।'
                : 'Preview only — taps will not update the app.'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
