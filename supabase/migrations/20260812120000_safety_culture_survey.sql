-- ============================================================
-- Safety culture survey (quarterly উচিত vs হয়)
-- Admin reports only; not linked to points / leaderboards.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.safety_culture_waves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_code TEXT NOT NULL UNIQUE,
    opens_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closes_at TIMESTAMPTZ,
    item_set_version TEXT NOT NULL DEFAULT 'v1',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.safety_culture_waves IS
    'Quarterly safety-culture survey waves. is_active + date window gates Home intercept.';

CREATE INDEX IF NOT EXISTS safety_culture_waves_active_opens_idx
    ON public.safety_culture_waves (is_active, opens_at DESC);

CREATE TABLE IF NOT EXISTS public.safety_culture_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_id UUID NOT NULL REFERENCES public.safety_culture_waves(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    answer_uchit TEXT NOT NULL,
    answer_hoy TEXT NOT NULL,
    item_set_version TEXT NOT NULL DEFAULT 'v1',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT safety_culture_responses_option_check
        CHECK (answer_uchit IN ('A', 'B', 'C') AND answer_hoy IN ('A', 'B', 'C')),
    CONSTRAINT safety_culture_responses_unique
        UNIQUE (wave_id, user_id, item_id)
);

COMMENT ON TABLE public.safety_culture_responses IS
    'Per-item উচিত/হয় answers for culture survey. Admin read for reports.';

CREATE INDEX IF NOT EXISTS safety_culture_responses_wave_idx
    ON public.safety_culture_responses (wave_id);

CREATE INDEX IF NOT EXISTS safety_culture_responses_user_wave_idx
    ON public.safety_culture_responses (user_id, wave_id);

CREATE TABLE IF NOT EXISTS public.safety_culture_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wave_id UUID NOT NULL REFERENCES public.safety_culture_waves(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    item_set_version TEXT NOT NULL DEFAULT 'v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT safety_culture_completions_unique UNIQUE (wave_id, user_id)
);

COMMENT ON TABLE public.safety_culture_completions IS
    'Fast Home-gate check: user finished a culture wave.';

CREATE INDEX IF NOT EXISTS safety_culture_completions_user_wave_idx
    ON public.safety_culture_completions (user_id, wave_id);

ALTER TABLE public.safety_culture_waves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_culture_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_culture_completions ENABLE ROW LEVEL SECURITY;

-- Waves: authenticated can read active/open waves; admin full manage
DROP POLICY IF EXISTS "Users can view culture waves" ON public.safety_culture_waves;
CREATE POLICY "Users can view culture waves"
    ON public.safety_culture_waves
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins manage culture waves" ON public.safety_culture_waves;
CREATE POLICY "Admins manage culture waves"
    ON public.safety_culture_waves
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND trim(lower(p.role::text)) = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND trim(lower(p.role::text)) = 'admin'
        )
    );

-- Responses: own write/read; admin read all
DROP POLICY IF EXISTS "Users view own culture responses" ON public.safety_culture_responses;
CREATE POLICY "Users view own culture responses"
    ON public.safety_culture_responses
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND trim(lower(p.role::text)) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users upsert own culture responses" ON public.safety_culture_responses;
CREATE POLICY "Users upsert own culture responses"
    ON public.safety_culture_responses
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own culture responses" ON public.safety_culture_responses;
CREATE POLICY "Users update own culture responses"
    ON public.safety_culture_responses
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Completions
DROP POLICY IF EXISTS "Users view own culture completions" ON public.safety_culture_completions;
CREATE POLICY "Users view own culture completions"
    ON public.safety_culture_completions
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND trim(lower(p.role::text)) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users insert own culture completions" ON public.safety_culture_completions;
CREATE POLICY "Users insert own culture completions"
    ON public.safety_culture_completions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own culture completions" ON public.safety_culture_completions;
CREATE POLICY "Users update own culture completions"
    ON public.safety_culture_completions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.safety_culture_waves TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.safety_culture_waves TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.safety_culture_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.safety_culture_completions TO authenticated;

GRANT ALL ON public.safety_culture_waves TO service_role;
GRANT ALL ON public.safety_culture_responses TO service_role;
GRANT ALL ON public.safety_culture_completions TO service_role;
