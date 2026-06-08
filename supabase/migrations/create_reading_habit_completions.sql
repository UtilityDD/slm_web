-- ============================================================
-- Reading habit ledger (separate from scoring / quiz_attempts)
-- Purpose: track WHEN each core lesson was completed.
-- Does NOT modify profiles, quiz_attempts, RPCs, or triggers.
-- ============================================================

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

COMMENT ON COLUMN public.reading_habit_completions.completed_at IS
    'When the lesson was completed. Exact for app/backfill_quiz_attempts; approximate for backfill_profile.';

COMMENT ON COLUMN public.reading_habit_completions.source IS
    'app = live app log; backfill_quiz_attempts = copied from quiz_attempts; backfill_profile = estimated from profiles.completed_lessons.';

CREATE INDEX IF NOT EXISTS reading_habit_completions_user_completed_at_idx
    ON public.reading_habit_completions (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS reading_habit_completions_completed_at_idx
    ON public.reading_habit_completions (completed_at DESC);

ALTER TABLE public.reading_habit_completions ENABLE ROW LEVEL SECURITY;

-- Users read their own habit history
DROP POLICY IF EXISTS "Users can view own reading habits" ON public.reading_habit_completions;
CREATE POLICY "Users can view own reading habits"
    ON public.reading_habit_completions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can read all (for reports)
DROP POLICY IF EXISTS "Admins can view all reading habits" ON public.reading_habit_completions;
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

-- Users insert only their own rows (app will use this later)
DROP POLICY IF EXISTS "Users can insert own reading habits" ON public.reading_habit_completions;
CREATE POLICY "Users can insert own reading habits"
    ON public.reading_habit_completions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.reading_habit_completions TO authenticated;
GRANT ALL ON public.reading_habit_completions TO service_role;
