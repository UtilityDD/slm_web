/**
 * Identify Home gift — personal “reward window” per user per IST day.
 * Active waking hours only (aligned with night sleep: hide 11 PM–6 AM IST).
 * Window start is deterministic from userId + IST date so different users
 * get different times; refresh does not re-roll mid-day.
 */
import { isNightSleepHour } from './hourlyNightWindow';
import { identifyIstToday } from './identifyRealScore';

/** Inclusive start of active day (IST hour). */
export const IDENTIFY_GIFT_ACTIVE_START_HOUR = 6;
/** Exclusive end of active day (IST hour) — gift never past 23:00. */
export const IDENTIFY_GIFT_ACTIVE_END_HOUR = 23;
/** How long the gift stays available once its window opens. */
export const IDENTIFY_GIFT_WINDOW_HOURS = 3;
/**
 * Latest allowed window *start* hour so start+duration stays inside active day.
 * 20:00 + 3h → ends 23:00.
 */
export const IDENTIFY_GIFT_LATEST_START_HOUR = IDENTIFY_GIFT_ACTIVE_END_HOUR - IDENTIFY_GIFT_WINDOW_HOURS;

function toIstParts(now = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second),
    };
}

/** FNV-1a style 32-bit hash → [0, 1). */
export function identifyGiftHash01(seed) {
    const s = String(seed || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000000) / 1000000;
}

/**
 * Minutes from midnight IST for the gift window start (inclusive).
 * Spread uniformly across [ACTIVE_START, LATEST_START] in whole minutes.
 */
export function identifyGiftWindowStartMinutes({ userId, istDate }) {
    const date = istDate || identifyIstToday();
    const t = identifyGiftHash01(`${userId || 'anon'}|identify-gift|${date}`);
    const earliest = IDENTIFY_GIFT_ACTIVE_START_HOUR * 60;
    const latest = IDENTIFY_GIFT_LATEST_START_HOUR * 60;
    const span = Math.max(0, latest - earliest);
    return earliest + Math.floor(t * (span + 1));
}

/**
 * @returns {{
 *   ok: boolean,
 *   istDate: string,
 *   startMinutes: number,
 *   endMinutes: number,
 *   startLabel: string,
 *   endLabel: string,
 *   inWindow: boolean,
 *   reason?: string,
 * }}
 */
export function getIdentifyGiftWindow({ userId, now = new Date(), forceAdmin = false } = {}) {
    const parts = toIstParts(now);
    const istDate = parts.date;
    const nowMinutes = parts.hour * 60 + parts.minute;

    if (forceAdmin) {
        return {
            ok: true,
            istDate,
            startMinutes: 0,
            endMinutes: 24 * 60,
            startLabel: 'admin',
            endLabel: 'admin',
            inWindow: true,
            reason: 'admin',
        };
    }

    if (!userId) {
        return {
            ok: false,
            istDate,
            startMinutes: 0,
            endMinutes: 0,
            startLabel: '',
            endLabel: '',
            inWindow: false,
            reason: 'no_user',
        };
    }

    if (isNightSleepHour(now)) {
        return {
            ok: false,
            istDate,
            startMinutes: 0,
            endMinutes: 0,
            startLabel: '',
            endLabel: '',
            inWindow: false,
            reason: 'sleep',
        };
    }

    const startMinutes = identifyGiftWindowStartMinutes({ userId, istDate });
    const endMinutes = startMinutes + IDENTIFY_GIFT_WINDOW_HOURS * 60;
    const inWindow = nowMinutes >= startMinutes && nowMinutes < endMinutes;

    const fmt = (m) => {
        const h = Math.floor(m / 60) % 24;
        const min = m % 60;
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    return {
        ok: true,
        istDate,
        startMinutes,
        endMinutes,
        startLabel: fmt(startMinutes),
        endLabel: fmt(endMinutes),
        inWindow,
        reason: inWindow ? 'in_window' : (nowMinutes < startMinutes ? 'before' : 'after'),
    };
}

/** True when the Home gift may appear for this user right now (timing only). */
export function isIdentifyGiftInRewardWindow({ userId, now = new Date(), forceAdmin = false } = {}) {
    return getIdentifyGiftWindow({ userId, now, forceAdmin }).inWindow;
}
