/**
 * Supplementary (Life Skills) modules use ids like `supp_10_1`. They must not be
 * stored in profiles.completed_lessons — only local supplementary storage
 * (see supplementaryProgressStorage.js). Quiz points use life_skill_bonus_* via
 * award_training_points, with a rolling 30-day cooldown per module.
 */
export function isSupplementaryProgressLessonId(id) {
    return typeof id === 'string' && id.trim().toLowerCase().startsWith('supp_');
}

/** Rolling cooldown between Life Skill point awards for the same module. */
export const LIFE_SKILL_SCORE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** Points awarded when Life Skill quiz + listen gate succeed (once per cooldown). */
export const LIFE_SKILL_MONTHLY_BONUS_POINTS = 20;

/**
 * Unique quiz_id for one Life Skill award claim.
 * Day-stamped so a later claim (after cooldown) gets a new id.
 * Example: life_skill_bonus_supp_10_1_2026_07_23
 *
 * @param {string} moduleId e.g. supp_10_1
 * @param {Date} [date]
 * @returns {string}
 */
export function buildLifeSkillBonusQuizId(moduleId, date = new Date()) {
    const id = typeof moduleId === 'string' ? moduleId.trim() : '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `life_skill_bonus_${id}_${y}_${m}_${d}`;
}

/** @deprecated Use buildLifeSkillBonusQuizId — kept for older call sites. */
export function buildLifeSkillMonthlyQuizId(moduleId, date = new Date()) {
    return buildLifeSkillBonusQuizId(moduleId, date);
}

/**
 * @param {string} quizId life_skill_bonus_supp_10_1_2026_07_23 or legacy …_2026_07
 * @returns {string|null}
 */
export function moduleIdFromLifeSkillBonusQuizId(quizId) {
    const s = String(quizId || '');
    if (!s.startsWith('life_skill_bonus_')) return null;
    const rest = s.slice('life_skill_bonus_'.length);
    let m = rest.match(/^(.+)_(\d{4})_(\d{2})_(\d{2})$/);
    if (m) return m[1];
    m = rest.match(/^(.+)_(\d{4})_(\d{2})$/);
    if (m) return m[1];
    return null;
}

/** @deprecated Use moduleIdFromLifeSkillBonusQuizId */
export function moduleIdFromLifeSkillMonthlyQuizId(quizId) {
    return moduleIdFromLifeSkillBonusQuizId(quizId);
}

/**
 * Whole days left in the 30-day cooldown after an award.
 * @param {string|Date|number} awardedAt
 * @param {Date} [now]
 * @returns {number} 0 when eligible again
 */
export function getLifeSkillScoreCooldownDaysLeft(awardedAt, now = new Date()) {
    if (!awardedAt) return 0;
    const awardedMs = new Date(awardedAt).getTime();
    if (!Number.isFinite(awardedMs)) return 0;
    const unlockAt = awardedMs + LIFE_SKILL_SCORE_COOLDOWN_MS;
    const msLeft = unlockAt - now.getTime();
    if (msLeft <= 0) return 0;
    return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

/**
 * Latest award timestamp per module from quiz_attempt rows (cooldown still active only).
 * @param {Array<{ quiz_id?: string, created_at?: string }>} attempts
 * @param {Date} [now]
 * @returns {Map<string, string>} moduleId → ISO created_at of latest award in cooldown
 */
export function buildLifeSkillActiveCooldowns(attempts, now = new Date()) {
    const latestByModule = new Map();
    for (const row of attempts || []) {
        const moduleId = moduleIdFromLifeSkillBonusQuizId(row.quiz_id);
        if (!moduleId || !row.created_at) continue;
        const prev = latestByModule.get(moduleId);
        if (!prev || new Date(row.created_at) > new Date(prev)) {
            latestByModule.set(moduleId, row.created_at);
        }
    }
    const active = new Map();
    for (const [moduleId, createdAt] of latestByModule) {
        if (getLifeSkillScoreCooldownDaysLeft(createdAt, now) > 0) {
            active.set(moduleId, createdAt);
        }
    }
    return active;
}

/**
 * Lifetime points earned per Life Skill module from life_skill_bonus_* attempts.
 * @param {Array<{ quiz_id?: string, score?: number }>} attempts
 * @returns {Map<string, number>}
 */
export function buildLifeSkillTotalsByModule(attempts) {
    const totals = new Map();
    for (const row of attempts || []) {
        const moduleId = moduleIdFromLifeSkillBonusQuizId(row.quiz_id);
        if (!moduleId) continue;
        const score = Number(row.score);
        if (!Number.isFinite(score) || score === 0) continue;
        totals.set(moduleId, (totals.get(moduleId) || 0) + score);
    }
    return totals;
}

/** Core safety-training lesson ids only (excludes supplementary). */
export function filterCoreCompletedLessonIds(ids) {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.filter(Boolean))].filter(
        (id) => typeof id === 'string' && !isSupplementaryProgressLessonId(id)
    );
}

/**
 * Core lesson ids inferred from quiz_attempts lesson_bonus_* rows (score > 0).
 * Used so My Progress stays in sync when profiles.completed_lessons is stale.
 */
export function coreLessonIdsFromBonusAttempts(attempts) {
    if (!Array.isArray(attempts) || attempts.length === 0) return [];
    const ids = attempts
        .filter((row) => String(row?.quiz_id || '').startsWith('lesson_bonus_') && Number(row?.score || 0) > 0)
        .map((row) => lessonIdFromCoreLessonBonusQuizId(row.quiz_id))
        .filter(Boolean);
    return filterCoreCompletedLessonIds(ids);
}

/** Union of profile completed_lessons + lesson_bonus attempt ids (core only). */
export function mergeCoreLessonProgressIds(completedLessons, attempts) {
    const fromProfile = filterCoreCompletedLessonIds(
        Array.isArray(completedLessons) ? completedLessons.filter(Boolean) : []
    );
    const fromAttempts = coreLessonIdsFromBonusAttempts(attempts);
    return [...new Set([...fromProfile, ...fromAttempts])];
}

/** Same rolling window as Life Skills — reused for core lesson re-claims. */
export const CORE_LESSON_SCORE_COOLDOWN_MS = LIFE_SKILL_SCORE_COOLDOWN_MS;

/** Points for a core lesson monthly re-claim (matches first-completion bonus). */
export const CORE_LESSON_MONTHLY_BONUS_POINTS = 20;

const CORE_LESSON_ID_RE = /^\d+\.\d+$/;

/**
 * First-time award id (unchanged legacy format).
 * @param {string} lessonId e.g. 1.1
 */
export function buildCoreLessonFirstBonusQuizId(lessonId) {
    const id = typeof lessonId === 'string' ? lessonId.trim() : '';
    return `lesson_bonus_${id}`;
}

/**
 * Day-stamped re-claim id so award_training_points can insert a new row after cooldown.
 * Example: lesson_bonus_1.1_2026_07_25
 *
 * @param {string} lessonId
 * @param {Date} [date]
 */
export function buildCoreLessonMonthlyBonusQuizId(lessonId, date = new Date()) {
    const id = typeof lessonId === 'string' ? lessonId.trim() : '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `lesson_bonus_${id}_${y}_${m}_${d}`;
}

/** @param {string} quizId */
export function isCoreLessonLegacyBonusQuizId(quizId) {
    return /^lesson_bonus_\d+\.\d+$/.test(String(quizId || ''));
}

/** @param {string} quizId */
export function isCoreLessonDayStampedBonusQuizId(quizId) {
    return /^lesson_bonus_\d+\.\d+_\d{4}_\d{2}_\d{2}$/.test(String(quizId || ''));
}

/**
 * Parse lesson id from lesson_bonus_1.1 or lesson_bonus_1.1_2026_07_25.
 * @param {string} quizId
 * @returns {string|null}
 */
export function lessonIdFromCoreLessonBonusQuizId(quizId) {
    const s = String(quizId || '');
    if (!s.startsWith('lesson_bonus_')) return null;
    const rest = s.slice('lesson_bonus_'.length);
    const stamped = rest.match(/^(\d+\.\d+)_\d{4}_\d{2}_\d{2}$/);
    if (stamped) return stamped[1];
    if (CORE_LESSON_ID_RE.test(rest)) return rest;
    return null;
}

/**
 * Effective cooldown anchor for a single attempt row.
 * Legacy pre-launch rows floor at launchIso (untrusted/backfilled timestamps).
 * Never anchors in the future (avoids "31 days" when launch is later today).
 *
 * @param {{ quiz_id?: string, created_at?: string }} row
 * @param {string} launchIso
 * @param {Date} [now]
 * @returns {string|null} ISO timestamp
 */
export function getCoreLessonEffectiveAwardAt(row, launchIso, now = new Date()) {
    if (!row?.created_at) return null;
    const quizId = String(row.quiz_id || '');
    if (isCoreLessonDayStampedBonusQuizId(quizId)) return row.created_at;

    const createdMs = new Date(row.created_at).getTime();
    if (!Number.isFinite(createdMs)) return null;

    if (isCoreLessonLegacyBonusQuizId(quizId) && launchIso) {
        const launchMs = new Date(launchIso).getTime();
        if (Number.isFinite(launchMs) && createdMs < launchMs) {
            const softStartMs = Math.min(launchMs, now.getTime());
            return new Date(softStartMs).toISOString();
        }
    }
    return row.created_at;
}

/** Whole days left — same math as Life Skills, capped at 30 for display sanity. */
export function getCoreLessonScoreCooldownDaysLeft(awardedAt, now = new Date()) {
    const days = getLifeSkillScoreCooldownDaysLeft(awardedAt, now);
    if (days <= 0) return 0;
    return Math.min(30, days);
}

/**
 * Latest effective award timestamp per core lesson (whether still in cooldown or not).
 * @param {Array<{ quiz_id?: string, created_at?: string }>} attempts
 * @param {string} launchIso
 * @returns {Map<string, string>} lessonId → ISO effective awarded-at
 */
export function buildCoreLessonLatestAwardByLesson(attempts, launchIso) {
    const latestByLesson = new Map();
    for (const row of attempts || []) {
        const lessonId = lessonIdFromCoreLessonBonusQuizId(row.quiz_id);
        if (!lessonId) continue;
        const effectiveAt = getCoreLessonEffectiveAwardAt(row, launchIso);
        if (!effectiveAt) continue;
        const prev = latestByLesson.get(lessonId);
        if (!prev || new Date(effectiveAt) > new Date(prev)) {
            latestByLesson.set(lessonId, effectiveAt);
        }
    }
    return latestByLesson;
}

/**
 * Lessons still inside the 30-day cooldown (effective award times).
 * @param {Array<{ quiz_id?: string, created_at?: string }>} attempts
 * @param {string} launchIso
 * @param {Date} [now]
 * @returns {Map<string, string>} lessonId → ISO effective awarded-at
 */
export function buildCoreLessonActiveCooldowns(attempts, launchIso, now = new Date()) {
    const latest = buildCoreLessonLatestAwardByLesson(attempts, launchIso);
    const active = new Map();
    for (const [lessonId, awardedAt] of latest) {
        if (getCoreLessonScoreCooldownDaysLeft(awardedAt, now) > 0) {
            active.set(lessonId, awardedAt);
        }
    }
    return active;
}
