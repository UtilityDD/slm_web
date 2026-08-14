import { supabase } from '../supabaseClient';
import { ITEM_SET_VERSION, SAFETY_CULTURE_ITEMS } from '../data/safetyCultureSurvey';

/** After first completion, next survey is due after this many days. */
export const CULTURE_SURVEY_INTERVAL_DAYS = 90;

/**
 * First survey only after this many distinct active-use days
 * (calendar days the user opened the app while logged in, IST).
 */
export const CULTURE_SURVEY_FIRST_ACTIVE_DAYS = 3;

const DRAFT_KEY_PREFIX = 'slm_culture_draft_';
const DUE_DRAFT_SUFFIX = 'auto-due';
const ACTIVE_DAYS_KEY_PREFIX = 'slm_culture_active_days_v1_';

export function cultureDraftKey(userId, waveId) {
  return `${DRAFT_KEY_PREFIX}${userId || 'anon'}_${waveId || DUE_DRAFT_SUFFIX}`;
}

function activeDaysStorageKey(userId) {
  return `${ACTIVE_DAYS_KEY_PREFIX}${userId || 'anon'}`;
}

/** Today's date in IST as YYYY-MM-DD. */
export function istDateKey(date = new Date()) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readActiveDaySet(userId) {
  try {
    const raw = localStorage.getItem(activeDaysStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeActiveDaySet(userId, days) {
  try {
    const trimmed = [...new Set(days)].sort().slice(-60);
    localStorage.setItem(activeDaysStorageKey(userId), JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/** Mark today as an active-use day for this user (once per IST day). */
export function recordCultureActiveDay(userId, date = new Date()) {
  if (!userId) return 0;
  const key = istDateKey(date);
  const days = readActiveDaySet(userId);
  if (!days.includes(key)) {
    days.push(key);
    writeActiveDaySet(userId, days);
  }
  return days.length;
}

export function countCultureActiveDays(userId) {
  if (!userId) return 0;
  return readActiveDaySet(userId).length;
}

export function loadCultureDraft(userId, waveId = DUE_DRAFT_SUFFIX) {
  try {
    const raw = localStorage.getItem(cultureDraftKey(userId, waveId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCultureDraft(userId, waveId = DUE_DRAFT_SUFFIX, draft) {
  try {
    localStorage.setItem(cultureDraftKey(userId, waveId), JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function clearCultureDraft(userId, waveId = DUE_DRAFT_SUFFIX) {
  try {
    localStorage.removeItem(cultureDraftKey(userId, waveId));
  } catch {
    /* ignore */
  }
}

export function defaultWaveCode(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const q = Math.floor(m / 3) + 1;
  return `${y}-Q${q}`;
}

/** Per-user cycle bucket so a user can retake after 90 days without colliding. */
export function buildUserCycleWaveCode(userId, date = new Date()) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const short = String(userId || 'user').replace(/-/g, '').slice(0, 8);
  const quarter = defaultWaveCode(date);
  return `auto-${quarter}-${y}${mo}${d}-${short}`;
}

export async function fetchLatestCultureCompletion(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('safety_culture_completions')
    .select('id, completed_at, wave_id')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Distinguish "no row" (null) from missing table / RLS / network — callers must not treat errors as first-time due.
    console.error('fetchLatestCultureCompletion', error);
    const err = new Error(error.message || 'culture_completion_fetch_failed');
    err.code = error.code;
    err.cause = error;
    throw err;
  }
  return data;
}

/** @deprecated Prefer 90-day user cycle; kept for admin tooling. */
export async function fetchActiveCultureWave() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('safety_culture_waves')
    .select('id, wave_code, opens_at, closes_at, item_set_version, is_active')
    .eq('is_active', true)
    .lte('opens_at', nowIso)
    .order('opens_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('fetchActiveCultureWave', error);
    return null;
  }
  const now = Date.now();
  return (
    (data || []).find((w) => !w.closes_at || new Date(w.closes_at).getTime() >= now) || null
  );
}

export async function fetchCultureCompletion(userId, waveId) {
  if (!userId || !waveId) return null;
  const { data, error } = await supabase
    .from('safety_culture_completions')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('wave_id', waveId)
    .maybeSingle();
  if (error) {
    console.error('fetchCultureCompletion', error);
    return null;
  }
  return data;
}

/**
 * Auto gate:
 * - Never completed → pending only after CULTURE_SURVEY_FIRST_ACTIVE_DAYS active-use days
 * - Else pending when ≥ 90 days since last completion
 */
export async function isCultureSurveyPending(userId) {
  if (!userId) {
    return {
      pending: false,
      wave: null,
      lastCompletedAt: null,
      nextDueAt: null,
      activeDays: 0,
      requiredActiveDays: CULTURE_SURVEY_FIRST_ACTIVE_DAYS,
    };
  }

  const activeDays = recordCultureActiveDay(userId);

  let last;
  try {
    last = await fetchLatestCultureCompletion(userId);
  } catch (e) {
    // Soft-fail: if SQL not applied / network error, never intercept navigation.
    console.warn('isCultureSurveyPending unavailable', e);
    return {
      pending: false,
      wave: null,
      lastCompletedAt: null,
      nextDueAt: null,
      activeDays,
      requiredActiveDays: CULTURE_SURVEY_FIRST_ACTIVE_DAYS,
      reason: 'unavailable',
    };
  }

  if (!last?.completed_at) {
    const ready = activeDays >= CULTURE_SURVEY_FIRST_ACTIVE_DAYS;
    return {
      pending: ready,
      wave: null,
      lastCompletedAt: null,
      nextDueAt: null,
      activeDays,
      requiredActiveDays: CULTURE_SURVEY_FIRST_ACTIVE_DAYS,
      reason: ready ? 'first' : 'wait_active',
    };
  }

  const completedMs = new Date(last.completed_at).getTime();
  if (Number.isNaN(completedMs)) {
    const ready = activeDays >= CULTURE_SURVEY_FIRST_ACTIVE_DAYS;
    return {
      pending: ready,
      wave: null,
      lastCompletedAt: null,
      nextDueAt: null,
      activeDays,
      requiredActiveDays: CULTURE_SURVEY_FIRST_ACTIVE_DAYS,
      reason: ready ? 'first' : 'wait_active',
    };
  }

  const nextDueMs = completedMs + CULTURE_SURVEY_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  const pending = Date.now() >= nextDueMs;
  return {
    pending,
    wave: null,
    lastCompletedAt: last.completed_at,
    nextDueAt: new Date(nextDueMs).toISOString(),
    activeDays,
    requiredActiveDays: CULTURE_SURVEY_FIRST_ACTIVE_DAYS,
    reason: pending ? 'interval' : 'ok',
  };
}

export async function ensureCultureCycleWave(userId) {
  if (!userId) throw new Error('missing user');
  const waveCode = buildUserCycleWaveCode(userId);

  const { data, error } = await supabase.rpc('get_or_create_safety_culture_wave', {
    p_wave_code: waveCode,
    p_item_set_version: ITEM_SET_VERSION,
  });

  if (!error) {
    const id = typeof data === 'string' ? data : data?.id;
    if (id) return { id, wave_code: waveCode };
  } else {
    console.warn('get_or_create_safety_culture_wave', error);
  }

  // Fallback when RPC missing / fails: reuse existing auto wave or insert one.
  const { data: existing, error: selErr } = await supabase
    .from('safety_culture_waves')
    .select('id, wave_code')
    .eq('wave_code', waveCode)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return { id: existing.id, wave_code: waveCode };

  const { data: created, error: insErr } = await supabase
    .from('safety_culture_waves')
    .insert({
      wave_code: waveCode,
      opens_at: new Date().toISOString(),
      closes_at: null,
      item_set_version: ITEM_SET_VERSION,
      is_active: false,
      created_by: userId,
    })
    .select('id, wave_code')
    .single();
  if (insErr) throw insErr || error;
  return { id: created.id, wave_code: waveCode };
}

export async function fetchCultureResponsesForWave(waveId) {
  const { data, error } = await supabase
    .from('safety_culture_responses')
    .select('user_id, item_id, answer_uchit, answer_hoy, submitted_at, wave_id')
    .eq('wave_id', waveId);
  if (error) throw error;
  return data || [];
}

/** All responses in a time window (admin period summary). */
export async function fetchCultureResponsesInRange({ since = null, until = null } = {}) {
  let query = supabase
    .from('safety_culture_responses')
    .select('user_id, item_id, answer_uchit, answer_hoy, submitted_at, wave_id')
    .order('submitted_at', { ascending: false });

  if (since) query = query.gte('submitted_at', since);
  if (until) query = query.lte('submitted_at', until);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export function getCultureReportPeriodRange(period = '90d') {
  const now = new Date();
  if (period === 'all') {
    return { since: null, until: null, label_bn: 'সব সময়', label_en: 'All time' };
  }
  if (period === 'quarter') {
    const y = now.getFullYear();
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const since = new Date(y, qStartMonth, 1, 0, 0, 0, 0).toISOString();
    return {
      since,
      until: null,
      label_bn: `এই কোয়ার্টার (${defaultWaveCode(now)})`,
      label_en: `This quarter (${defaultWaveCode(now)})`,
    };
  }
  // default 90d
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  return {
    since,
    until: null,
    label_bn: 'গত ৯০ দিন',
    label_en: 'Last 90 days',
  };
}

export async function fetchProfilesByIds(userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone_number')
    .in('id', ids);
  if (error) throw error;
  const map = {};
  for (const p of data || []) map[p.id] = p;
  return map;
}

export async function fetchAllCultureWaves() {
  const { data, error } = await supabase
    .from('safety_culture_waves')
    .select('*')
    .order('opens_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Upsert all item answers + mark completion.
 * Prefers SECURITY DEFINER RPC (avoids client RLS 42501 on responses/completions).
 */
export async function submitCultureSurvey({ userId, waveId, answers }) {
  if (!userId) throw new Error('missing user');

  const missing = SAFETY_CULTURE_ITEMS.filter((item) => {
    const a = answers[item.id];
    return !a?.uchit || !a?.hoy;
  }).map((item) => item.id);
  if (missing.length) {
    throw new Error(`incomplete:${missing.join(',')}`);
  }

  const answerPayload = {};
  for (const item of SAFETY_CULTURE_ITEMS) {
    const a = answers[item.id];
    const uchit = String(a.uchit).toUpperCase();
    const hoy = String(a.hoy).toUpperCase();
    if (!['A', 'B', 'C'].includes(uchit) || !['A', 'B', 'C'].includes(hoy)) {
      throw new Error(`incomplete:${item.id}`);
    }
    answerPayload[item.id] = { uchit, hoy };
  }

  const waveCode = buildUserCycleWaveCode(userId);

  // Primary path: one RPC (wave + responses + completion) as SECURITY DEFINER.
  const { data: rpcWaveId, error: rpcErr } = await supabase.rpc('submit_safety_culture_survey', {
    p_wave_code: waveCode,
    p_answers: answerPayload,
    p_item_set_version: ITEM_SET_VERSION,
  });

  if (!rpcErr) {
    const resolvedWaveId =
      typeof rpcWaveId === 'string' ? rpcWaveId : rpcWaveId?.id || waveId || null;
    clearCultureDraft(userId, DUE_DRAFT_SUFFIX);
    if (resolvedWaveId) clearCultureDraft(userId, resolvedWaveId);
    return { waveId: resolvedWaveId || waveId || null };
  }

  console.warn('submit_safety_culture_survey rpc', rpcErr);

  // Fallback: older direct table writes (needs working RLS + session JWT).
  let resolvedWaveId = waveId;
  if (!resolvedWaveId) {
    const wave = await ensureCultureCycleWave(userId);
    resolvedWaveId = wave.id;
  }
  if (!resolvedWaveId) throw rpcErr;

  const rows = SAFETY_CULTURE_ITEMS.map((item) => ({
    wave_id: resolvedWaveId,
    user_id: userId,
    item_id: item.id,
    answer_uchit: answerPayload[item.id].uchit,
    answer_hoy: answerPayload[item.id].hoy,
    item_set_version: ITEM_SET_VERSION,
    submitted_at: new Date().toISOString(),
  }));

  const { error: insertErr } = await supabase.from('safety_culture_responses').insert(rows);
  if (insertErr) {
    const { error: respErr } = await supabase
      .from('safety_culture_responses')
      .upsert(rows, { onConflict: 'wave_id,user_id,item_id' });
    if (respErr) throw respErr;
  }

  const { error: doneErr } = await supabase.from('safety_culture_completions').upsert(
    {
      wave_id: resolvedWaveId,
      user_id: userId,
      completed_at: new Date().toISOString(),
      item_set_version: ITEM_SET_VERSION,
    },
    { onConflict: 'wave_id,user_id' }
  );
  if (doneErr) throw doneErr;

  clearCultureDraft(userId, DUE_DRAFT_SUFFIX);
  clearCultureDraft(userId, resolvedWaveId);
  return { waveId: resolvedWaveId };
}

export async function adminCreateOrActivateWave({
  waveCode,
  opensAt = new Date().toISOString(),
  closesAt = null,
  deactivateOthers = true,
}) {
  if (deactivateOthers) {
    await supabase
      .from('safety_culture_waves')
      .update({ is_active: false })
      .eq('is_active', true);
  }
  const { data, error } = await supabase
    .from('safety_culture_waves')
    .insert({
      wave_code: waveCode,
      opens_at: opensAt,
      closes_at: closesAt,
      item_set_version: ITEM_SET_VERSION,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminSetWaveActive(waveId, isActive) {
  if (isActive) {
    await supabase
      .from('safety_culture_waves')
      .update({ is_active: false })
      .eq('is_active', true);
  }
  const { error } = await supabase
    .from('safety_culture_waves')
    .update({ is_active: isActive })
    .eq('id', waveId);
  if (error) throw error;
}
