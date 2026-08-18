/**
 * Seasonal full-screen splash (mobile-first).
 *
 * Dates are inclusive and evaluated in Asia/Kolkata (IST).
 * Tiranga / Independence: every app open in the date window.
 * Field maxims (from 17 Aug): one random poster per user per IST day.
 *
 * Local preview:
 *   ?celebrate=1              → campaign for today (or Independence Day if none)
 *   ?celebrate=tiranga        → Har Ghar Tiranga
 *   ?celebrate=independence   → 80th Independence Day
 *   ?celebrate=maxim          → field maxim (optional &maxim=0..5)
 */

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
    id: 'field-maxims-2026',
    enabled: true,
    /** After Independence Day — one random field maxim per user per IST day. */
    startDate: '2026-08-17',
    endDate: null,
    variant: 'maxim',
    useDailyMaxim: true,
    imageWidth: 720,
    imageHeight: 1080,
    title: {
      bn: 'মাঠের কথা',
      en: 'Field lessons',
    },
    continueLabel: CONTINUE,
    dateLabel: {
      bn: '১৭ আগস্ট থেকে',
      en: 'From 17 August',
    },
  },
];

/** One maxim per IST day. Keep lines short — the picture stays quiet. */
export const FIELD_MAXIMS = [
  {
    id: 'three-causes',
    kicker: { bn: 'দুর্ঘটনার ৩ কারণ', en: 'Three causes of accidents' },
    lines: {
      bn: ['আমি দেখি নি।', 'আমি বুঝি নি।', 'আমি জানতাম না।'],
      en: ['I did not see.', 'I did not understand.', 'I did not know.'],
    },
    imageBn: '/images/celebrations/maxim-three-causes.webp',
    imageEn: '/images/celebrations/maxim-three-causes-en.webp',
    imageBnDesktop: '/images/celebrations/maxim-three-causes-desktop.webp',
    imageEnDesktop: '/images/celebrations/maxim-three-causes-en-desktop.webp',
  },
  {
    id: 'blind-steps',
    lines: {
      bn: ['নিরাপত্তার স্টেপগুলো', 'অন্ধের মতো মানতে শিখুন।'],
      en: ['Learn to follow the safety steps', 'the way the blind do — by habit.'],
    },
    imageBn: '/images/celebrations/maxim-blind-steps.webp',
    imageEn: '/images/celebrations/maxim-blind-steps-en.webp',
    imageBnDesktop: '/images/celebrations/maxim-blind-steps-desktop.webp',
    imageEnDesktop: '/images/celebrations/maxim-blind-steps-en-desktop.webp',
  },
  {
    id: 'three-habits',
    kicker: { bn: 'বাঁচার ৩ অভ্যাস', en: 'Three habits that save you' },
    lines: {
      bn: ['দেখি, বুঝি, জানি।', 'তারপর করি।'],
      en: ['See. Understand. Know.', 'Then act.'],
    },
    imageBn: '/images/celebrations/maxim-three-habits.webp',
    imageEn: '/images/celebrations/maxim-three-habits-en.webp',
    imageBnDesktop: '/images/celebrations/maxim-three-habits-desktop.webp',
    imageEnDesktop: '/images/celebrations/maxim-three-habits-en-desktop.webp',
  },
  {
    id: 'harness',
    lines: {
      bn: ['কোমর রশি ফেলে দিন।', 'ফুল বডি হারনেস আপন করুন।'],
      en: ['Leave the waist rope.', 'Make the full-body harness yours.'],
    },
    imageBn: '/images/celebrations/maxim-harness.webp',
    imageEn: '/images/celebrations/maxim-harness-en.webp',
    imageBnDesktop: '/images/celebrations/maxim-harness-desktop.webp',
    imageEnDesktop: '/images/celebrations/maxim-harness-en-desktop.webp',
  },
  {
    id: 'torn-glove',
    lines: {
      bn: ['ফুটো গ্লাভস', 'মানে খালি হাত।'],
      en: ['A torn glove', 'is a bare hand.'],
    },
    imageBn: '/images/celebrations/maxim-torn-glove.webp',
    imageEn: '/images/celebrations/maxim-torn-glove-en.webp',
    imageBnDesktop: '/images/celebrations/maxim-torn-glove-desktop.webp',
    imageEnDesktop: '/images/celebrations/maxim-torn-glove-en-desktop.webp',
  },
  {
    id: 'say-no',
    lines: {
      bn: ['অসুরক্ষিত আদেশকে না বলুন।', 'এটা অভদ্রতা নয়।'],
      en: ['Say no to an unsafe order.', 'That is not rudeness.'],
    },
    imageBn: '/images/celebrations/maxim-say-no.webp',
    imageEn: '/images/celebrations/maxim-say-no-en.webp',
    imageBnDesktop: '/images/celebrations/maxim-say-no-desktop.webp',
    imageEnDesktop: '/images/celebrations/maxim-say-no-en-desktop.webp',
  },
];

/** Admin preview order: Tiranga, Independence, then each field maxim. */
export const CELEBRATION_PREVIEW_STEPS = [
  { campaignId: 'har-ghar-tiranga-2026' },
  { campaignId: 'independence-day-80-2026' },
  ...FIELD_MAXIMS.map((_, maximIndex) => ({
    campaignId: 'field-maxims-2026',
    maximIndex,
  })),
];

export function getCelebrationPreviewStepIndex(preview) {
  if (!preview?.campaignId) return 0;
  const maximIndex =
    preview.campaignId === 'field-maxims-2026'
      ? (Number.isFinite(Number(preview.maximIndex)) ? Number(preview.maximIndex) : 0)
      : undefined;
  const idx = CELEBRATION_PREVIEW_STEPS.findIndex(
    (s) => s.campaignId === preview.campaignId && s.maximIndex === maximIndex
  );
  return idx < 0 ? 0 : idx;
}

const FORCE_ALIASES = {
  1: 'force-active',
  true: 'force-active',
  'har-ghar': 'har-ghar-tiranga-2026',
  tiranga: 'har-ghar-tiranga-2026',
  independence: 'independence-day-80-2026',
  '80': 'independence-day-80-2026',
  share: 'field-maxims-2026',
  maxim: 'field-maxims-2026',
  maxims: 'field-maxims-2026',
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

const DAILY_MAXIM_KEY = 'slm-daily-field-maxim';

function readDailyMaximPick() {
  try {
    const raw = window.localStorage.getItem(DAILY_MAXIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDailyMaximPick(pick) {
  try {
    window.localStorage.setItem(DAILY_MAXIM_KEY, JSON.stringify(pick));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Stable random maxim for this device for the IST calendar day. */
function getOrCreateDailyMaximIndex(today, count) {
  const stored = readDailyMaximPick();
  if (stored?.date === today && Number.isFinite(stored.index)) {
    return ((stored.index % count) + count) % count;
  }
  let index = Math.floor(Math.random() * count);
  if (count > 1 && Number.isFinite(stored?.index) && index === stored.index) {
    index = (index + 1 + Math.floor(Math.random() * (count - 1))) % count;
  }
  writeDailyMaximPick({ date: today, index, shown: false });
  return index;
}

export function hasSeenDailyMaximToday(now = new Date()) {
  const stored = readDailyMaximPick();
  return stored?.date === getIstCalendarDate(now) && stored.shown === true;
}

/** Call when the live maxim splash is actually shown, so it does not repeat today. */
export function markDailyMaximShown(now = new Date()) {
  const today = getIstCalendarDate(now);
  const index = getOrCreateDailyMaximIndex(today, FIELD_MAXIMS.length);
  writeDailyMaximPick({ date: today, index, shown: true });
}

function getForcedMaximIndex() {
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = q.get('maxim');
    if (raw == null || raw === '') return null;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return null;
    return ((n % FIELD_MAXIMS.length) + FIELD_MAXIMS.length) % FIELD_MAXIMS.length;
  } catch {
    return null;
  }
}

function pickFieldMaxim(today, rotateSeed) {
  const count = FIELD_MAXIMS.length;
  let index = 0;
  if (Number.isFinite(rotateSeed)) index = ((rotateSeed % count) + count) % count;
  else {
    const forced = getForcedMaximIndex();
    index = forced != null ? forced : getOrCreateDailyMaximIndex(today, count);
  }
  const maxim = FIELD_MAXIMS[index];
  return {
    maxim,
    maximIndex: index,
    image: maxim.imageBn,
    imageDesktop: maxim.imageBnDesktop,
    imageEn: maxim.imageEn,
    imageEnDesktop: maxim.imageEnDesktop,
  };
}

function resolveCampaign(config, today, rotateSeed) {
  if (!config) return null;
  if (config.useDailyMaxim) {
    return {
      ...config,
      ...pickFieldMaxim(today || getIstCalendarDate(), rotateSeed),
    };
  }
  return config;
}

/**
 * Campaign to show right now (IST window, or ?celebrate= preview).
 */
export function getActiveCelebrationSplash(now = new Date()) {
  const raw = getCelebrateQueryValue();
  const alias = FORCE_ALIASES[raw] || (raw && CELEBRATION_CAMPAIGNS.some((c) => c.id === raw) ? raw : '');
  const today = getIstCalendarDate(now);

  if (alias && alias !== 'force-active') {
    const forced = CELEBRATION_CAMPAIGNS.find((c) => c.id === alias);
    if (forced?.enabled) return resolveCampaign(forced, today);
  }

  const inWindow = CELEBRATION_CAMPAIGNS.find((c) => isCampaignInWindow(c, today));
  if (inWindow) return resolveCampaign(inWindow, today);

  if (alias === 'force-active') {
    const independence = CELEBRATION_CAMPAIGNS.find((c) => c.id === 'independence-day-80-2026');
    return resolveCampaign(independence || CELEBRATION_CAMPAIGNS[0], today);
  }

  return null;
}

/** Campaign currently in the IST date window, or null. */
export function getLiveCelebrationCampaignId(now = new Date()) {
  const today = getIstCalendarDate(now);
  return CELEBRATION_CAMPAIGNS.find((c) => isCampaignInWindow(c, today))?.id || null;
}

/** Resolve a campaign for admin / query preview (rotates field maxim when seeded). */
export function getCelebrationSplashForPreview(campaignId, rotateSeed) {
  const found = CELEBRATION_CAMPAIGNS.find((c) => c.id === campaignId);
  return resolveCampaign(found || null, getIstCalendarDate(), rotateSeed);
}

/** @deprecated Prefer getActiveCelebrationSplash — Tiranga campaign snapshot. */
export const CELEBRATION_SPLASH = CELEBRATION_CAMPAIGNS[0];

export function isCelebrationSplashActive(now = new Date()) {
  return Boolean(getActiveCelebrationSplash(now));
}

/** True when splash should be offered after boot. */
export function shouldOfferCelebrationSplash(now = new Date()) {
  if (!isCelebrationSplashActive(now)) return false;
  if (isCelebrationForceRequested()) return true;
  const config = getActiveCelebrationSplash(now);
  if (config?.useDailyMaxim && hasSeenDailyMaximToday(now)) return false;
  return true;
}
