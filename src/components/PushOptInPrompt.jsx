import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  dismissPushOptIn,
  enableWebPush,
  getNotificationPermission,
  getVapidPublicKey,
  isWebPushSupported,
  wasPushOptInDismissedRecently,
} from '../utils/webPush';

/** Delay so login / profile nudge / ads settle first. */
const SHOW_AFTER_MS = 22000;

/**
 * Soft opt-in for PWA Web Push (inactive-user prize reminders).
 * Primary action is Enable; "Not now" is a small text link so it is hard to tap by mistake.
 * Backdrop does not dismiss.
 */
export default function PushOptInPrompt({
  user,
  language = 'en',
  blocked = false,
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [delayDone, setDelayDone] = useState(false);
  const [eligible, setEligible] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    dismissedRef.current = false;
    setDelayDone(false);
    setOpen(false);

    if (!user?.id) {
      setEligible(false);
      return undefined;
    }
    if (!isWebPushSupported() || !getVapidPublicKey()) {
      setEligible(false);
      return undefined;
    }
    if (getNotificationPermission() !== 'default') {
      setEligible(false);
      return undefined;
    }
    if (wasPushOptInDismissedRecently()) {
      setEligible(false);
      return undefined;
    }

    setEligible(true);
    const timer = setTimeout(() => setDelayDone(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [user?.id]);

  useEffect(() => {
    if (blocked) {
      if (open) setOpen(false);
      return;
    }
    if (!eligible || !delayDone || dismissedRef.current || open) return;
    setOpen(true);
  }, [eligible, delayDone, blocked, open]);

  const close = useCallback(() => {
    dismissedRef.current = true;
    setOpen(false);
  }, []);

  const onLater = useCallback(() => {
    dismissPushOptIn();
    close();
  }, [close]);

  const onEnable = useCallback(async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const result = await enableWebPush(user.id);
      if (result.denied) dismissPushOptIn();
      close();
    } finally {
      setBusy(false);
    }
  }, [busy, close, user?.id]);

  if (!eligible || !open || typeof document === 'undefined') return null;

  const bn = language === 'bn';
  const copy = bn
    ? {
        title: 'পুরস্কার মিস না করতে রিমাইন্ডার চালু করুন',
        body: 'অনেকদিন অ্যাপ না খুললে আমরা একটি ছোট নোটিফিকেশন পাঠাব। পরের স্ক্রিনে “Allow” চাপুন।',
        enable: 'রিমাইন্ডার চালু করুন',
        later: 'পরে মনে করাব — এখন নয়',
        hint: 'একবার Allow করলে পরে আর জিজ্ঞাসা করা হবে না।',
      }
    : {
        title: 'Turn on prize reminders',
        body: 'If you stay away for many days, we will send one short notification so you do not miss this month’s prize. On the next screen, tap Allow.',
        enable: 'Turn on reminders',
        later: 'Remind me later — not now',
        hint: 'You only need to Allow once.',
      };

  return createPortal(
    <div
      className="fixed inset-0 z-[230] flex items-end justify-center bg-slate-900/55 p-0 animate-fade-in sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="w-full sm:max-w-sm animate-slide-up-sheet sm:animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-optin-title"
      >
        <div className="relative overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-xl sm:rounded-2xl">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 opacity-80"
            aria-hidden="true"
          />
          <div className={`px-5 pb-5 pt-6 ${bn ? 'font-bengali' : ''}`}>
            <h2 id="push-optin-title" className="text-xl font-bold leading-snug text-slate-900">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy.body}</p>
            <p className="mt-2 text-xs font-medium text-orange-700/90">{copy.hint}</p>

            <button
              type="button"
              disabled={busy}
              onClick={onEnable}
              className="mt-5 w-full rounded-full bg-orange-500 px-4 py-3.5 text-base font-bold text-white shadow-sm shadow-orange-500/30 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? '…' : copy.enable}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={onLater}
              className="mt-3 w-full py-2 text-center text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-500 hover:underline disabled:opacity-60"
            >
              {copy.later}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
