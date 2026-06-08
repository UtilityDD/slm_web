-- FIRST RUN ONLY — no DROP statements (avoids Supabase "destructive" warning)
-- Use this in SQL Editor the first time. If you need to re-apply policies later,
-- use create_reading_habit_completions.sql instead.

CREATE TABLE IF NOT EXISTS public.reading_habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    source TEXT NOT NULL DEFAULT 'app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT reading_habit_completions_lesson_id_check
        CHECK (lesson_id ~ '^\d+\.\d+$'),
    CONSTRAINT reading_habit_completions_source_check
        CHECK (source IN ('app', 'backfill_quiz_attempts', 'backfill_profile')),
    CONSTRAINT reading_habit_completions_user_lesson_unique
        UNIQUE (user_id, lesson_id)
);

COMMENT ON TABLE public.reading_habit_completions IS
    'Habit tracking only: one row per user per core lesson (e.g. 1.1). Not used for points or leaderboards.';

CREATE INDEX IF NOT EXISTS reading_habit_completions_user_completed_at_idx
    ON public.reading_habit_completions (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS reading_habit_completions_completed_at_idx
    ON public.reading_habit_completions (completed_at DESC);

ALTER TABLE public.reading_habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading habits"
    ON public.reading_habit_completions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reading habits"
    ON public.reading_habit_completions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND trim(lower(p.role::text)) = 'admin'
        )
    );

CREATE POLICY "Users can insert own reading habits"
    ON public.reading_habit_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.reading_habit_completions TO authenticated;
GRANT ALL ON public.reading_habit_completions TO service_role;
