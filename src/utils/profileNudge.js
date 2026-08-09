import { PROFILE_NUDGE_FIELD_ORDER } from '../data/profileFieldOptions';

/** Calendar days that must pass after a prompt before showing another. */
export const PROFILE_NUDGE_GAP_DAYS = 2;

/** Delay after app is ready before first eligible prompt. */
export const PROFILE_NUDGE_SHOW_AFTER_MS = 12000;

const LOCAL_LAST_KEY = 'slm_profile_nudge_last';

export function isProfileFieldFilled(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (typeof val === 'number') return !Number.isNaN(val);
  if (typeof val === 'boolean') return true;
  return false;
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(`${dob}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateOnly(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function daysSince(dateStr, todayStr = todayDateString()) {
  const a = parseDateOnly(dateStr);
  const b = parseDateOnly(todayStr);
  if (!a || !b) return Infinity;
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

export function normalizeNudgeState(raw) {
  const state = raw && typeof raw === 'object' ? raw : {};
  const skips =
    state.skips && typeof state.skips === 'object' && !Array.isArray(state.skips)
      ? { ...state.skips }
      : {};
  const answered =
    state.answered && typeof state.answered === 'object' && !Array.isArray(state.answered)
      ? { ...state.answered }
      : {};
  return {
    last_prompt_date: typeof state.last_prompt_date === 'string' ? state.last_prompt_date : null,
    skips,
    answered,
  };
}

export function getLocalLastPromptDate(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_LAST_KEY}_${userId}`);
    return raw || null;
  } catch {
    return null;
  }
}

export function setLocalLastPromptDate(userId, dateStr = todayDateString()) {
  if (!userId) return;
  try {
    localStorage.setItem(`${LOCAL_LAST_KEY}_${userId}`, dateStr);
  } catch {
    /* ignore */
  }
}

/**
 * Next missing field in queue, or null if all nudge fields are filled.
 * `is_donor` may default to false in DB — use answered flag so we ask once per campaign.
 */
export function getNextNudgeField(profile, nudgeState) {
  if (!profile) return null;

  const answered = normalizeNudgeState(nudgeState).answered;
  for (const field of PROFILE_NUDGE_FIELD_ORDER) {
    if (field === 'block' && !isProfileFieldFilled(profile.district)) continue;
    if (field === 'is_donor') {
      if (profile.is_donor === true || answered.is_donor) continue;
      return field;
    }
    if (!isProfileFieldFilled(profile[field])) return field;
  }
  return null;
}

/** How many nudge fields are already filled (for ID-card progress UI). */
export function countFilledNudgeFields(profile, nudgeState) {
  if (!profile) return { filled: 0, total: PROFILE_NUDGE_FIELD_ORDER.length };
  const answered = normalizeNudgeState(nudgeState).answered;
  let filled = 0;
  for (const field of PROFILE_NUDGE_FIELD_ORDER) {
    if (field === 'is_donor') {
      if (profile.is_donor === true || answered.is_donor) filled += 1;
      continue;
    }
    if (isProfileFieldFilled(profile[field])) filled += 1;
  }
  return { filled, total: PROFILE_NUDGE_FIELD_ORDER.length };
}

/** Columns needed to decide / show the next nudge field. */
export const PROFILE_NUDGE_SELECT =
  'avatar_url, district, block, job, dob, education, blood_group, is_donor, profile_nudge_state';

export function getSkipCount(nudgeState, field) {
  const n = normalizeNudgeState(nudgeState).skips[field];
  return typeof n === 'number' && n > 0 ? n : 0;
}

/** First prompt for a field may be skipped; second+ must be answered. */
export function canSkipField(nudgeState, field) {
  return getSkipCount(nudgeState, field) < 1;
}

/**
 * Whether we may show a nudge today given gap + local backup.
 */
export function isNudgeDue(nudgeState, userId, gapDays = PROFILE_NUDGE_GAP_DAYS) {
  const today = todayDateString();
  const serverLast = normalizeNudgeState(nudgeState).last_prompt_date;
  const localLast = getLocalLastPromptDate(userId);
  const last = [serverLast, localLast]
    .filter(Boolean)
    .sort()
    .pop();
  if (!last) return true;
  return daysSince(last, today) >= gapDays;
}

export function buildSkipNudgePatch(nudgeState, field) {
  const current = normalizeNudgeState(nudgeState);
  const nextSkips = { ...current.skips, [field]: getSkipCount(nudgeState, field) + 1 };
  return {
    last_prompt_date: todayDateString(),
    skips: nextSkips,
  };
}

export function buildSaveNudgePatch(nudgeState, field) {
  const current = normalizeNudgeState(nudgeState);
  const nextSkips = { ...current.skips };
  delete nextSkips[field];
  const nextAnswered = { ...current.answered, [field]: true };
  return {
    last_prompt_date: todayDateString(),
    skips: nextSkips,
    answered: nextAnswered,
  };
}
