import { supabase } from '../supabaseClient';
import { filterCoreCompletedLessonIds } from './trainingLessonIds';
import {
    readLocalGateState,
    isWithinReadingGateWindow,
    pickLatestActivityAt,
    READING_GATE_MS,
} from './readingGateStorage';
import { getReviewAssignment } from './readingReviewCycle';

const CORE_PROGRAM_LAST_CHAPTER = 9;
const DEFAULT_CORE_CHAPTER_COUNTS = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 11, 7: 10, 8: 10, 9: 10 };

function getChapterLessonCount(chapterNum, trainingChapters) {
    const chap = Array.isArray(trainingChapters)
        ? trainingChapters.find((c) => c.number === chapterNum)
        : null;
    if (chap && Number(chap.count) > 0) return Number(chap.count);
    return DEFAULT_CORE_CHAPTER_COUNTS[chapterNum] || 0;
}

function sumCoreLessonTotal(trainingChapters) {
    let sum = 0;
    for (let n = 1; n <= CORE_PROGRAM_LAST_CHAPTER; n += 1) {
        sum += getChapterLessonCount(n, trainingChapters);
    }
    return sum;
}

function countCoreLessonsCompleted(completedLessons) {
    return filterCoreCompletedLessonIds(
        Array.isArray(completedLessons) ? completedLessons : []
    ).filter((id) => {
        const m = String(id).match(/^(\d+)\.(\d+)$/);
        if (!m) return false;
        const ch = parseInt(m[1], 10);
        return ch >= 1 && ch <= CORE_PROGRAM_LAST_CHAPTER;
    }).length;
}

/**
 * @returns {string | null} Next sequential core lesson id e.g. "2.4"
 */
export function findNextSequentialLessonId(completedLessons, trainingChapters) {
    const done = new Set(
        filterCoreCompletedLessonIds(Array.isArray(completedLessons) ? completedLessons : [])
    );

    for (let ch = 1; ch <= CORE_PROGRAM_LAST_CHAPTER; ch += 1) {
        const count = getChapterLessonCount(ch, trainingChapters);
        for (let n = 1; n <= count; n += 1) {
            const id = `${ch}.${n}`;
            if (!done.has(id)) return id;
        }
    }
    return null;
}

function hasCompletedAllCoreLessons(completedLessons, trainingChapters) {
    const total = sumCoreLessonTotal(trainingChapters);
    if (total <= 0) return false;
    return countCoreLessonsCompleted(completedLessons) >= total;
}

/** DB gate clock: app + backfill_quiz_attempts only (backfill_profile excluded). */
async function fetchLatestHabitActivity(userId) {
    try {
        const { data, error } = await supabase.rpc('get_latest_reading_habit_at', {
            p_user_id: userId,
        });

        if (error) return { ok: false, at: null };
        return { ok: true, at: data ?? null };
    } catch {
        return { ok: false, at: null };
    }
}

/**
 * @returns {Promise<{
 *   allowed: boolean,
 *   mode?: 'next' | 'review',
 *   lessonId?: string,
 *   reviewIndex?: number,
 *   reviewTotal?: number,
 *   lastActivityAt?: string | null,
 *   usedLocalFallback?: boolean,
 *   failOpen?: boolean,
 * }>}
 */
export async function checkReadingGate({ userId, completedLessons, trainingChapters = null }) {
    if (!userId) {
        return { allowed: true };
    }

    const local = readLocalGateState(userId);
    const { ok: dbOk, at: dbAt } = await fetchLatestHabitActivity(userId);
    const lastAt = pickLatestActivityAt(dbAt, local?.lastActivityAt);

    if (isWithinReadingGateWindow(lastAt)) {
        return { allowed: true, lastActivityAt: lastAt };
    }

    if (!dbOk && local?.lastActivityAt && isWithinReadingGateWindow(local.lastActivityAt)) {
        return { allowed: true, lastActivityAt: local.lastActivityAt, usedLocalFallback: true };
    }

    if (!dbOk && !local?.lastActivityAt) {
        return { allowed: true, failOpen: true };
    }

    const allComplete = hasCompletedAllCoreLessons(completedLessons, trainingChapters);

    if (allComplete) {
        const review = getReviewAssignment(userId, completedLessons);
        if (!review) {
            return { allowed: true, failOpen: true };
        }
        return {
            allowed: false,
            mode: 'review',
            lessonId: review.lessonId,
            reviewIndex: review.index,
            reviewTotal: review.total,
            lastActivityAt: lastAt,
        };
    }

    const nextId = findNextSequentialLessonId(completedLessons, trainingChapters);
    if (!nextId) {
        return { allowed: true, failOpen: true };
    }

    return {
        allowed: false,
        mode: 'next',
        lessonId: nextId,
        lastActivityAt: lastAt,
    };
}

export function formatGateHoursRemaining(lastActivityAt) {
    if (!lastActivityAt) return null;
    const elapsed = Date.now() - new Date(lastActivityAt).getTime();
    const remain = READING_GATE_MS - elapsed;
    if (remain <= 0) return 0;
    return Math.ceil(remain / (60 * 60 * 1000));
}
