/**
 * Live-hour makeup packs: missed hours stay missed on the ring, but the
 * current-hour quiz grows by one 5-question / 50-pt pack per recent miss.
 * No past quiz_id submits — catch-up is scored only on the live hour.
 */

export const HOURLY_QUESTIONS_PER_PACK = 5;
export const HOURLY_POINTS_PER_PACK = 50;
export const HOURLY_MAX_MAKEUP_HOURS = 5;

/**
 * Count unplayed hours in the lookback window before the live hour.
 * Same calendar day only (hours &lt; 0 stop the window).
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
        if (!played.has(hour)) missed += 1;
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
            ? `${packCount} সেট খেলে সর্বোচ্চ ${maxLabel} পর্যন্ত যোগ হতে পারে। আগের মিস ঘণ্টাগুলো রিং-এ মিসই থাকবে।`
            : `Up to ${maxLabel} from ${packCount} sets this hour. Earlier misses stay Missed on your ring.`,
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
