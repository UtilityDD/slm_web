/**
 * Seasonal full-screen splash (mobile-first).
 *
 * Dates are inclusive and evaluated in Asia/Kolkata (IST).
 * Shows on every app open while a campaign window is active (tap to continue).
 *
 * Local preview:
 *   ?celebrate=1              → campaign for today (or Independence Day if none)
 *   ?celebrate=tiranga        → Har Ghar Tiranga
 *   ?celebrate=independence   → 80th Independence Day
 *   ?celebrate=share          → random share-invite image
 */
import { pickRandomShareInviteImage } from '../utils/linemanInviteShare';

const CONTINUE = {
  bn: 'এগিয়ে যান',
  en: 'Continue',
};

export const CELEBRATION_CAMPAIGNS = [
  {
    id: 'har-ghar-tiranga-2026',
    enabled: true,
    /** Inclusive IST calendar dates (YYYY-MM-DD). Stops after 14 Aug midnight. */
    startDate: '2026-08-09',
    endDate: '2026-08-14',
    variant: 'celebration',
    image: '/images/celebrations/har-ghar-tiranga.webp',
    imageDesktop: '/images/celebrations/har-ghar-tiranga-desktop.webp',
    imageWidth: 720,
    imageHeight: 1080,
    kicker: { bn: 'ভারত', en: 'India' },
    title: {
      bn: 'হর ঘর তিরঙ্গা',
      en: 'Har Ghar Tiranga',
    },
    subtitle: {
      bn: 'প্রতিটি ঘরে তিরঙ্গা — গর্বের সাথে, সুরক্ষার সাথে।',
      en: 'The Tiranga in every home — with pride, with safety.',
    },
    continueLabel: CONTINUE,
    dateLabel: {
      bn: '৯–১৪ আগস্ট',
      en: '9–14 August',
    },
  },
  {
    id: 'independence-day-80-2026',
    enabled: true,
    startDate: '2026-08-15',
    endDate: '2026-08-16',
    variant: 'independence',
    image: '/images/celebrations/independence-day-80.webp',
    imageDesktop: '/images/celebrations/independence-day-80-desktop.webp',
    imageWidth: 720,
    imageHeight: 1080,
    title: {
      bn: '৮০তম স্বাধীনতা দিবসের শুভেচ্ছা',
      en: 'Greetings on the 80th Independence Day',
    },
    footLines: {
      bn: ['৮০তম', 'স্বাধীনতা দিবসের', 'শুভেচ্ছা'],
      en: ['80th', 'Independence Day', 'Greetings'],
    },
    continueLabel: CONTINUE,
    dateLabel: {
      bn: '১৫–১৬ আগস্ট',
      en: '15–16 August',
    },
  },
  {
    id: 'share-invite',
    enabled: true,
    /** After Independence Day — random poster from the app share library. */
    startDate: '2026-08-17',
    endDate: null,
    variant: 'share',
    useRandomShareImage: true,
    imageWidth: 720,
    imageHeight: 1080,
    title: {
      bn: 'বন্ধুদের সাথে শেয়ার করুন',
      en: 'Share with friends',
    },
    subtitle: {
      bn: 'স্মার্ট লাইনম্যান — খেলতে খেলতে শিখুন, পুরস্কার জিতুন।',
      en: 'Smart Lineman — learn while you play, win prizes.',
    },
    continueLabel: CONTINUE,
    dateLabel: {
      bn: '১৭ আগস্ট থেকে',
      en: 'From 17 August',
    },
  },
];

const FORCE_ALIASES = {
  1: 'force-active',
  true: 'force-active',
  'har-ghar': 'har-ghar-tiranga-2026',
  tiranga: 'har-ghar-tiranga-2026',
  independence: 'independence-day-80-2026',
  '80': 'independence-day-80-2026',
  share: 'share-invite',
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

function getCelebrateQueryValue() {
  try {
    const q = new URLSearchParams(window.location.search);
    const fromQuery = q.get('celebrate');
    if (fromQuery) return String(fromQuery).toLowerCase();
    const hash = window.location.hash || '';
    const match = hash.match(/(?:^|[?#&])celebrate=([^&]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    /* ignore */
  }
  return '';
}

/** `?celebrate=1` or a named campaign id forces the splash (for local testing). */
export function isCelebrationForceRequested() {
  return Boolean(getCelebrateQueryValue());
}

export function isCampaignInWindow(config, today) {
  if (!config?.enabled) return false;
  if (!config.startDate) return true;
  if (today < config.startDate) return false;
  if (!config.endDate) return true;
  return today <= config.endDate;
}

function resolveCampaign(config) {
  if (!config) return null;
  if (!config.useRandomShareImage) return config;
  const image = pickRandomShareInviteImage();
  if (!image) return null;
  return {
    ...config,
    image,
    imageDesktop: image,
  };
}

/**
 * Campaign to show right now (IST window, or ?celebrate= preview).
 * Random share image is picked once per call — callers should memoize.
 */
export function getActiveCelebrationSplash(now = new Date()) {
  const raw = getCelebrateQueryValue();
  const alias = FORCE_ALIASES[raw] || (raw && CELEBRATION_CAMPAIGNS.some((c) => c.id === raw) ? raw : '');
  const today = getIstCalendarDate(now);

  if (alias && alias !== 'force-active') {
    const forced = CELEBRATION_CAMPAIGNS.find((c) => c.id === alias);
    if (forced?.enabled) return resolveCampaign(forced);
  }

  const inWindow = CELEBRATION_CAMPAIGNS.find((c) => isCampaignInWindow(c, today));
  if (inWindow) return resolveCampaign(inWindow);

  if (alias === 'force-active') {
    const independence = CELEBRATION_CAMPAIGNS.find((c) => c.id === 'independence-day-80-2026');
    return resolveCampaign(independence || CELEBRATION_CAMPAIGNS[0]);
  }

  return null;
}

/** Campaign currently in the IST date window, or null. */
export function getLiveCelebrationCampaignId(now = new Date()) {
  const today = getIstCalendarDate(now);
  return CELEBRATION_CAMPAIGNS.find((c) => isCampaignInWindow(c, today))?.id || null;
}

/** Resolve a campaign for admin / query preview (picks a new share image each call). */
export function getCelebrationSplashForPreview(campaignId) {
  const found = CELEBRATION_CAMPAIGNS.find((c) => c.id === campaignId);
  return resolveCampaign(found || null);
}

/** @deprecated Prefer getActiveCelebrationSplash — Tiranga campaign snapshot. */
export const CELEBRATION_SPLASH = CELEBRATION_CAMPAIGNS[0];

export function isCelebrationSplashActive(now = new Date()) {
  return Boolean(getActiveCelebrationSplash(now));
}

/** True when splash should be offered after boot (every open in the date window). */
export function shouldOfferCelebrationSplash(now = new Date()) {
  return isCelebrationSplashActive(now);
}
