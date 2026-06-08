import { supabase } from '../supabaseClient';

const CORE_LESSON_ID = /^\d+\.\d+$/;

/**
 * Fire-and-forget log to reading_habit_completions (habit tracking only).
 * Does not affect scoring, RPCs, or lesson unlock logic.
 */
export function logReadingHabitCompletion(userId, lessonId) {
    if (!userId || !lessonId) return;
    const id = String(lessonId).trim();
    if (!CORE_LESSON_ID.test(id)) return;

    void (async () => {
        try {
            const { error } = await supabase.from('reading_habit_completions').insert({
                user_id: userId,
                lesson_id: id,
                completed_at: new Date().toISOString(),
                source: 'app',
            });
            if (error && error.code !== '23505') {
                console.warn('[reading_habit] insert failed:', error.message);
            }
        } catch (err) {
            console.warn('[reading_habit] insert failed:', err);
        }
    })();
}
