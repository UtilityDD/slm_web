/**
 * Identify “real score” — endless run helpers + DB submit (one score / user).
 * Non-admin: one chance per IST day; awards min(score, 100) to profiles.points.
 * Admin: unlimited preview; never awards Home points.
 * Custom auth: always pass p_user_id (auth.uid() is often null).
 */
import { supabase } from '../supabaseClient';
import { isGuestUser } from './guestPreview';

export const IDENTIFY_REAL_SECONDS_SHORT = 5;
export const IDENTIFY_REAL_SECONDS_LONG = 8;
export const IDENTIFY_REAL_MAX_MISTAKES = 5;
/** Max profiles.points granted per IST-day real run. */
export const IDENTIFY_REAL_POINTS_CAP = 100;

/** @deprecated prefer identifyRealSecondsFor — kept as short default */
export const IDENTIFY_REAL_SECONDS = IDENTIFY_REAL_SECONDS_SHORT;

const STATUS_CACHE_KEY = 'slm_identify_status_cache_v1';

/**
 * Clue / “বর্ণনা অনুযায়ী” → 8s; name & grid → 5s.
 */
export function identifyRealSecondsFor(mode) {
    if (mode === 'clue') return IDENTIFY_REAL_SECONDS_LONG;
    return IDENTIFY_REAL_SECONDS_SHORT;
}

/** IST calendar date YYYY-MM-DD */
export function identifyIstToday() {
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

export function isIdentifyAdmin(userProfile) {
    return userProfile?.role === 'admin';
}

/** Session cache for status — cuts repeat get_identify_score_status calls. */
export function readIdentifyStatusCache() {
    try {
        const raw = sessionStorage.getItem(STATUS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.today !== identifyIstToday()) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeIdentifyStatusCache(status) {
    if (!status || typeof status !== 'object') return;
    try {
        const today = status.today || identifyIstToday();
        sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ ...status, today }));
    } catch {
        // ignore
    }
}

/**
 * @param {{ force?: boolean, userId?: string|null }} [opts]
 */
export async function fetchIdentifyScoreStatus({ force = false, userId = null } = {}) {
    if (!force) {
        const cached = readIdentifyStatusCache();
        if (cached?.ok) return cached;
    }

    if (!userId) {
        return { ok: false, error: 'not_authenticated', can_play: false };
    }

    const { data, error } = await supabase.rpc('get_identify_score_status', {
        p_user_id: userId,
    });
    if (error) {
        return { ok: false, error: error.message || 'rpc_error', can_play: false };
    }
    if (!data || typeof data !== 'object') {
        return { ok: false, error: 'bad_response', can_play: false };
    }
    writeIdentifyStatusCache(data);
    return data;
}

/**
 * @param {{ score: number, asked?: number, mistakes?: number, userId?: string|null }} payload
 */
export async function submitIdentifyScore(payload) {
    const score = Math.max(0, Math.min(10000, Math.round(Number(payload?.score) || 0)));
    const asked = Math.max(0, Math.min(10000, Math.round(Number(payload?.asked) || 0)));
    const mistakes = Math.max(0, Math.min(20, Math.round(Number(payload?.mistakes) || 0)));
    const userId = payload?.userId || null;

    if (!userId) {
        return { ok: false, error: 'not_authenticated' };
    }

    const { data, error } = await supabase.rpc('submit_identify_score', {
        p_score: score,
        p_asked: asked,
        p_mistakes: mistakes,
        p_user_id: userId,
    });

    if (error) {
        return { ok: false, error: error.message || 'rpc_error' };
    }
    if (!data || typeof data !== 'object') {
        return { ok: false, error: 'bad_response' };
    }

    if (data.ok) {
        writeIdentifyStatusCache({
            ok: true,
            guest: false,
            is_admin: Boolean(data.preview),
            can_play: Boolean(data.preview),
            score: data.score,
            asked: data.asked,
            mistakes: data.mistakes,
            played_on: data.played_on,
            played_today: true,
            points_awarded: data.points_awarded ?? 0,
            today: data.today || identifyIstToday(),
        });
    }

    return data;
}

const TOP_SCORER_CACHE_KEY = 'slm_identify_top_scorer_v1';

function readIdentifyTopScorerCache() {
    try {
        const raw = sessionStorage.getItem(TOP_SCORER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.today !== identifyIstToday()) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeIdentifyTopScorerCache(row) {
    if (!row || typeof row !== 'object') return;
    try {
        sessionStorage.setItem(
            TOP_SCORER_CACHE_KEY,
            JSON.stringify({ ...row, today: identifyIstToday() })
        );
    } catch {
        // ignore
    }
}

/**
 * Highest current Parichiti real score + name.
 * @returns {Promise<{ok: boolean, empty?: boolean, full_name?: string, score?: number}|null>}
 */
export async function fetchIdentifyTopScorer({ force = false } = {}) {
    if (!force) {
        const cached = readIdentifyTopScorerCache();
        if (cached?.ok) return cached;
    }
    try {
        const { data, error } = await supabase.rpc('get_identify_top_scorer');
        if (error) throw error;
        const row = data && typeof data === 'object' ? data : null;
        if (!row?.ok) return { ok: false, empty: true };
        writeIdentifyTopScorerCache(row);
        return row;
    } catch (err) {
        console.error('Error fetching identify top scorer:', err);
        return { ok: false, empty: true };
    }
}

/** Client-side gate before opening real mode (RPC is still authoritative). */
export function canStartIdentifyReal({ user, userProfile, status }) {
    if (!user?.id) {
        return { ok: false, reason: 'login' };
    }
    if (isGuestUser(userProfile) || status?.guest) {
        return { ok: false, reason: 'guest' };
    }
    if (isIdentifyAdmin(userProfile) || status?.is_admin) {
        return { ok: true, preview: true };
    }
    if (status?.can_play === false || status?.played_today) {
        return { ok: false, reason: 'played' };
    }
    return { ok: true, preview: false };
}
