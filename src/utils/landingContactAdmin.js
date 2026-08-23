import { LANDING_CONTACT_SCRIPT_URL } from './landingContactService';

export const CONTACT_PULL_KEY = 'slmPull_8f3c1a9e2b';

export function canViewContactResponses(profile) {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile.role === 'safety mitra' && profile.can_handle_contact_responses === true;
}

const COUNT_CACHE_KEY = 'slm_contact_pending_count';
const COUNT_CACHE_MS = 60 * 1000;

function sheetUrl(extra) {
  const params = new URLSearchParams({ pull: CONTACT_PULL_KEY, ...extra });
  return `${LANDING_CONTACT_SCRIPT_URL}?${params.toString()}`;
}

export function topicShortLabel(topic, isEn) {
  const text = String(topic || '');
  if (/join|যোগ/i.test(text)) return isEn ? 'Join' : 'যোগ';
  if (/correction|ভুল|fix/i.test(text)) return isEn ? 'Fix' : 'সংশোধন';
  if (/training|প্রশিক্ষণ/i.test(text)) return isEn ? 'Train' : 'প্রশিক্ষণ';
  if (/prize|sponsor|পুরস্কার|স্পনসর/i.test(text)) return isEn ? 'Prize' : 'পুরস্কার';
  return isEn ? 'Other' : 'অন্যান্য';
}

function readCountCache() {
  try {
    const raw = sessionStorage.getItem(COUNT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.at > COUNT_CACHE_MS) return null;
    return Number(parsed.pending);
  } catch {
    return null;
  }
}

function writeCountCache(pending) {
  try {
    sessionStorage.setItem(COUNT_CACHE_KEY, JSON.stringify({ pending, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export async function fetchContactPendingCount({ force = false } = {}) {
  if (!force) {
    const cached = readCountCache();
    if (cached != null && Number.isFinite(cached)) return cached;
  }
  const res = await fetch(sheetUrl({ count: '1' }));
  if (!res.ok) throw new Error('sheet');
  const json = await res.json();
  if (!json || json.ok === false) throw new Error('sheet');
  const pending = Number(json.pending) || 0;
  writeCountCache(pending);
  return pending;
}

export async function fetchSheetContacts() {
  const res = await fetch(sheetUrl());
  if (!res.ok) throw new Error('sheet');
  const json = await res.json();
  if (!json || json.ok === false) throw new Error('sheet');
  const rows = Array.isArray(json.rows) ? json.rows : [];
  if (json.pending != null) writeCountCache(Number(json.pending) || 0);
  return rows;
}
