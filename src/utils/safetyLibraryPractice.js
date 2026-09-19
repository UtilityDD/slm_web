import { storageUtils } from './storageUtils.js';

const SCORE_KEY = 'slm_identify_practice_v1';
export const IDENTIFY_PRACTICE_QUESTION_COUNT = 10;
export const IDENTIFY_PRACTICE_CHOICE_COUNT = 4;

function shuffle(list) {
    const next = [...list];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

export function isIdentifyPracticeItem(item) {
    return Boolean(
        item
        && item.category
        && item.category !== 'Charts'
        && typeof item.name_bn === 'string'
        && item.name_bn.trim()
        && Array.isArray(item.images)
        && item.images.some((src) => typeof src === 'string' && src.trim())
    );
}

export function firstPracticeImage(item) {
    return (item?.images || []).find((src) => typeof src === 'string' && src.trim()) || '';
}

function clampScore(n) {
    const v = Math.round(Number(n) || 0);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
}

export function readIdentifyPracticeScore() {
    try {
        const raw = storageUtils.getItem(SCORE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const lastTotal = clampScore(parsed?.lastTotal);
        const lastCorrect = Math.min(clampScore(parsed?.lastCorrect), lastTotal || 0);
        const lastPercent = Number.isFinite(Number(parsed?.lastPercent))
            ? Math.max(0, Math.min(100, Math.round(Number(parsed.lastPercent))))
            : (lastTotal ? Math.round((lastCorrect / lastTotal) * 100) : 0);
        const lifeTotal = clampScore(parsed?.lifeTotal) || lastTotal;
        const lifeCorrect = Math.min(clampScore(parsed?.lifeCorrect) || lastCorrect, lifeTotal || 0);
        const lifePercent = lifeTotal ? Math.round((lifeCorrect / lifeTotal) * 100) : 0;
        const bestPercent = Math.max(
            0,
            Math.min(100, Math.round(Number(parsed?.bestPercent) || lastPercent || 0))
        );
        if (lastTotal < 1 && lifeTotal < 1) return null;
        return {
            lastPercent,
            lastCorrect,
            lastTotal,
            bestPercent,
            bestCorrect: Math.min(clampScore(parsed?.bestCorrect) || lastCorrect, clampScore(parsed?.bestTotal) || lastTotal || lastCorrect),
            bestTotal: clampScore(parsed?.bestTotal) || lastTotal,
            lifeCorrect,
            lifeTotal,
            lifePercent,
        };
    } catch {
        return null;
    }
}

export function recordIdentifyPracticeAnswer(isCorrect) {
    const prev = readIdentifyPracticeScore();
    const lifeTotal = (prev?.lifeTotal ?? 0) + 1;
    const lifeCorrect = (prev?.lifeCorrect ?? 0) + (isCorrect ? 1 : 0);
    const lifePercent = Math.round((lifeCorrect / lifeTotal) * 100);
    const beatsBest = lifePercent > (prev?.bestPercent ?? -1)
        || (lifePercent === (prev?.bestPercent ?? -1) && lifeTotal >= (prev?.bestTotal ?? 0));
    const record = {
        lastPercent: lifePercent,
        lastCorrect: lifeCorrect,
        lastTotal: lifeTotal,
        bestPercent: Math.max(prev?.bestPercent ?? 0, lifePercent),
        bestCorrect: beatsBest ? lifeCorrect : (prev?.bestCorrect ?? lifeCorrect),
        bestTotal: beatsBest ? lifeTotal : (prev?.bestTotal ?? lifeTotal),
        lifeCorrect,
        lifeTotal,
        lifePercent,
        updatedAt: new Date().toISOString(),
    };
    storageUtils.setItem(SCORE_KEY, JSON.stringify(record));
    return record;
}

function questionFromItem(item, pool) {
    const distractors = shuffle(pool.filter((row) => row.id !== item.id))
        .slice(0, IDENTIFY_PRACTICE_CHOICE_COUNT - 1);
    const choices = shuffle([item, ...distractors]).map((row) => ({
        id: row.id,
        name_bn: row.name_bn,
        image: firstPracticeImage(row),
    }));
    return {
        itemId: item.id,
        name_bn: item.name_bn,
        image: firstPracticeImage(item),
        choices,
    };
}

export function nextIdentifyPracticeMode(recentModes) {
    const last = recentModes?.[recentModes.length - 1];
    const prev = recentModes?.[recentModes.length - 2];
    if (last && last === prev) {
        return last === 'name' ? 'grid' : 'name';
    }
    return Math.random() < 0.5 ? 'name' : 'grid';
}

export function buildIdentifyPracticeQuestion(items, avoidItemId) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    if (pool.length < 2) return null;
    const candidates = avoidItemId
        ? pool.filter((row) => row.id !== avoidItemId)
        : pool;
    const pickFrom = candidates.length ? candidates : pool;
    const item = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    return questionFromItem(item, pool);
}

export function buildIdentifyPracticeRound(items) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    if (pool.length < 2) return [];

    const count = Math.min(IDENTIFY_PRACTICE_QUESTION_COUNT, pool.length);
    return shuffle(pool).slice(0, count).map((item) => questionFromItem(item, pool));
}
