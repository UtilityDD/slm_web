import { storageUtils } from './storageUtils';

export const READING_GATE_MS = 48 * 60 * 60 * 1000;
const GATE_STATE_PREFIX = 'slm_reading_gate_v1_';
const GATE_NAV_KEY = 'slm_reading_gate_nav_v1';
const GATE_REVIEW_TARGET_PREFIX = 'slm_gate_review_target_';
const GATE_UNLOCK_PREFIX = 'slm_gate_unlock_pending_v1_';
const GATE_ASKED_PREFIX = 'slm_gate_asked_v1_';
const GATE_UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

export function gateStateKey(userId) {
    return `${GATE_STATE_PREFIX}${userId}`;
}

export function readLocalGateState(userId) {
    if (!userId) return null;
    try {
        const raw = storageUtils.getItem(gateStateKey(userId));
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object') return null;
        return {
            lastActivityAt: typeof o.lastActivityAt === 'string' ? o.lastActivityAt : null,
            lastLessonId: typeof o.lastLessonId === 'string' ? o.lastLessonId : null,
            lastKind: o.lastKind === 'review' ? 'review' : 'app',
        };
    } catch {
        return null;
    }
}

export function writeLocalGateActivity(userId, lessonId, kind = 'app') {
    if (!userId || !lessonId) return;
    const payload = {
        lastActivityAt: new Date().toISOString(),
        lastLessonId: String(lessonId),
        lastKind: kind === 'review' ? 'review' : 'app',
    };
    storageUtils.setItem(gateStateKey(userId), JSON.stringify(payload));
}

export function isWithinReadingGateWindow(isoTimestamp) {
    if (!isoTimestamp) return false;
    const t = new Date(isoTimestamp).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t < READING_GATE_MS;
}

export function pickLatestActivityAt(...candidates) {
    let best = null;
    let bestMs = -Infinity;
    for (const c of candidates) {
        if (!c) continue;
        const ms = new Date(c).getTime();
        if (!Number.isNaN(ms) && ms > bestMs) {
            bestMs = ms;
            best = c;
        }
    }
    return best;
}

export function setGateNavigation({ userId, lessonId }) {
    if (!userId || !lessonId) return;
    const m = String(lessonId).match(/^(\d+)\.(\d+)$/);
    if (!m) return;
    storageUtils.setItem(
        GATE_NAV_KEY,
        JSON.stringify({
            userId,
            lessonId: String(lessonId),
            chapterNum: parseInt(m[1], 10),
            lessonNum: parseInt(m[2], 10),
            ts: Date.now(),
        })
    );
}

export function consumeGateNavigation(userId) {
    if (!userId) return null;
    try {
        const raw = storageUtils.getItem(GATE_NAV_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        storageUtils.removeItem(GATE_NAV_KEY);
        if (!o || o.userId !== userId) return null;
        if (Date.now() - (o.ts || 0) > 30 * 60 * 1000) return null;
        return o;
    } catch {
        return null;
    }
}

export function setGateReviewTarget(userId, lessonId) {
    if (!userId || !lessonId) return;
    storageUtils.setItem(`${GATE_REVIEW_TARGET_PREFIX}${userId}`, String(lessonId));
}

export function consumeGateReviewTarget(userId, lessonId) {
    if (!userId || !lessonId) return false;
    const key = `${GATE_REVIEW_TARGET_PREFIX}${userId}`;
    const target = storageUtils.getItem(key);
    if (target !== String(lessonId)) return false;
    storageUtils.removeItem(key);
    return true;
}

/** Set when user accepts a gate block — consumed only after quiz pass on that lesson. */
export function setGateUnlockPending(userId, lessonId, kind = 'next') {
    if (!userId || !lessonId) return;
    const m = String(lessonId).match(/^(\d+)\.(\d+)$/);
    if (!m) return;
    storageUtils.setItem(
        `${GATE_UNLOCK_PREFIX}${userId}`,
        JSON.stringify({
            lessonId: String(lessonId),
            kind: kind === 'review' ? 'review' : 'next',
            ts: Date.now(),
        })
    );
}

/**
 * @returns {{ kind: 'next' | 'review' } | null}
 */
export function consumeGateUnlockPending(userId, lessonId) {
    if (!userId || !lessonId) return null;
    const key = `${GATE_UNLOCK_PREFIX}${userId}`;
    try {
        const raw = storageUtils.getItem(key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || o.lessonId !== String(lessonId)) return null;
        if (Date.now() - (o.ts || 0) > GATE_UNLOCK_TTL_MS) {
            storageUtils.removeItem(key);
            return null;
        }
        storageUtils.removeItem(key);
        return { kind: o.kind === 'review' ? 'review' : 'next' };
    } catch {
        return null;
    }
}

export function peekGateUnlockPending(userId) {
    if (!userId) return null;
    try {
        const raw = storageUtils.getItem(`${GATE_UNLOCK_PREFIX}${userId}`);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o?.lessonId || Date.now() - (o.ts || 0) > GATE_UNLOCK_TTL_MS) return null;
        return { lessonId: String(o.lessonId), kind: o.kind === 'review' ? 'review' : 'next' };
    } catch {
        return null;
    }
}

/** Remember the lesson the lock named, including after Not now. */
export function setGateAskedLesson(userId, lessonId, mode = 'next') {
    if (!userId || !lessonId) return;
    storageUtils.setItem(
        `${GATE_ASKED_PREFIX}${userId}`,
        JSON.stringify({
            lessonId: String(lessonId),
            mode: mode === 'review' ? 'review' : 'next',
            ts: Date.now(),
        })
    );
}

/**
 * Consume only when this pass is the lesson the lock named.
 * @returns {{ lessonId: string, mode: 'next' | 'review' } | null}
 */
export function consumeGateAskedLesson(userId, lessonId) {
    if (!userId || !lessonId) return null;
    const key = `${GATE_ASKED_PREFIX}${userId}`;
    try {
        const raw = storageUtils.getItem(key);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o?.lessonId || Date.now() - (o.ts || 0) > GATE_UNLOCK_TTL_MS) {
            storageUtils.removeItem(key);
            return null;
        }
        if (String(o.lessonId) !== String(lessonId)) return null;
        storageUtils.removeItem(key);
        return { lessonId: String(o.lessonId), mode: o.mode === 'review' ? 'review' : 'next' };
    } catch {
        return null;
    }
}

/** @returns {{ chapterNum: number, lessonNum: number } | null} */
export function parseCoreLessonId(lessonId) {
    const m = String(lessonId).match(/^(\d+)\.(\d+)$/);
    if (!m) return null;
    return { chapterNum: parseInt(m[1], 10), lessonNum: parseInt(m[2], 10) };
}
