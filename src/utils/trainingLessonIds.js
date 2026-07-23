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
