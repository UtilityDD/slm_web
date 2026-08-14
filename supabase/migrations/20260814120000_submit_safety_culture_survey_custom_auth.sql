-- Culture survey submit for custom phone/PIN auth (NO Supabase JWT).
-- auth.uid() is always NULL in this app — same model as submit_quiz_result_v2
-- and log_reading_habit_completion: pass p_user_id, SECURITY DEFINER, GRANT anon.
--
-- RUN THIS in the Supabase SQL editor (required for submit to work).

NOTIFY pgrst, 'reload schema';

-- Drop the v1.3.121 signature that required auth.uid() (always fails here).
DROP FUNCTION IF EXISTS public.submit_safety_culture_survey(text, jsonb, text);

CREATE OR REPLACE FUNCTION public.submit_safety_culture_survey(
    p_user_id uuid,
    p_wave_code text,
    p_answers jsonb,
    p_item_set_version text DEFAULT 'v1'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user uuid := COALESCE(p_user_id, auth.uid());
    v_wave uuid;
    v_code text;
    v_version text;
    v_item text;
    v_uchit text;
    v_hoy text;
    v_now timestamptz := timezone('utc'::text, now());
    v_count int := 0;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'missing user';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user) THEN
        RAISE EXCEPTION 'missing user';
    END IF;

    v_code := nullif(trim(p_wave_code), '');
    IF v_code IS NULL OR v_code NOT LIKE 'auto-%' THEN
        RAISE EXCEPTION 'invalid wave_code';
    END IF;

    IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
        RAISE EXCEPTION 'answers required';
    END IF;

    v_version := COALESCE(nullif(trim(p_item_set_version), ''), 'v1');

    SELECT w.id INTO v_wave
    FROM public.safety_culture_waves w
    WHERE w.wave_code = v_code
    LIMIT 1;

    IF v_wave IS NULL THEN
        INSERT INTO public.safety_culture_waves (
            wave_code,
            opens_at,
            closes_at,
            item_set_version,
            is_active,
            created_by
        )
        VALUES (
            v_code,
            v_now,
            NULL,
            v_version,
            false,
            v_user
        )
        RETURNING id INTO v_wave;
    END IF;

    FOR v_item, v_uchit, v_hoy IN
        SELECT
            e.key,
            upper(nullif(trim(e.value ->> 'uchit'), '')),
            upper(nullif(trim(e.value ->> 'hoy'), ''))
        FROM jsonb_each(p_answers) AS e
    LOOP
        IF v_uchit IS NULL OR v_hoy IS NULL THEN
            RAISE EXCEPTION 'incomplete:%', v_item;
        END IF;
        IF v_uchit NOT IN ('A', 'B', 'C') OR v_hoy NOT IN ('A', 'B', 'C') THEN
            RAISE EXCEPTION 'incomplete:%', v_item;
        END IF;

        INSERT INTO public.safety_culture_responses (
            wave_id,
            user_id,
            item_id,
            answer_uchit,
            answer_hoy,
            item_set_version,
            submitted_at
        )
        VALUES (
            v_wave,
            v_user,
            v_item,
            v_uchit,
            v_hoy,
            v_version,
            v_now
        )
        ON CONFLICT (wave_id, user_id, item_id)
        DO UPDATE SET
            answer_uchit = EXCLUDED.answer_uchit,
            answer_hoy = EXCLUDED.answer_hoy,
            item_set_version = EXCLUDED.item_set_version,
            submitted_at = EXCLUDED.submitted_at;

        v_count := v_count + 1;
    END LOOP;

    IF v_count < 1 THEN
        RAISE EXCEPTION 'answers required';
    END IF;

    INSERT INTO public.safety_culture_completions (
        wave_id,
        user_id,
        completed_at,
        item_set_version
    )
    VALUES (
        v_wave,
        v_user,
        v_now,
        v_version
    )
    ON CONFLICT (wave_id, user_id)
    DO UPDATE SET
        completed_at = EXCLUDED.completed_at,
        item_set_version = EXCLUDED.item_set_version;

    RETURN v_wave;
END;
$$;

COMMENT ON FUNCTION public.submit_safety_culture_survey(uuid, text, jsonb, text) IS
    'Custom-auth user submits culture survey; SECURITY DEFINER bypasses table RLS. Pass p_user_id (auth.uid() is unused in this app).';

GRANT EXECUTE ON FUNCTION public.submit_safety_culture_survey(uuid, text, jsonb, text)
    TO anon, authenticated, service_role;

-- Wave helper: same custom-auth user id (fallback / older clients).
DROP FUNCTION IF EXISTS public.get_or_create_safety_culture_wave(text, text);

CREATE OR REPLACE FUNCTION public.get_or_create_safety_culture_wave(
    p_wave_code text,
    p_item_set_version text DEFAULT 'v1',
    p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
    v_code text;
    v_user uuid := COALESCE(p_user_id, auth.uid());
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'missing user';
    END IF;

    v_code := nullif(trim(p_wave_code), '');
    IF v_code IS NULL THEN
        RAISE EXCEPTION 'wave_code required';
    END IF;

    IF v_code NOT LIKE 'auto-%' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_user
              AND trim(lower(p.role::text)) = 'admin'
        ) THEN
            RAISE EXCEPTION 'only auto cycle waves allowed';
        END IF;
    END IF;

    SELECT w.id INTO v_id
    FROM public.safety_culture_waves w
    WHERE w.wave_code = v_code
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO public.safety_culture_waves (
        wave_code,
        opens_at,
        closes_at,
        item_set_version,
        is_active,
        created_by
    )
    VALUES (
        v_code,
        timezone('utc'::text, now()),
        NULL,
        COALESCE(nullif(trim(p_item_set_version), ''), 'v1'),
        false,
        v_user
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_safety_culture_wave(text, text, uuid)
    TO anon, authenticated, service_role;

-- Pending-gate read: table RLS uses auth.uid() so custom-auth clients see 0 rows.
CREATE OR REPLACE FUNCTION public.get_latest_safety_culture_completion(p_user_id uuid)
RETURNS TABLE (id uuid, completed_at timestamptz, wave_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT c.id, c.completed_at, c.wave_id
    FROM public.safety_culture_completions c
    WHERE c.user_id = p_user_id
    ORDER BY c.completed_at DESC
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_safety_culture_completion(uuid)
    TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
