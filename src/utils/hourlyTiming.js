/**
 * Per-set (5-question pack) green timer for hourly quizzes.
 * Full marks inside green window; after that pack score is halved (integer).
 * Green seconds from recent accuracy (DB-backed plan), with lifetime fallback.
 */

const QUESTIONS_PER_PACK = 5;
export const HOURLY_POINTS_PER_QUESTION = 10;

/** Green full-mark window (seconds) from recent accuracy. */
export function greenSecondsFromAccuracy(accuracy, sampleSize = 0) {
    if (!Number.isFinite(accuracy) || sampleSize < 5) return null;
    if (accuracy >= 0.95) return 75;
    if (accuracy >= 0.90) return 90;
    if (accuracy >= 0.80) return 120;
    return 150;
}

/** Fallback when history is thin — based on lifetime points. */
export function greenSecondsFromLifetime(lifetimePoints) {
    const pts = Number(lifetimePoints) || 0;
    if (pts >= 50000) return 90;
    if (pts >= 30000) return 100;
    if (pts >= 10000) return 120;
    return 150;
}

export function resolveGreenSeconds({ accuracy = null, sampleSize = 0, lifetimePoints = 0 } = {}) {
    return (
        greenSecondsFromAccuracy(accuracy, sampleSize)
        ?? greenSecondsFromLifetime(lifetimePoints)
    );
}

/**
 * Estimate accuracy from hourly attempt rows (score is 10 pts per correct, max 50/set).
 * Multi-pack attempts can score >50 — treat each row as up to ceil(score/50) packs of 5.
 */
export function estimateAccuracyFromAttempts(attempts) {
    const rows = Array.isArray(attempts) ? attempts : [];
    let correct = 0;
    let possible = 0;
    for (const row of rows) {
        const score = Math.max(0, Number(row?.score) || 0);
        const packs = Math.max(1, Math.ceil(score / 50) || 1);
        const maxRaw = packs * 50;
        const capped = Math.min(score, maxRaw);
        correct += Math.round(capped / HOURLY_POINTS_PER_QUESTION);
        possible += packs * QUESTIONS_PER_PACK;
    }
    if (possible <= 0) {
        return { accuracy: null, sampleSize: 0, correct: 0, possible: 0 };
    }
    return {
        accuracy: correct / possible,
        sampleSize: rows.length,
        correct,
        possible,
    };
}

export function packIndexForQuestion(questionIndex) {
    return Math.floor(Math.max(0, Number(questionIndex) || 0) / QUESTIONS_PER_PACK);
}

export function isPackOnTime(packStartedAtMs, greenSeconds, endedAtMs = Date.now()) {
    const start = Number(packStartedAtMs);
    const green = Number(greenSeconds);
    if (!Number.isFinite(start) || !Number.isFinite(green) || green <= 0) return true;
    const elapsedSec = (Number(endedAtMs) - start) / 1000;
    return elapsedSec <= green;
}

/** Integer half when late: floor(raw/2). */
export function applyPackTimeScore(rawPoints, onTime) {
    const raw = Math.max(0, Math.round(Number(rawPoints) || 0));
    if (onTime) return raw;
    return Math.floor(raw / 2);
}

/**
 * Score all packs for a flat question list.
 * @param {object[]} questions
 * @param {Record<string, number>} answers
 * @param {boolean[]} packOnTimeFlags length = pack count
 */
export function scoreQuestionsWithPackTimers(questions, answers, packOnTimeFlags) {
    const list = Array.isArray(questions) ? questions : [];
    const flags = Array.isArray(packOnTimeFlags) ? packOnTimeFlags : [];
    const packCount = Math.max(1, Math.ceil(list.length / QUESTIONS_PER_PACK));

    let correct = 0;
    let wrong = 0;
    let timedScore = 0;
    let fullRaw = 0;
    const packSummaries = [];

    for (let p = 0; p < packCount; p += 1) {
        const slice = list.slice(p * QUESTIONS_PER_PACK, (p + 1) * QUESTIONS_PER_PACK);
        let packCorrect = 0;
        slice.forEach((q) => {
            const id = String(q?.id);
            const ans = answers?.[id] ?? answers?.[q?.id];
            if (ans === undefined) {
                wrong += 1;
                return;
            }
            if (Number(ans) === Number(q.correct_option_index)) {
                packCorrect += 1;
                correct += 1;
            } else {
                wrong += 1;
            }
        });
        const raw = packCorrect * HOURLY_POINTS_PER_QUESTION;
        const onTime = flags[p] !== false; // default on-time if flag missing
        const awarded = applyPackTimeScore(raw, onTime);
        fullRaw += raw;
        timedScore += awarded;
        packSummaries.push({ pack: p + 1, correct: packCorrect, raw, onTime, awarded });
    }

    return {
        correct,
        wrong,
        fullRaw,
        timedScore,
        packSummaries,
        latePacks: packSummaries.filter((p) => !p.onTime).length,
    };
}

export function formatTimerMmSs(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

export function getPackTimerCopy(language, { remainingSec, onTime, greenSeconds }) {
    void language;
    void greenSeconds;
    if (onTime) {
        return {
            badge: formatTimerMmSs(remainingSec),
            pointsMark: '★',
            ariaLabel: `Full points · ${formatTimerMmSs(remainingSec)} left`,
            tone: 'green',
        };
    }
    return {
        badge: formatTimerMmSs(Math.max(0, remainingSec || 0)),
        pointsMark: '½',
        ariaLabel: 'Half points for this set',
        tone: 'amber',
    };
}
