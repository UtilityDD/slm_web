import {
    CORE_LESSON_MONTHLY_BONUS_POINTS,
    filterCoreCompletedLessonIds,
    isCoreLessonDayStampedBonusQuizId,
    isCoreLessonLegacyBonusQuizId,
    lessonIdFromCoreLessonBonusQuizId,
} from './trainingLessonIds';

/**
 * Display reading for profile + all-time board.
 * First-time unique core lessons × 20, plus later day-stamped re-reads and Life Skill awards.
 * Never below the cached profiles.reading_points value (legacy backfill can exceed attempt sums).
 */
export function cumulativeReadingPointsFromLedger({
    completedLessons,
    profileReadingPoints = 0,
    attempts = [],
} = {}) {
    const profileLessons = new Set(filterCoreCompletedLessonIds(completedLessons));
    const byLesson = new Map();
    let lifeScore = 0;

    for (const row of attempts || []) {
        const quizId = String(row.quiz_id || '');
        const score = Number(row.score) || 0;
        if (quizId.startsWith('life_skill_bonus')) {
            lifeScore += score;
            continue;
        }
        const lid = lessonIdFromCoreLessonBonusQuizId(quizId);
        if (!lid) continue;
        if (!byLesson.has(lid)) byLesson.set(lid, { legacy: 0, stamped: 0 });
        const g = byLesson.get(lid);
        if (isCoreLessonLegacyBonusQuizId(quizId)) g.legacy += 1;
        else if (isCoreLessonDayStampedBonusQuizId(quizId)) g.stamped += 1;
    }

    const uniqueLessons = new Set(profileLessons);
    for (const lid of byLesson.keys()) uniqueLessons.add(lid);

    let extraStamped = 0;
    for (const [lid, g] of byLesson) {
        const hasFirstCredit = profileLessons.has(lid) || g.legacy > 0;
        if (hasFirstCredit) extraStamped += g.stamped;
    }

    const firstTime = uniqueLessons.size * CORE_LESSON_MONTHLY_BONUS_POINTS;
    const computed = firstTime + extraStamped * CORE_LESSON_MONTHLY_BONUS_POINTS + lifeScore;
    return Math.max(Number(profileReadingPoints) || 0, computed);
}

export function applyCumulativeReadingToRows(rows, attemptsByUser) {
    return (rows || []).map((row) => {
        const uid = row.user_id || row.id;
        return {
            ...row,
            reading_points: cumulativeReadingPointsFromLedger({
                completedLessons: row.completed_lessons,
                profileReadingPoints: row.reading_points,
                attempts: attemptsByUser?.get(uid) || [],
            }),
        };
    });
}
