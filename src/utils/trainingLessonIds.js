/**
 * Supplementary (Life Skills) modules use ids like `supp_10_1`. They must not earn
 * leaderboard reading points or be stored in profiles.completed_lessons — only local
 * supplementary storage (see supplementaryProgressStorage.js).
 */
export function isSupplementaryProgressLessonId(id) {
    return typeof id === 'string' && id.trim().toLowerCase().startsWith('supp_');
}

/** Core safety-training lesson ids only (excludes supplementary). */
export function filterCoreCompletedLessonIds(ids) {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.filter(Boolean))].filter(
        (id) => typeof id === 'string' && !isSupplementaryProgressLessonId(id)
    );
}
