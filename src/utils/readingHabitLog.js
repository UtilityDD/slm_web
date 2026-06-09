import { supabase } from '../supabaseClient';
import { writeLocalGateActivity } from './readingGateStorage';
import { advanceReviewCycle } from './readingReviewCycle';

const CORE_LESSON_ID = /^\d+\.\d+$/;

/**
 * Fire-and-forget log to reading_habit_completions (habit tracking only).
 * Does not affect scoring, RPCs, or lesson unlock logic.
 */
export function logReadingHabitCompletion(userId, lessonId) {
    if (!userId || !lessonId) return;
    const id = String(lessonId).trim();
    if (!CORE_LESSON_ID.test(id)) return;

    writeLocalGateActivity(userId, id, 'app');

    void (async () => {
        try {
            const { data, error } = await supabase.rpc('log_reading_habit_completion', {
                p_user_id: userId,
                p_lesson_id: id,
                p_kind: 'app',
            });
            if (error) {
                console.warn('[reading_habit] rpc failed:', error.message);
                return;
            }
            if (data && data.success === false) {
                console.warn('[reading_habit] rpc failed:', data.error || 'unknown');
            }
        } catch (err) {
            console.warn('[reading_habit] rpc failed:', err);
        }
    })();
}

/**
 * Graduate review — refreshes 48h gate via local storage; best-effort habit row insert.
 * No points RPC; does not change lesson unlock or scoring.
 */
export function logReadingHabitReview(userId, lessonId) {
    if (!userId || !lessonId) return;
    const id = String(lessonId).trim();
    if (!CORE_LESSON_ID.test(id)) return;

    writeLocalGateActivity(userId, id, 'review');
    advanceReviewCycle(userId, id);

    void (async () => {
        try {
            const { data, error } = await supabase.rpc('log_reading_habit_completion', {
                p_user_id: userId,
                p_lesson_id: id,
                p_kind: 'review',
            });
            if (error) {
                console.warn('[reading_habit] review rpc failed:', error.message);
                return;
            }
            if (data && data.success === false) {
                console.warn('[reading_habit] review rpc failed:', data.error || 'unknown');
            }
        } catch (err) {
            console.warn('[reading_habit] review rpc failed:', err);
        }
    })();
}