import { LANDING_CONTACT_SCRIPT_URL } from './landingContactService';

export const CONTACT_PULL_KEY = 'slmPull_8f3c1a9e2b';

export function canViewContactResponses(profile) {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile.role === 'safety mitra' && profile.can_handle_contact_responses === true;
}

const COUNT_CACHE_KEY = 'slm_contact_pending_count';
const COUNT_CACHE_MS = 60 * 1000;
const ROWS_CACHE_KEY = 'slm_cached_contact_rows_v1';
const ROWS_FRESH_MS = 2 * 60 * 1000; // 2 minutes fresh

function sheetUrl(extra) {
  const params = new URLSearchParams({ pull: CONTACT_PULL_KEY, ...extra });
  return `${LANDING_CONTACT_SCRIPT_URL}?${params.toString()}`;
}

export function topicShortLabel(topic, isEn) {
  const text = String(topic || '');
  if (/join|যোগ/i.test(text)) return isEn ? 'Join' : 'যোগ';
  if (/correction|ভুল|fix/i.test(text)) return isEn ? 'Fix' : 'সংশোধন';
  if (/training|প্রশিক্ষণ/i.test(text)) return isEn ? 'Train' : 'প্রশিক্ষণ';
  if (/advertise|বিজ্ঞাপন/i.test(text)) return isEn ? 'Ad' : 'বিজ্ঞাপন';
  if (/prize|sponsor|পুরস্কার|স্পনসর/i.test(text)) return isEn ? 'Prize' : 'পুরস্কার';
  return isEn ? 'Other' : 'অন্যান্য';
}

function readCountCache() {
  try {
    const raw = sessionStorage.getItem(COUNT_CACHE_KEY) || localStorage.getItem(COUNT_CACHE_KEY);
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
    const payload = JSON.stringify({ pending, at: Date.now() });
    sessionStorage.setItem(COUNT_CACHE_KEY, payload);
    localStorage.setItem(COUNT_CACHE_KEY, payload);
  } catch {
    /* ignore */
  }
}

export function cacheContactPendingCount(pending) {
  writeCountCache(Number(pending) || 0);
}

export function getCachedSheetContacts() {
  try {
    const raw = localStorage.getItem(ROWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    const age = Date.now() - (parsed.at || 0);
    return {
      rows: parsed.rows,
      pending: Number(parsed.pending) || 0,
      at: parsed.at,
      isFresh: age < ROWS_FRESH_MS,
    };
  } catch {
    return null;
  }
}

export function saveCachedSheetContacts(rows, pending) {
  try {
    const payload = {
      rows: Array.isArray(rows) ? rows : [],
      pending: Number(pending) || 0,
      at: Date.now(),
    };
    localStorage.setItem(ROWS_CACHE_KEY, JSON.stringify(payload));
    writeCountCache(payload.pending);
  } catch {
    /* ignore */
  }
}

export async function fetchContactPendingCount({ force = false } = {}) {
  if (!force) {
    const cached = readCountCache();
    if (cached != null && Number.isFinite(cached)) return cached;
    const cachedRows = getCachedSheetContacts();
    if (cachedRows?.pending != null && Number.isFinite(cachedRows.pending)) return cachedRows.pending;
  }
  const res = await fetch(sheetUrl({ count: '1', ...(force ? { refresh: '1' } : {}) }));
  if (!res.ok) throw new Error('sheet');
  const json = await res.json();
  if (!json || json.ok === false) throw new Error('sheet');
  const pending = Number(json.pending) || 0;
  writeCountCache(pending);
  return pending;
}

export async function fetchSheetContacts({ force = false } = {}) {
  const res = await fetch(sheetUrl(force ? { refresh: '1' } : {}));
  if (!res.ok) throw new Error('sheet');
  const json = await res.json();
  if (!json || json.ok === false) throw new Error('sheet');
  const rows = Array.isArray(json.rows) ? json.rows : [];
  const pending = json.pending != null ? Number(json.pending) : rows.filter(r => r.pending !== false).length;
  saveCachedSheetContacts(rows, pending);
  return rows;
}

/**
 * Writes Contacted On / Contacted By / Remarks for one sheet row.
 * Uses GET so the browser can read the Apps Script JSON response (POST is opaque under no-cors).
 * Empty remarks do not clear an existing Remarks cell unless clearRemarks is true.
 */
export async function saveContactFollowUp({
  id,
  phone,
  contactedOn,
  contactedBy,
  remarks,
  clearRemarks = false,
} = {}) {
  const rowId = String(id || '').trim();
  if (!/^\d+$/.test(rowId) || Number(rowId) < 2) {
    return { ok: false, error: 'bad row' };
  }

  const params = {
    followup: '1',
    id: rowId,
    phone: String(phone || '').trim(),
    contactedOn: String(contactedOn || '').trim().slice(0, 80),
    contactedBy: String(contactedBy || '').trim().slice(0, 120),
    remarks: String(remarks || '').trim().slice(0, 500),
  };
  if (clearRemarks) params.clearRemarks = '1';

  const res = await fetch(sheetUrl(params));
  if (!res.ok) return { ok: false, error: 'network' };
  let json;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: 'bad response' };
  }
  if (!json || json.ok === false) {
    return { ok: false, error: String(json?.error || 'sheet') };
  }
  // Old script ignores followup=1 and returns the inbox ({ rows }) — treat as not deployed.
  if (Array.isArray(json.rows) || String(json.id || '') !== rowId) {
    return { ok: false, error: 'script outdated' };
  }
  return {
    ok: true,
    id: String(json.id),
    contactedOn: String(json.contactedOn || params.contactedOn),
    contactedBy: String(json.contactedBy || params.contactedBy),
    remarks: String(json.remarks || params.remarks),
  };
}
