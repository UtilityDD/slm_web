/**
 * Seasonal full-screen celebration splash (mobile-first).
 *
 * To switch occasions: change id, dates, image path, titles — same UI shell.
 * Dates are inclusive and evaluated in Asia/Kolkata (IST).
 *
 * Shows on every app open while the date window is active (tap to continue).
 * Local test outside the window: open with ?celebrate=1
 */
export const CELEBRATION_SPLASH = {
  /** Bump id when you run a new campaign. */
  id: 'har-ghar-tiranga-2026',
  enabled: true,
  /** Inclusive IST calendar dates (YYYY-MM-DD). */
  startDate: '2026-08-09',
  endDate: '2026-08-16',
  image: '/images/celebrations/har-ghar-tiranga.webp',
  imageDesktop: '/images/celebrations/har-ghar-tiranga-desktop.webp',
  imageWidth: 720,
  imageHeight: 1080,
  title: {
    bn: 'হর ঘর তিরঙ্গা',
    en: 'Har Ghar Tiranga',
  },
  subtitle: {
    bn: 'প্রতিটি ঘরে তিরঙ্গা — গর্বের সাথে, সুরক্ষার সাথে।',
    en: 'The Tiranga in every home — with pride, with safety.',
  },
  continueLabel: {
    bn: 'এগিয়ে যান',
    en: 'Continue',
  },
};

/** Current calendar day in IST as YYYY-MM-DD. */
export function getIstCalendarDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** `?celebrate=1` or `#celebrate=1` forces the splash (for local testing). */
export function isCelebrationForceRequested() {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('celebrate') === '1') return true;
    const hash = window.location.hash || '';
    if (/(?:^|[?#&])celebrate=1(?:&|$)/.test(hash)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isCelebrationSplashActive(config = CELEBRATION_SPLASH, now = new Date()) {
  if (!config?.enabled) return false;
  if (isCelebrationForceRequested()) return true;
  const today = getIstCalendarDate(now);
  return today >= config.startDate && today <= config.endDate;
}

/** True when splash should be offered after boot (every open in the date window). */
export function shouldOfferCelebrationSplash(config = CELEBRATION_SPLASH, now = new Date()) {
  return isCelebrationSplashActive(config, now);
}
