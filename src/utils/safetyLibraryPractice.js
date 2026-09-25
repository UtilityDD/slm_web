import { storageUtils } from './storageUtils.js';
import {
    IDENTIFY_CHART_MIX_RATE,
    buildIdentifyChartQuestion,
    isIdentifyChartReady,
} from './identifyChartQuiz.js';

const SCORE_KEY = 'slm_identify_practice_v1';
export const IDENTIFY_PRACTICE_QUESTION_COUNT = 10;
export const IDENTIFY_PRACTICE_CHOICE_COUNT = 4;
export const IDENTIFY_PRACTICE_MODES = ['name', 'grid', 'clue', 'odd', 'which'];
export const IDENTIFY_ODD_FAMILIES = ['PPE', 'Tools', 'Insulators'];

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

/** Bangla/English ask line for clue rounds — name PPE/Tools/Insulators; generic for others. */
export function practiceClueAsk(category, language = 'bn') {
    const named = {
        PPE: { bn: 'পিপিই', en: 'PPE' },
        Tools: { bn: 'টুল বা মেশিন', en: 'tool or machine' },
        Insulators: { bn: 'ইনসুলেটর', en: 'insulator' },
    };
    const label = named[category];
    if (language === 'en') {
        if (label) return `Which ${label.en} does the description below match?`;
        return 'Which item does the description below match?';
    }
    if (label) return `নিচের বর্ণনা কোন ${label.bn}কে চেনা যায়?`;
    return 'নিচের বর্ণনা কোন আইটেমকে চেনা যায়?';
}

/** Prefer function_bn, else guide_bn — used for “read the clue, pick the photo” rounds. */
export function practiceClueText(item) {
    const about = typeof item?.function_bn === 'string' ? item.function_bn.trim() : '';
    if (about.length >= 10) return about;
    const guide = typeof item?.guide_bn === 'string' ? item.guide_bn.trim() : '';
    if (guide.length >= 10) return guide;
    return '';
}

export function isIdentifyPracticeClueItem(item) {
    return isIdentifyPracticeItem(item) && Boolean(practiceClueText(item));
}

function familyLabel(family, language = 'bn') {
    const named = {
        PPE: { bn: 'PPE', en: 'PPE' },
        Tools: { bn: 'টুল বা মেশিন', en: 'a tool or machine' },
        Insulators: { bn: 'ইনসুলেটর', en: 'an insulator' },
    };
    return named[family]?.[language === 'en' ? 'en' : 'bn'] || (language === 'en' ? 'this group' : 'এই দল');
}

/** “Which photo is not PPE / a tool / an insulator?” */
export function practiceOddAsk(family, language = 'bn') {
    const label = familyLabel(family, language);
    if (language === 'en') return `Which one is not ${label}?`;
    return `কোনটা ${label} নয়?`;
}

export function isIdentifyOddReady(items) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    return IDENTIFY_ODD_FAMILIES.some((family) => {
        const mates = pool.filter((row) => row.category === family).length;
        const others = pool.filter((row) => row.category !== family).length;
        return mates >= 3 && others >= 1;
    });
}

/** “Which photo is PPE / a tool / an insulator?” */
export function practiceWhichAsk(family, language = 'bn') {
    const label = familyLabel(family, language);
    if (language === 'en') return `Which one is ${label}?`;
    return `কোনটা ${label}?`;
}

export function isIdentifyWhichReady(items) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    return IDENTIFY_ODD_FAMILIES.some((family) => {
        const mates = pool.filter((row) => row.category === family).length;
        const others = pool.filter((row) => row.category !== family).length;
        return mates >= 1 && others >= 3;
    });
}

export function firstPracticeImage(item) {
    return (item?.images || []).find((src) => typeof src === 'string' && src.trim()) || '';
}

function clampScore(n) {
    const v = Math.round(Number(n) || 0);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
}

/** Cap leftover-tab waits so one pause cannot wreck the average. */
function clampResponseMs(n) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v) || v < 0) return null;
    return Math.min(v, 5 * 60 * 1000);
}

export function formatIdentifyAvgResponse(ms, language = 'bn') {
    const n = Math.round(Number(ms));
    if (!Number.isFinite(n) || n < 0) return '';
    const sec = n / 1000;
    const label = sec < 10 ? sec.toFixed(1) : String(Math.round(sec));
    return language === 'en' ? `${label}s` : `${label} সে`;
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
        const lifeTimed = clampScore(parsed?.lifeTimed);
        const lifeTimeMs = clampScore(parsed?.lifeTimeMs);
        const avgResponseMs = lifeTimed > 0
            ? Math.round(lifeTimeMs / lifeTimed)
            : clampScore(parsed?.avgResponseMs);
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
            lifeTimed,
            lifeTimeMs,
            avgResponseMs,
        };
    } catch {
        return null;
    }
}

export function recordIdentifyPracticeAnswer(isCorrect, responseMs) {
    const prev = readIdentifyPracticeScore();
    const lifeTotal = (prev?.lifeTotal ?? 0) + 1;
    const lifeCorrect = (prev?.lifeCorrect ?? 0) + (isCorrect ? 1 : 0);
    const lifePercent = Math.round((lifeCorrect / lifeTotal) * 100);
    const beatsBest = lifePercent > (prev?.bestPercent ?? -1)
        || (lifePercent === (prev?.bestPercent ?? -1) && lifeTotal >= (prev?.bestTotal ?? 0));
    const timedMs = clampResponseMs(responseMs);
    const lifeTimeMs = (prev?.lifeTimeMs ?? 0) + (timedMs ?? 0);
    const lifeTimed = (prev?.lifeTimed ?? 0) + (timedMs != null ? 1 : 0);
    const avgResponseMs = lifeTimed > 0 ? Math.round(lifeTimeMs / lifeTimed) : 0;
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
        lifeTimeMs,
        lifeTimed,
        avgResponseMs,
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
        category: item.category || '',
        image: firstPracticeImage(item),
        clue_bn: practiceClueText(item),
        choices,
    };
}

function pickRandomMode(except) {
    const options = IDENTIFY_PRACTICE_MODES.filter((m) => m !== except);
    return options[Math.floor(Math.random() * options.length)] || 'name';
}

/**
 * Mix name / grid / clue / odd / which. Never allow the same type three times in a row
 * (if the last two match, force a different mode). Chart-table ~1 in 5, never twice in a row.
 */
export function nextIdentifyPracticeMode(recentModes, items) {
    const last = recentModes?.[recentModes.length - 1];
    const prev = recentModes?.[recentModes.length - 2];
    const clueReady = (items || []).filter(isIdentifyPracticeClueItem).length >= 2;

    let mode;
    if (last && last === prev) {
        mode = pickRandomMode(last);
    } else {
        mode = IDENTIFY_PRACTICE_MODES[Math.floor(Math.random() * IDENTIFY_PRACTICE_MODES.length)];
    }

    if (mode === 'clue' && !clueReady) {
        mode = last === 'grid' ? 'name' : 'grid';
    }
    if (mode === 'odd' && !isIdentifyOddReady(items)) {
        mode = last === 'grid' ? 'name' : 'grid';
    }
    if (mode === 'which' && !isIdentifyWhichReady(items)) {
        mode = last === 'grid' ? 'name' : 'grid';
    }
    if (isIdentifyChartReady() && last !== 'chart' && Math.random() < IDENTIFY_CHART_MIX_RATE) {
        return 'chart';
    }
    return mode;
}

function questionFromWhichFamily(items, avoidItemId) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    const viable = IDENTIFY_ODD_FAMILIES.filter((family) => {
        const mates = pool.filter((row) => row.category === family).length;
        const others = pool.filter((row) => row.category !== family).length;
        return mates >= 1 && others >= 3;
    });
    if (!viable.length) return null;

    const family = viable[Math.floor(Math.random() * viable.length)];
    let mates = pool.filter((row) => row.category === family);
    if (avoidItemId) {
        const without = mates.filter((row) => row.id !== avoidItemId);
        if (without.length) mates = without;
    }
    const pick = mates[Math.floor(Math.random() * mates.length)];
    const trio = shuffle(pool.filter((row) => row.category !== family && row.id !== pick.id)).slice(0, 3);
    if (!pick || trio.length < 3) return null;

    const choices = shuffle([pick, ...trio]).map((row) => ({
        id: row.id,
        name_bn: row.name_bn,
        image: firstPracticeImage(row),
    }));
    return {
        itemId: pick.id,
        name_bn: pick.name_bn,
        category: family,
        whichFamily: family,
        image: firstPracticeImage(pick),
        clue_bn: '',
        choices,
    };
}

function questionFromOddOut(items, avoidItemId) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    const viable = IDENTIFY_ODD_FAMILIES.filter((family) => {
        const mates = pool.filter((row) => row.category === family).length;
        const others = pool.filter((row) => row.category !== family).length;
        return mates >= 3 && others >= 1;
    });
    if (!viable.length) return null;

    const family = viable[Math.floor(Math.random() * viable.length)];
    const mates = shuffle(pool.filter((row) => row.category === family));
    let outsiders = pool.filter((row) => row.category !== family);
    if (avoidItemId) {
        const without = outsiders.filter((row) => row.id !== avoidItemId);
        if (without.length) outsiders = without;
    }
    const odd = outsiders[Math.floor(Math.random() * outsiders.length)];
    const trio = mates.filter((row) => row.id !== odd.id).slice(0, 3);
    if (!odd || trio.length < 3) return null;

    const choices = shuffle([odd, ...trio]).map((row) => ({
        id: row.id,
        name_bn: row.name_bn,
        image: firstPracticeImage(row),
    }));
    return {
        itemId: odd.id,
        name_bn: odd.name_bn,
        category: family,
        oddFamily: family,
        image: firstPracticeImage(odd),
        clue_bn: '',
        choices,
    };
}

export function buildIdentifyPracticeQuestion(items, avoidItemId, mode = 'name') {
    if (mode === 'chart') {
        const chartQ = buildIdentifyChartQuestion(avoidItemId);
        if (chartQ) return chartQ;
    }

    const pool = (items || []).filter(isIdentifyPracticeItem);
    if (pool.length < 2) return null;

    if (mode === 'odd') {
        return questionFromOddOut(items, avoidItemId) || questionFromItem(
            pool[Math.floor(Math.random() * pool.length)],
            pool
        );
    }

    if (mode === 'which') {
        return questionFromWhichFamily(items, avoidItemId) || questionFromItem(
            pool[Math.floor(Math.random() * pool.length)],
            pool
        );
    }

    let source = pool;
    if (mode === 'clue') {
        const withClue = pool.filter(isIdentifyPracticeClueItem);
        if (withClue.length >= 2) source = withClue;
    }

    const candidates = avoidItemId
        ? source.filter((row) => row.id !== avoidItemId)
        : source;
    const pickFrom = candidates.length ? candidates : source;
    const item = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    return questionFromItem(item, pool);
}

export function buildIdentifyPracticeRound(items) {
    const pool = (items || []).filter(isIdentifyPracticeItem);
    if (pool.length < 2) return [];

    const count = Math.min(IDENTIFY_PRACTICE_QUESTION_COUNT, pool.length);
    return shuffle(pool).slice(0, count).map((item) => questionFromItem(item, pool));
}
