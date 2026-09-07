/**
 * Catch-up windows for hourly quizzes (IST).
 * Day slots (6 AM–10 PM): open 3h 15m from that hour’s start.
 * Night slots (11 PM–5 AM): open 6h 15m from that hour’s start.
 * Server must use the same numbers; the phone only displays them.
 */

export const HOURLY_QUESTIONS_PER_SET = 5;
export const HOURLY_POINTS_PER_SET = 50;
export const HOURLY_DAY_WINDOW_MIN = 3 * 60 + 15;
export const HOURLY_NIGHT_WINDOW_MIN = 6 * 60 + 15;
export const HOURLY_FUTURE_DRIFT_MIN = 5;
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const HOURLY_ID_RE = /^hourly-challenge-(\d{4})-(\d{2})-(\d{2})-(\d{2})$/;

function toIst(nowMs = Date.now()) {
    return new Date(Number(nowMs) + IST_OFFSET_MS);
}

export function getIstParts(nowMs = Date.now()) {
    const ist = toIst(nowMs);
    return {
        year: ist.getUTCFullYear(),
        month: ist.getUTCMonth() + 1,
        day: ist.getUTCDate(),
        hour: ist.getUTCHours(),
        minute: ist.getUTCMinutes(),
        second: ist.getUTCSeconds(),
    };
}

export function isNightSlotHour(hour) {
    const h = Number(hour);
    return h === 23 || (h >= 0 && h <= 5);
}

export function hourlyWindowMinutesForHour(hour) {
    return isNightSlotHour(hour) ? HOURLY_NIGHT_WINDOW_MIN : HOURLY_DAY_WINDOW_MIN;
}

export function formatHourlyQuizId(year, month, day, hour) {
    const y = String(Number(year)).padStart(4, '0');
    const m = String(Number(month)).padStart(2, '0');
    const d = String(Number(day)).padStart(2, '0');
    const h = String(Number(hour)).padStart(2, '0');
    return `hourly-challenge-${y}-${m}-${d}-${h}`;
}

export function parseHourlyQuizId(quizId) {
    const match = String(quizId || '').match(HOURLY_ID_RE);
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
    };
}

export function hourIdFromParts(year, month, day, hour) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${String(hour).padStart(2, '0')}`;
}

/** Epoch ms of IST wall-clock y-m-d h:00. */
export function slotStartMs(year, month, day, hour) {
    return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), 0, 0, 0) - IST_OFFSET_MS;
}

export function minutesSinceSlotStart(slot, nowMs = Date.now()) {
    return (Number(nowMs) - slotStartMs(slot.year, slot.month, slot.day, slot.hour)) / 60000;
}

export function isHourlySlotOpen(slot, nowMs = Date.now()) {
    if (!slot) return false;
    const diff = minutesSinceSlotStart(slot, nowMs);
    if (diff < -HOURLY_FUTURE_DRIFT_MIN) return false;
    return diff <= hourlyWindowMinutesForHour(slot.hour);
}

export function isHourlyQuizIdOpen(quizId, nowMs = Date.now()) {
    const slot = parseHourlyQuizId(quizId);
    if (!slot) return false;
    return isHourlySlotOpen(slot, nowMs);
}

export function minutesUntilHourlySlotCloses(slot, nowMs = Date.now()) {
    if (!isHourlySlotOpen(slot, nowMs)) return 0;
    const endMs = slotStartMs(slot.year, slot.month, slot.day, slot.hour)
        + hourlyWindowMinutesForHour(slot.hour) * 60000;
    return Math.max(0, Math.ceil((endMs - Number(nowMs)) / 60000));
}

function yesterdayParts(parts) {
    const utc = Date.UTC(parts.year, parts.month - 1, parts.day) - 24 * 60 * 60 * 1000;
    const d = new Date(utc);
    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
    };
}

function playedIdSet(playedQuizIds) {
    return playedQuizIds instanceof Set
        ? playedQuizIds
        : new Set((playedQuizIds || []).map((id) => String(id)));
}

/**
 * Unplayed hours the user may still take (one 5-question set each).
 * Includes last night’s 11 PM when it is still inside the 6h window.
 */
export function listPlayableHourlySlots(playedQuizIds, nowMs = Date.now()) {
    const played = playedIdSet(playedQuizIds);
    const parts = getIstParts(nowMs);
    const out = [];

    const prev = yesterdayParts(parts);
    const lastNight = { ...prev, hour: 23 };
    const lastNightId = formatHourlyQuizId(prev.year, prev.month, prev.day, 23);
    if (!played.has(lastNightId) && isHourlySlotOpen(lastNight, nowMs)) {
        out.push({
            quizId: lastNightId,
            hourId: hourIdFromParts(prev.year, prev.month, prev.day, 23),
            ...lastNight,
            isLive: false,
            isLastNight: true,
        });
    }

    for (let hour = 0; hour <= parts.hour; hour += 1) {
        const quizId = formatHourlyQuizId(parts.year, parts.month, parts.day, hour);
        if (played.has(quizId)) continue;
        const slot = { year: parts.year, month: parts.month, day: parts.day, hour };
        const isLive = hour === parts.hour;
        if (!isLive && !isHourlySlotOpen(slot, nowMs)) continue;
        out.push({
            quizId,
            hourId: hourIdFromParts(parts.year, parts.month, parts.day, hour),
            ...slot,
            isLive,
            isLastNight: false,
        });
    }
    return out;
}

export function getLiveHourlySlot(nowMs = Date.now()) {
    const parts = getIstParts(nowMs);
    return {
        quizId: formatHourlyQuizId(parts.year, parts.month, parts.day, parts.hour),
        hourId: hourIdFromParts(parts.year, parts.month, parts.day, parts.hour),
        ...parts,
        isLive: true,
        isLastNight: false,
    };
}

export function countOpenCatchUpSlots(playedQuizIds, nowMs = Date.now()) {
    return listPlayableHourlySlots(playedQuizIds, nowMs).filter((slot) => !slot.isLive).length;
}

export function nextPlayableSlotAfter(playedQuizIds, justPlayedQuizId, nowMs = Date.now()) {
    const played = playedIdSet(playedQuizIds);
    if (justPlayedQuizId) played.add(String(justPlayedQuizId));
    const open = listPlayableHourlySlots(played, nowMs);
    const live = open.find((slot) => slot.isLive);
    if (live) return live;
    return open[0] || null;
}
