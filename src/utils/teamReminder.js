import { WEBSITE_URL } from '../config';
import { BOARD_IDS } from './monthlyEncouragementBoards';
import { collectAllUserPrizeWins } from './hallOfFamePrizes';
import { getLatestDeclaredPrizeMonth } from './monthWinnersReveal';
import { storageUtils } from './storageUtils';
import { openWhatsAppUrl } from './whatsappLauncher';

export const TEAM_REMINDER_INACTIVE_DAYS = 7;
export const TEAM_REMINDER_MAX_SEND = 30;

export function reminderSendLimit(_role) {
  return TEAM_REMINDER_MAX_SEND;
}

/** First idle-with-phone row ids, capped per round. Not a bulk send. */
export function pickIdleLotIds(roster = [], limit = TEAM_REMINDER_MAX_SEND, excludeIds) {
  const ids = [];
  const cap = Math.max(0, Number(limit) || 0);
  const skip = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  for (const row of roster || []) {
    if (!row?.id || row.status !== 'idle' || !row.digits || skip.has(row.id)) continue;
    ids.push(row.id);
    if (ids.length >= cap) break;
  }
  return ids;
}

const APP_LINK = String(WEBSITE_URL || 'https://smartlineman.in')
  .replace(/^https?:\/\//i, '')
  .replace(/\/$/, '');

const PRIZE_SHORT_RULES = [
  [/multimeter|মাল্টিমিটার/i, { bn: 'মাল্টিমিটার', en: 'multimeter' }],
  [/cooker|কুকার/i, { bn: 'কুকার', en: 'cooker' }],
  [/tool belt|টুল বেল্ট/i, { bn: 'টুল বেল্ট', en: 'tool belt' }],
  [/glove|গ্লাভস/i, { bn: 'গ্লাভস', en: 'glove set' }],
  [/screwdriver|স্ক্রু-?ড্রাইভার|স্ক্রুড্রাইভার/i, { bn: 'স্ক্রুড্রাইভার', en: 'screwdriver set' }],
  [/clamp|tong|ক্ল্যাম্প|টং/i, { bn: 'টং টেস্টার', en: 'tong tester' }],
  [/voltage tester|ভোল্টেজ টেস্টার/i, { bn: 'ভোল্টেজ টেস্টার', en: 'voltage tester' }],
  [/headlamp|হেডল্যাম্প/i, { bn: 'হেডল্যাম্প', en: 'headlamp' }],
  [/torch|টর্চ|searchlite/i, { bn: 'টর্চ', en: 'torch' }],
  [/lunch|লাঞ্চ/i, { bn: 'লাঞ্চ বক্স', en: 'lunch box' }],
  [/stripper|স্ট্রিপার/i, { bn: 'ওয়্যার স্ট্রিপার', en: 'wire stripper' }],
  [/tool kit|হ্যান্ড টুল|টুল কিট/i, { bn: 'টুল কিট', en: 'tool kit' }],
];

export function firstGivenName(fullName) {
  const text = String(fullName || '').trim();
  if (!text || text.includes('@')) return '';
  return text.split(/\s+/)[0] || '';
}

export function indianMobileDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  return '';
}

export function profileMobileDigits(profile) {
  return indianMobileDigits(profile?.phone_number || profile?.phone || '');
}

export function shortenPrizeTitle(title, language = 'bn') {
  const text = String(title || '').trim();
  if (!text) return '';
  const bn = language !== 'en';
  for (const [pattern, labels] of PRIZE_SHORT_RULES) {
    if (pattern.test(text)) return bn ? labels.bn : labels.en;
  }
  return text.replace(/[（(].*$/, '').trim().slice(0, bn ? 16 : 18);
}

export function buildTeamReminderMessage({
  variant = 'generic',
  firstName = '',
  prizeShort = '',
  language = 'bn',
} = {}) {
  const bn = language !== 'en';
  const name = String(firstName || '').trim();
  const prize = String(prizeShort || '').trim();
  const canStory = Boolean(name && prize);

  if (bn) {
    if (canStory && variant === 'new') {
      return `${name} নতুন হয়েও ${prize} পেয়েছে। আজ থেকেই শুরু করুন। ${APP_LINK}`;
    }
    if (canStory && variant === 'team') {
      return `${name} গত মাসে ${prize} জিতেছে। আপনি আজ থেকেই শুরু করুন। ${APP_LINK}`;
    }
    if (canStory) {
      return `${name} গত মাসে ${prize} জিতেছে। আপনিও আজ থেকেই শুরু করুন। ${APP_LINK}`;
    }
    return `গত মাসে একজন লাইনম্যান পুরস্কার জিতেছে। আপনি আজ থেকেই শুরু করুন। ${APP_LINK}`;
  }

  if (canStory && variant === 'new') {
    return `${name} is new and got a ${prize}. Start today. ${APP_LINK}`;
  }
  if (canStory && variant === 'team') {
    return `${name} won a ${prize} last month. Start today. ${APP_LINK}`;
  }
  if (canStory) {
    return `${name} won a ${prize} last month. You can start today too. ${APP_LINK}`;
  }
  return `A lineman won a prize last month. Start today. ${APP_LINK}`;
}

export function pickTeamReminderStory({ team = [], hallOfFame = [], language = 'bn' } = {}) {
  const teamIds = new Set((team || []).map((row) => row.id).filter(Boolean));
  const latest = getLatestDeclaredPrizeMonth(hallOfFame);
  const monthWins = collectAllUserPrizeWins(hallOfFame, language).filter(
    (win) => latest && win.year === latest.year && win.month === latest.month
  );

  const teamWin = monthWins.find((win) => teamIds.has(win.userId));
  const champWin = monthWins.find((win) => win.boardId === BOARD_IDS.MAIN && win.prizeRank === 1);
  const win = teamWin || champWin || monthWins[0] || null;

  if (!win) {
    return {
      variant: 'generic',
      winnerUserId: null,
      firstName: '',
      prizeShort: '',
      message: buildTeamReminderMessage({ variant: 'generic', language }),
    };
  }

  const firstName = firstGivenName(win.fullName);
  const prizeShort = shortenPrizeTitle(win.prize?.title || '', language);
  let variant = 'app';
  if (teamWin) {
    variant = win.boardId === BOARD_IDS.NEW_PLAYER ? 'new' : 'team';
  } else if (win.boardId === BOARD_IDS.NEW_PLAYER) {
    variant = 'new';
  }

  if (!firstName || !prizeShort) {
    variant = 'generic';
  }

  return {
    variant,
    winnerUserId: win.userId || null,
    firstName,
    prizeShort,
    message: buildTeamReminderMessage({ variant, firstName, prizeShort, language }),
  };
}

export function isInactiveLineman(profile, nowMs = Date.now()) {
  const raw = profile?.last_login_at;
  if (!raw) return true;
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return true;
  return nowMs - ts >= TEAM_REMINDER_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
}

export function rosterStatusId(profile, nowMs = Date.now(), alreadyIds = new Set()) {
  const inactive = isInactiveLineman(profile, nowMs);
  const phone = Boolean(profileMobileDigits(profile));
  if (!inactive) return 'active';
  if (!phone) return 'nophone';
  if (alreadyIds.has(profile.id)) return 'sent';
  return 'idle';
}

export function formatBriefIstDate(iso) {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date(ts));
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!day || !month) return '';
  return `${Number(day)}/${Number(month)}`;
}

export function formatBriefDayKey(dayKey) {
  const match = String(dayKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${Number(match[3])}/${Number(match[2])}`;
}

const ROSTER_SORT = { idle: 0, nophone: 1, sent: 2, active: 3 };

export function buildTeamRoster(team = [], { language = 'bn', alreadyIds = new Set(), sentDates = {}, nowMs = Date.now() } = {}) {
  return [...(team || [])]
    .map((row) => {
      const status = rosterStatusId(row, nowMs, alreadyIds);
      const sentKey = sentDates?.[row.id] || '';
      return {
        id: row.id,
        role: row.role || '',
        firstName: firstGivenName(row.full_name) || String(row.full_name || '').trim(),
        fullName: row.full_name || '',
        digits: profileMobileDigits(row),
        status,
        idleDate: formatBriefIstDate(row.last_login_at) || '—',
        sentDate: formatBriefDayKey(sentKey),
      };
    })
    .filter((row) => row.id)
    .sort((a, b) => {
      if (ROSTER_SORT[a.status] !== ROSTER_SORT[b.status]) {
        return ROSTER_SORT[a.status] - ROSTER_SORT[b.status];
      }
      const roleRank = (role) => (role === 'safety mitra' ? 0 : 1);
      if (roleRank(a.role) !== roleRank(b.role)) return roleRank(a.role) - roleRank(b.role);
      return (a.firstName || '').localeCompare(b.firstName || '', 'bn');
    });
}

function istDayKey(nowMs = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
}

function remindedStorageKey(mitraId) {
  return `slm_team_reminded_dates_v1_${mitraId}`;
}

function parseRemindedStore(raw) {
  if (!raw) return {};
  if (raw.dates && typeof raw.dates === 'object') return { ...raw.dates };
  if (raw.day && Array.isArray(raw.ids)) {
    const dates = {};
    for (const id of raw.ids) {
      if (id) dates[id] = raw.day;
    }
    return dates;
  }
  return {};
}

export function readRemindedDates(mitraId) {
  if (!mitraId) return {};
  try {
    const current = parseRemindedStore(JSON.parse(storageUtils.getItem(remindedStorageKey(mitraId)) || 'null'));
    if (Object.keys(current).length) return current;
    const legacy = parseRemindedStore(JSON.parse(storageUtils.getItem(`slm_team_reminded_${mitraId}`) || 'null'));
    return legacy;
  } catch {
    return {};
  }
}

export function readRemindedIdsToday(mitraId, nowMs = Date.now()) {
  const today = istDayKey(nowMs);
  const dates = readRemindedDates(mitraId);
  return new Set(Object.keys(dates).filter((id) => dates[id] === today));
}

export function markRemindedToday(mitraId, userId, nowMs = Date.now()) {
  if (!mitraId || !userId) return;
  const dates = readRemindedDates(mitraId);
  dates[userId] = istDayKey(nowMs);
  try {
    storageUtils.setItem(remindedStorageKey(mitraId), JSON.stringify({ dates }));
  } catch {
    // private mode / quota
  }
}

export function smsHref(digits, body) {
  const isIos =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent || '');
  const sep = isIos ? '&' : '?';
  return `sms:+91${digits}${sep}body=${encodeURIComponent(body)}`;
}

export function whatsappHref(digits, body) {
  return `https://wa.me/91${digits}?text=${encodeURIComponent(body)}`;
}

async function tryNativeOpenUrl(url) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    const { App } = await import('@capacitor/app');
    if (typeof App.openUrl !== 'function') return false;
    await App.openUrl({ url });
    return true;
  } catch {
    return false;
  }
}

async function tryNativeBrowser(url) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return true;
  } catch {
    return false;
  }
}

/** Opens the phone's WhatsApp or SMS composer for one number. Never a group. */
export async function openTeamReminderComposer(channel, digits, body, { packageName = '' } = {}) {
  const phone = indianMobileDigits(digits) || String(digits || '').replace(/\D/g, '');
  if (!phone || phone.length !== 10) return false;

  const webUrl = channel === 'sms' ? smsHref(phone, body) : whatsappHref(phone, body);
  const nativeWa = `whatsapp://send?phone=91${phone}&text=${encodeURIComponent(body)}`;

  if (channel === 'whatsapp') {
    if (await openWhatsAppUrl(nativeWa, packageName)) return true;
    if (await openWhatsAppUrl(webUrl, packageName)) return true;
    if (await tryNativeOpenUrl(nativeWa)) return true;
    if (await tryNativeOpenUrl(webUrl)) return true;
    if (await tryNativeBrowser(webUrl)) return true;
  } else if (await tryNativeOpenUrl(webUrl)) {
    return true;
  }

  if (typeof window === 'undefined') return false;
  if (channel === 'sms') {
    window.location.href = webUrl;
  } else {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }
  return true;
}
