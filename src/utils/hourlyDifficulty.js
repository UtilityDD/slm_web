/** Lifetime bands for hourly penalties and question difficulty (profiles.points). */

export const HOURLY_TIER_THRESHOLDS = [10000, 30000, 50000];

const PENALTY_PER_WRONG = [0, 12, 20, 28];

const ALLOWED_DIFFICULTIES = [
    ['easy'],
    ['easy', 'medium'],
    ['medium', 'hard'],
    ['medium', 'hard'],
];

const TARGET_MIX = [
    { easy: 5, medium: 0, hard: 0 },
    { easy: 3, medium: 2, hard: 0 },
    { easy: 0, medium: 2, hard: 3 },
    { easy: 0, medium: 1, hard: 4 },
];

const DIFFICULTY_WEIGHT = {
    0: { easy: 0, medium: -1, hard: -2 },
    1: { easy: 1, medium: 0, hard: -1 },
    2: { easy: -1, medium: 0, hard: 1 },
    3: { easy: -2, medium: -1, hard: 2 },
};

export function getLifetimePoints(userProfile, userRank) {
    const fromProfile = userProfile?.points;
    if (fromProfile !== undefined && fromProfile !== null) return Number(fromProfile) || 0;
    return Number(userRank?.score) || 0;
}

export function getHourlyTier(lifetimePoints) {
    const pts = Number(lifetimePoints) || 0;
    if (pts < HOURLY_TIER_THRESHOLDS[0]) return 0;
    if (pts < HOURLY_TIER_THRESHOLDS[1]) return 1;
    if (pts < HOURLY_TIER_THRESHOLDS[2]) return 2;
    return 3;
}

export function getPenaltyPerWrong(tier) {
    return PENALTY_PER_WRONG[tier] ?? 0;
}

export function getPenaltyPerWrongForLifetime(lifetimePoints) {
    return getPenaltyPerWrong(getHourlyTier(lifetimePoints));
}

export function hasHourlyPenalties(lifetimePoints) {
    return getPenaltyPerWrongForLifetime(lifetimePoints) > 0;
}

export function getQuestionDifficulty(tags) {
    const normalized = (Array.isArray(tags) ? tags : [])
        .map((t) => String(t).toLowerCase().trim());
    if (normalized.includes('hard')) return 'hard';
    if (normalized.includes('medium')) return 'medium';
    return 'easy';
}

export function filterQuestionsForTier(questions, tier) {
    const allowed = new Set(ALLOWED_DIFFICULTIES[tier] || ['easy']);
    const filtered = (questions || []).filter((q) =>
        allowed.has(getQuestionDifficulty(q.tags))
    );
    if (filtered.length >= 5) return filtered;
    return questions || [];
}

/** Deterministic final pick of `total` questions from a pre-shuffled, freshness-sorted pool. */
export function pickQuestionsByDifficultyMix(orderedPool, lifetimePoints, total = 5) {
    const pool = orderedPool || [];
    if (pool.length <= total) return [...pool];

    const mix = TARGET_MIX[getHourlyTier(lifetimePoints)] || TARGET_MIX[0];
    const buckets = { easy: [], medium: [], hard: [] };
    pool.forEach((q) => {
        buckets[getQuestionDifficulty(q?.tags)].push(q);
    });

    const picked = [];
    const usedIds = new Set();

    const takeFromBucket = (difficulty, count) => {
        let remaining = count;
        for (const q of buckets[difficulty]) {
            if (remaining <= 0) break;
            const id = String(q?.id ?? '');
            if (!id || usedIds.has(id)) continue;
            picked.push(q);
            usedIds.add(id);
            remaining -= 1;
        }
        return remaining;
    };

    for (const difficulty of ['hard', 'medium', 'easy']) {
        let shortfall = takeFromBucket(difficulty, mix[difficulty] || 0);
        if (shortfall > 0) {
            for (const q of pool) {
                if (shortfall <= 0) break;
                const id = String(q?.id ?? '');
                if (!id || usedIds.has(id)) continue;
                if (getQuestionDifficulty(q?.tags) !== difficulty) continue;
                picked.push(q);
                usedIds.add(id);
                shortfall -= 1;
            }
        }
    }

    for (const q of pool) {
        if (picked.length >= total) break;
        const id = String(q?.id ?? '');
        if (!id || usedIds.has(id)) continue;
        picked.push(q);
        usedIds.add(id);
    }

    return picked.slice(0, total);
}

export function orderQuestionsByDifficultyBias(questions, tier) {
    const weights = DIFFICULTY_WEIGHT[tier] ?? DIFFICULTY_WEIGHT[0];
    return questions
        .map((q, index) => ({ q, index }))
        .sort((a, b) => {
            const wa = weights[getQuestionDifficulty(a.q.tags)] ?? 0;
            const wb = weights[getQuestionDifficulty(b.q.tags)] ?? 0;
            if (wa !== wb) return wb - wa;
            return a.index - b.index;
        })
        .map(({ q }) => q);
}

/** Copy for the Training page hourly penalty explainer modal. */
export function getHourlyPenaltyModalCopy(lifetimePoints, language = 'en') {
    const penalty = getPenaltyPerWrongForLifetime(lifetimePoints);
    const bn = language === 'bn';

    const tiers = bn
        ? ['১০,০০০+ → −১২ / ভুল', '৩০,০০০+ → −২০', '৫০,০০০+ → −২৮']
        : ['10,000+ → −12 / wrong', '30,000+ → −20', '50,000+ → −28'];

    if (!penalty) {
        return {
            title: bn ? 'প্রতি ঘণ্টার কুইজ' : 'Hourly quiz',
            body: bn
                ? '১০,০০০ মোট পয়েন্টের নিচে ভুল উত্তরে পেনাল্টি নেই।'
                : 'No penalty on wrong answers below 10,000 lifetime points.',
            tiers,
        };
    }

    return {
        title: bn ? 'প্রতি ঘণ্টার কুইজ' : 'Hourly quiz',
        body: bn
            ? `আপনার প্রতিটি ভুল উত্তরে −${penalty} পয়েন্ট কাটা হবে।`
            : `Each wrong answer costs −${penalty} points for you.`,
        tiers,
    };
}

/** One-line penalty hint for the hourly quiz UI (null = hide). */
export function getHourlyStakesUi(lifetimePoints, language = 'en') {
    const penalty = getPenaltyPerWrongForLifetime(lifetimePoints);
    if (!penalty) {
        return { penalty: 0, quizHint: null };
    }
    const bn = language === 'bn';
    return {
        penalty,
        quizHint: bn ? `ভুলে −${penalty}` : `−${penalty} / wrong`,
    };
}
