import {
  ESSENTIAL_PPE_ITEMS,
  OTHER_PPE_ITEMS,
  PPE_ITEMS,
  PPE_NUDGE_ITEM_ORDER,
  getPpeItem,
} from '../data/ppeItems';
import {
  daysSince,
  isSharedDataNudgeSlotFree,
  normalizeNudgeState,
  setSharedDataNudgeLastDate,
  todayDateString,
} from './profileNudge';

/** Jobs that do not need field PPE progressive prompts. */
export const PPE_NUDGE_EXCLUDED_JOBS = new Set([
  'Non-Technical',
  'Engineer',
  'Others',
]);

export const PPE_NUDGE_GAP_DAYS = 2;
export const PPE_NUDGE_SHOW_AFTER_MS = 14000;
/** Re-ask owned items after this many days (condition/age freshness). */
export const PPE_STALE_DAYS = 90;

const LOCAL_LAST_KEY = 'slm_ppe_nudge_last';

export function isFieldPpeJob(job) {
  if (!job || typeof job !== 'string') return false;
  const j = job.trim();
  if (!j) return false;
  return !PPE_NUDGE_EXCLUDED_JOBS.has(j);
}

export function getLocalPpeLastPromptDate(userId) {
  if (!userId) return null;
  try {
    return localStorage.getItem(`${LOCAL_LAST_KEY}_${userId}`) || null;
  } catch {
    return null;
  }
}

export function setLocalPpeLastPromptDate(userId, dateStr = todayDateString()) {
  if (!userId) return;
  try {
    localStorage.setItem(`${LOCAL_LAST_KEY}_${userId}`, dateStr);
  } catch {
    /* ignore */
  }
  setSharedDataNudgeLastDate(userId, dateStr);
}

export function getPpeSkipCount(nudgeState, itemName) {
  const n = normalizeNudgeState(nudgeState).skips[itemName];
  return typeof n === 'number' && n > 0 ? n : 0;
}

/** First prompt may no longer be skipped — users must answer Have it? */
export function canSkipPpeItem() {
  return false;
}

export function isPpeNudgeDue(nudgeState, userId, gapDays = PPE_NUDGE_GAP_DAYS) {
  if (!isSharedDataNudgeSlotFree(userId, gapDays)) return false;
  const today = todayDateString();
  const serverLast = normalizeNudgeState(nudgeState).last_prompt_date;
  const localLast = getLocalPpeLastPromptDate(userId);
  const last = [serverLast, localLast].filter(Boolean).sort().pop();
  if (!last) return true;
  return daysSince(last, today) >= gapDays;
}

function rowByName(ppeRows, name) {
  if (!Array.isArray(ppeRows)) return null;
  return ppeRows.find((r) => r.name === name) || null;
}

/** Item counts as collected when owned OR marked answered (incl. "don't have"). */
export function isPpeItemCollected(itemName, ppeRows, nudgeState) {
  const answered = normalizeNudgeState(nudgeState).answered;
  if (answered[itemName]) return true;
  return !!rowByName(ppeRows, itemName);
}

export function isPpeItemOwned(itemName, ppeRows) {
  return !!rowByName(ppeRows, itemName);
}

function isStaleRow(row, staleDays = PPE_STALE_DAYS) {
  if (!row) return false;
  const stamp = row.updated_at || row.created_at;
  if (!stamp) return false;
  const d = String(stamp).slice(0, 10);
  return daysSince(d) >= staleDays;
}

function needsRefresh(itemName, ppeRows, nudgeState, staleDays = PPE_STALE_DAYS) {
  const row = rowByName(ppeRows, itemName);
  if (!row) return false;
  const answered = normalizeNudgeState(nudgeState).answered;
  // Don't re-prompt "don't have" as stale ownership refresh.
  if (answered[itemName] && !row) return false;
  const cond = String(row.condition || '').toLowerCase();
  if (cond === 'poor' || cond === 'expired') return true;
  return isStaleRow(row, staleDays);
}

/**
 * Next PPE item to prompt, or null.
 * Order: missing essentials → missing others → stale/poor owned essentials → stale others.
 */
export function getNextPpeNudgeItem(ppeRows, nudgeState, { includeStale = true } = {}) {
  const state = normalizeNudgeState(nudgeState);

  for (const name of PPE_NUDGE_ITEM_ORDER) {
    if (!isPpeItemCollected(name, ppeRows, state)) return name;
  }

  if (!includeStale) return null;

  for (const name of ESSENTIAL_PPE_ITEMS.map((i) => i.name)) {
    if (needsRefresh(name, ppeRows, state)) return name;
  }
  for (const name of OTHER_PPE_ITEMS.map((i) => i.name)) {
    if (needsRefresh(name, ppeRows, state)) return name;
  }
  return null;
}

export function countFilledPpeNudgeItems(ppeRows, nudgeState) {
  const state = normalizeNudgeState(nudgeState);
  let filled = 0;
  let essentialFilled = 0;
  let essentialOwned = 0;
  for (const item of PPE_ITEMS) {
    const collected = isPpeItemCollected(item.name, ppeRows, state);
    if (collected) filled += 1;
    if (item.essential) {
      if (collected) essentialFilled += 1;
      if (isPpeItemOwned(item.name, ppeRows)) essentialOwned += 1;
    }
  }
  return {
    filled,
    total: PPE_ITEMS.length,
    essentialFilled,
    essentialOwned,
    essentialTotal: ESSENTIAL_PPE_ITEMS.length,
  };
}

export function buildSkipPpeNudgePatch(nudgeState, itemName) {
  const current = normalizeNudgeState(nudgeState);
  const nextSkips = {
    ...current.skips,
    [itemName]: getPpeSkipCount(nudgeState, itemName) + 1,
  };
  return {
    last_prompt_date: todayDateString(),
    skips: nextSkips,
  };
}

export function buildSavePpeNudgePatch(nudgeState, itemName) {
  const current = normalizeNudgeState(nudgeState);
  const nextSkips = { ...current.skips };
  delete nextSkips[itemName];
  const nextAnswered = { ...current.answered, [itemName]: true };
  return {
    last_prompt_date: todayDateString(),
    skips: nextSkips,
    answered: nextAnswered,
  };
}

export function getUserPpeNudgeStatus(profile, ppeRows = []) {
  const nudgeState = normalizeNudgeState(profile?.ppe_nudge_state);
  const counts = countFilledPpeNudgeItems(ppeRows, nudgeState);
  const nextItem = getNextPpeNudgeItem(ppeRows, nudgeState);
  const eligible = isFieldPpeJob(profile?.job);
  const skipTotal = Object.values(nudgeState.skips).reduce(
    (sum, n) => sum + (typeof n === 'number' && n > 0 ? n : 0),
    0
  );

  let status = 'pending';
  if (!eligible) status = 'excluded';
  else if (!nextItem) status = 'complete';
  else if (counts.filled === 0 && !nudgeState.last_prompt_date && skipTotal === 0) {
    status = 'not_started';
  }

  const missingEssentials = ESSENTIAL_PPE_ITEMS.filter(
    (i) => !isPpeItemOwned(i.name, ppeRows)
  ).map((i) => i.name);

  return {
    ...counts,
    nextItem,
    status,
    eligible,
    lastPromptDate: nudgeState.last_prompt_date,
    skipTotal,
    missingEssentials,
    job: profile?.job || '',
  };
}

export function summarizePpeNudgeCollection(profiles = [], ppeRowsByUser = {}) {
  const rows = Array.isArray(profiles) ? profiles : [];
  const perItem = {};
  for (const item of PPE_ITEMS) {
    perItem[item.name] = { owned: 0, answered: 0, pending: 0, skipped: 0 };
  }

  let eligible = 0;
  let complete = 0;
  let pending = 0;
  let notStarted = 0;
  let excluded = 0;
  let prompted = 0;
  let skipEvents = 0;
  let missingEssentialUsers = 0;
  const users = [];

  for (const profile of rows) {
    const ppeRows = ppeRowsByUser[profile.id] || [];
    const snap = getUserPpeNudgeStatus(profile, ppeRows);
    if (snap.status === 'excluded') excluded += 1;
    else {
      eligible += 1;
      if (snap.status === 'complete') complete += 1;
      else if (snap.status === 'not_started') notStarted += 1;
      else pending += 1;
      if (snap.missingEssentials.length > 0) missingEssentialUsers += 1;
    }

    if (snap.lastPromptDate) prompted += 1;
    skipEvents += snap.skipTotal;

    if (snap.eligible) {
      const state = normalizeNudgeState(profile.ppe_nudge_state);
      for (const item of PPE_ITEMS) {
        const owned = isPpeItemOwned(item.name, ppeRows);
        const collected = isPpeItemCollected(item.name, ppeRows, state);
        if (owned) perItem[item.name].owned += 1;
        if (collected) perItem[item.name].answered += 1;
        else {
          perItem[item.name].pending += 1;
          if (getPpeSkipCount(state, item.name) > 0) perItem[item.name].skipped += 1;
        }
      }
    }

    users.push({
      id: profile.id,
      full_name: profile.full_name || '',
      slm_id: profile.slm_id || '',
      role: profile.role || '',
      phone: profile.phone_number || profile.phone || '',
      ...snap,
    });
  }

  const avgEssential =
    eligible > 0
      ? Math.round(
          (users
            .filter((u) => u.eligible)
            .reduce((sum, u) => sum + u.essentialOwned, 0) /
            (eligible * ESSENTIAL_PPE_ITEMS.length)) *
            100
        )
      : 0;

  return {
    total: rows.length,
    eligible,
    excluded,
    complete,
    pending,
    notStarted,
    prompted,
    skipEvents,
    missingEssentialUsers,
    avgEssential,
    perItem,
    users,
  };
}

export function buildPpeNudgePatch(nudgeState, itemName) {
  return getPpeItem(itemName) ? buildSavePpeNudgePatch(nudgeState, itemName) : null;
}

/** Profile columns for PPE nudge eligibility + state. */
export const PPE_NUDGE_PROFILE_SELECT = 'job, ppe_nudge_state';
