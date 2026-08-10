/**
 * Live-hour makeup packs: the current-hour quiz grows by one 5-question / 50-pt
 * pack per *consecutive* missed hour immediately before the live hour.
 *
 * Missed hours can still show as Missed on the day ring (no past quiz_id writes),
 * but once the live hour is played they no longer inflate the next hour’s packs
 * (lookback stops at the most recent played hour).
 */

export const HOURLY_QUESTIONS_PER_PACK = 5;
export const HOURLY_POINTS_PER_PACK = 50;
export const HOURLY_MAX_MAKEUP_HOURS = 5;

/**
 * Count consecutive unplayed hours immediately before the live hour (same day).
 * Stops at the first already-played hour so a completed multi-set session does
 * not keep offering 6→5→4→3 packs for the same night of misses.
 *
 * @param {number} currentHour IST hour 0–23
 * @param {Set<number>|number[]} playedHours hours that already have an attempt
 * @param {number} [maxLookback]
 */
export function countRecentMissedHours(
    currentHour,
    playedHours,
    maxLookback = HOURLY_MAX_MAKEUP_HOURS
) {
    const played = playedHours instanceof Set
        ? playedHours
        : new Set((playedHours || []).map((h) => Number(h)).filter((h) => !Number.isNaN(h)));

    const live = Number(currentHour);
    if (Number.isNaN(live) || live < 0 || live > 23) return 0;

    let missed = 0;
    const lookback = Math.max(0, Math.min(HOURLY_MAX_MAKEUP_HOURS, Number(maxLookback) || 0));
    for (let i = 1; i <= lookback; i += 1) {
        const hour = live - i;
        if (hour < 0) break;
        // Gap closed: a played hour ends the consecutive-miss streak.
        if (played.has(hour)) break;
        missed += 1;
    }
    return missed;
}

/**
 * @param {number} missedCount from countRecentMissedHours
 * @returns {{ makeupMissed: number, packs: number, questionCount: number, pointsReward: number }}
 */
export function buildMakeupSession(missedCount) {
    const makeupMissed = Math.max(
        0,
        Math.min(HOURLY_MAX_MAKEUP_HOURS, Math.floor(Number(missedCount) || 0))
    );
    const packs = 1 + makeupMissed;
    return {
        makeupMissed,
        packs,
        questionCount: packs * HOURLY_QUESTIONS_PER_PACK,
        pointsReward: packs * HOURLY_POINTS_PER_PACK,
    };
}

/** Format max points for UI badges, e.g. "+150". */
export function formatMakeupMaxPoints(pointsReward) {
    const pts = Math.max(HOURLY_POINTS_PER_PACK, Number(pointsReward) || HOURLY_POINTS_PER_PACK);
    return `+${pts}`;
}

/**
 * Natural short copy for ring / Home / results / abort.
 * Bangla focuses on সেট + সর্বোচ্চ পয়েন্ট (no heavy “makeup” jargon).
 */
export function getMakeupCopy(language, makeupMissed, packs, pointsReward) {
    const bn = language === 'bn';
    const missed = Number(makeupMissed) || 0;
    const packCount = Number(packs) || 1;
    const maxPts = Number(pointsReward) > 0
        ? Number(pointsReward)
        : packCount * HOURLY_POINTS_PER_PACK;
    const maxLabel = formatMakeupMaxPoints(maxPts);

    if (missed <= 0) {
        return {
            playTitle: bn ? 'এখন খেলুন' : 'Play now',
            playSubtitle: bn ? `৫টি প্রশ্ন · সর্বোচ্চ ${maxLabel}` : `5 questions · up to ${maxLabel}`,
            resultsNote: null,
            abortExtra: null,
            chaseHint: null,
            homeBadge: maxLabel,
            homeHint: bn ? `এখন খেললে সর্বোচ্চ ${maxLabel} পয়েন্ট` : `Play now for up to ${maxLabel}`,
        };
    }

    return {
        playTitle: bn ? 'এখন খেলুন' : 'Play now',
        playSubtitle: bn
            ? `${packCount} সেট কুইজ · সর্বোচ্চ ${maxLabel}`
            : `${packCount} sets · up to ${maxLabel}`,
        resultsNote: bn
            ? `${packCount} সেট খেলে সর্বোচ্চ ${maxLabel} পর্যন্ত যোগ হতে পারে। রিং-এ আগের ঘণ্টা মিস দেখাবে, কিন্তু পরের ঘণ্টায় আবার একই মিসের জন্য অতিরিক্ত সেট আসবে না।`
            : `Up to ${maxLabel} from ${packCount} sets this hour. The ring may still show earlier hours as Missed, but those same misses won’t keep adding sets next hour.`,
        abortExtra: bn
            ? 'বেরোলে এই ঘণ্টার পুরো কুইজ ০ পয়েন্ট হবে।'
            : 'Exiting scores 0 for this whole hour (all sets).',
        chaseHint: bn
            ? `${packCount} সেট কুইজ। এখন খেললে সর্বোচ্চ ${maxLabel} পয়েন্ট পেতে পারেন — দেরি করলে কমে যেতে পারে।`
            : `${packCount} sets ready — play now for up to ${maxLabel}. Wait and the window may shrink.`,
        homeBadge: maxLabel,
        homeHint: bn
            ? `${packCount} সেট · এখন খেললে ${maxLabel}`
            : `${packCount} sets · up to ${maxLabel}`,
    };
}
