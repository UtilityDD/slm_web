import { storageUtils } from './storageUtils';
import { filterCoreCompletedLessonIds } from './trainingLessonIds';

const CYCLE_KEY_PREFIX = 'slm_reading_review_cycle_v1_';

function cycleKey(userId) {
    return `${CYCLE_KEY_PREFIX}${userId}`;
}

function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h) || 1;
}

function seededShuffle(ids, seed) {
    const arr = [...ids];
    let state = hashSeed(String(seed));
    const rng = () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function readCycle(userId) {
    try {
        const raw = storageUtils.getItem(cycleKey(userId));
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || !Array.isArray(o.order)) return null;
        return {
            cycleSeed: typeof o.cycleSeed === 'number' ? o.cycleSeed : Date.now(),
            order: o.order.filter((id) => /^\d+\.\d+$/.test(String(id))),
            cursor: typeof o.cursor === 'number' && o.cursor >= 0 ? o.cursor : 0,
        };
    } catch {
        return null;
    }
}

function writeCycle(userId, cycle) {
    storageUtils.setItem(cycleKey(userId), JSON.stringify(cycle));
}

function normalizeCycle(userId, completedIds) {
    const sorted = [...completedIds].sort((a, b) => {
        const [ac, an] = a.split('.').map(Number);
        const [bc, bn] = b.split('.').map(Number);
        if (ac !== bc) return ac - bc;
        return an - bn;
    });

    let cycle = readCycle(userId);
    const set = new Set(sorted);

    if (!cycle || cycle.order.length === 0) {
        cycle = {
            cycleSeed: Date.now(),
            order: seededShuffle(sorted, `${userId}-${Date.now()}`),
            cursor: 0,
        };
        writeCycle(userId, cycle);
        return cycle;
    }

    let order = cycle.order.filter((id) => set.has(id));
    const missing = sorted.filter((id) => !order.includes(id));
    if (missing.length > 0 || order.length !== sorted.length) {
        order = seededShuffle(sorted, `${userId}-${cycle.cycleSeed}`);
        cycle = { cycleSeed: cycle.cycleSeed, order, cursor: 0 };
        writeCycle(userId, cycle);
        return cycle;
    }

    if (cycle.cursor >= order.length) {
        cycle = {
            cycleSeed: Date.now(),
            order: seededShuffle(sorted, `${userId}-${Date.now()}`),
            cursor: 0,
        };
        writeCycle(userId, cycle);
    }

    return cycle;
}

/**
 * @returns {{ lessonId: string, index: number, total: number } | null}
 */
export function getReviewAssignment(userId, completedLessons) {
    const completedIds = filterCoreCompletedLessonIds(
        Array.isArray(completedLessons) ? completedLessons : []
    );
    if (!userId || completedIds.length === 0) return null;

    const cycle = normalizeCycle(userId, completedIds);
    const lessonId = cycle.order[cycle.cursor];
    if (!lessonId) return null;

    return {
        lessonId,
        index: cycle.cursor + 1,
        total: cycle.order.length,
    };
}

export function advanceReviewCycle(userId, lessonId) {
    const cycle = readCycle(userId);
    if (!cycle || !lessonId) return;
    if (cycle.order[cycle.cursor] !== String(lessonId)) return;

    let nextCursor = cycle.cursor + 1;
    let nextSeed = cycle.cycleSeed;
    let nextOrder = cycle.order;

    if (nextCursor >= cycle.order.length) {
        nextSeed = Date.now();
        nextOrder = seededShuffle(cycle.order, `${userId}-${nextSeed}`);
        nextCursor = 0;
    }

    writeCycle(userId, {
        cycleSeed: nextSeed,
        order: nextOrder,
        cursor: nextCursor,
    });
}
