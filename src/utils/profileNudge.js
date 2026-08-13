import { PROFILE_NUDGE_FIELD_ORDER } from '../data/profileFieldOptions';

/** Calendar days that must pass after a prompt before showing another. */
export const PROFILE_NUDGE_GAP_DAYS = 2;

/** Delay after app is ready before first eligible prompt. */
export const PROFILE_NUDGE_SHOW_AFTER_MS = 12000;

const LOCAL_LAST_KEY = 'slm_profile_nudge_last';
/** Shared across profile + PPE so only one data nudge fires per gap window. */
export const DATA_NUDGE_SHARED_LAST_KEY = 'slm_data_nudge_last_date';

export function getSharedDataNudgeLastDate(userId) {
  if (!userId) return null;
  try {
    return localStorage.getItem(`${DATA_NUDGE_SHARED_LAST_KEY}_${userId}`) || null;
  } catch {
    return null;
  }
}

export function setSharedDataNudgeLastDate(userId, dateStr = todayDateString()) {
  if (!userId) return;
  try {
    localStorage.setItem(`${DATA_NUDGE_SHARED_LAST_KEY}_${userId}`, dateStr);
  } catch {
    /* ignore */
  }
}

/** True when neither profile nor PPE has used the shared data-nudge slot recently. */
export function isSharedDataNudgeSlotFree(userId, gapDays = PROFILE_NUDGE_GAP_DAYS) {
  const last = getSharedDataNudgeLastDate(userId);
  if (!last) return true;
  return daysSince(last, todayDateString()) >= gapDays;
}

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
  setSharedDataNudgeLastDate(userId, dateStr);
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

/** Profile prompts are required — same as PPE (no Later / skip). */
export function canSkipField() {
  return false;
}

/**
 * Whether we may show a nudge today given gap + local backup + shared data-nudge slot.
 */
export function isNudgeDue(nudgeState, userId, gapDays = PROFILE_NUDGE_GAP_DAYS) {
  if (!isSharedDataNudgeSlotFree(userId, gapDays)) return false;
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

/** Whether a single nudge field counts as collected for this profile. */
export function isNudgeFieldCollected(profile, field, nudgeState = profile?.profile_nudge_state) {
  if (!profile) return false;
  const answered = normalizeNudgeState(nudgeState).answered;
  if (field === 'is_donor') {
    return profile.is_donor === true || !!answered.is_donor;
  }
  if (field === 'block' && !isProfileFieldFilled(profile.district)) {
    return false;
  }
  return isProfileFieldFilled(profile[field]);
}

/**
 * Per-user nudge snapshot for admin status views.
 * status: complete | pending | not_started
 */
export function getUserNudgeStatus(profile) {
  if (!profile) {
    return {
      filled: 0,
      total: PROFILE_NUDGE_FIELD_ORDER.length,
      nextField: null,
      status: 'not_started',
      lastPromptDate: null,
      skipTotal: 0,
      fieldStatuses: {},
    };
  }

  const nudgeState = normalizeNudgeState(profile.profile_nudge_state);
  const { filled, total } = countFilledNudgeFields(profile, nudgeState);
  const nextField = getNextNudgeField(profile, nudgeState);
  const skipTotal = Object.values(nudgeState.skips).reduce(
    (sum, n) => sum + (typeof n === 'number' && n > 0 ? n : 0),
    0
  );

  const fieldStatuses = {};
  for (const field of PROFILE_NUDGE_FIELD_ORDER) {
    const collected = isNudgeFieldCollected(profile, field, nudgeState);
    const skips = getSkipCount(nudgeState, field);
    fieldStatuses[field] = {
      collected,
      skips,
      waitingOnDistrict: field === 'block' && !isProfileFieldFilled(profile.district),
    };
  }

  let status = 'pending';
  if (!nextField) status = 'complete';
  else if (filled === 0 && !nudgeState.last_prompt_date && skipTotal === 0) {
    status = 'not_started';
  }

  return {
    filled,
    total,
    nextField,
    status,
    lastPromptDate: nudgeState.last_prompt_date,
    skipTotal,
    fieldStatuses,
  };
}

/**
 * Aggregate essential-profile (nudge) collection across profiles.
 * Expects rows that include PROFILE_NUDGE_SELECT columns (+ optional identity fields).
 */
export function summarizeNudgeCollection(profiles = []) {
  const rows = Array.isArray(profiles) ? profiles : [];
  const perField = {};
  for (const field of PROFILE_NUDGE_FIELD_ORDER) {
    perField[field] = { collected: 0, pending: 0, skipped: 0 };
  }

  let complete = 0;
  let pending = 0;
  let notStarted = 0;
  let prompted = 0;
  let skipEvents = 0;
  const userRows = [];

  for (const profile of rows) {
    const snap = getUserNudgeStatus(profile);
    if (snap.status === 'complete') complete += 1;
    else if (snap.status === 'not_started') notStarted += 1;
    else pending += 1;

    if (snap.lastPromptDate) prompted += 1;
    skipEvents += snap.skipTotal;

    for (const field of PROFILE_NUDGE_FIELD_ORDER) {
      const fs = snap.fieldStatuses[field];
      if (fs.collected) perField[field].collected += 1;
      else {
        perField[field].pending += 1;
        if (fs.skips > 0) perField[field].skipped += 1;
      }
    }

    userRows.push({
      id: profile.id,
      full_name: profile.full_name || '',
      slm_id: profile.slm_id || '',
      role: profile.role || '',
      phone: profile.phone_number || profile.phone || '',
      last_login_at: profile.last_login_at || null,
      ...snap,
    });
  }

  const total = rows.length;
  return {
    total,
    complete,
    pending,
    notStarted,
    prompted,
    skipEvents,
    perField,
    users: userRows,
    avgFilled:
      total > 0
        ? Math.round(
            (userRows.reduce((sum, u) => sum + u.filled, 0) / (total * PROFILE_NUDGE_FIELD_ORDER.length)) *
              100
          )
        : 0,
  };
}

/** Columns for admin nudge status fetch (identity + nudge fields). */
export const PROFILE_NUDGE_ADMIN_SELECT =
  'id, slm_id, full_name, role, phone, phone_number, last_login_at, ' + PROFILE_NUDGE_SELECT;
