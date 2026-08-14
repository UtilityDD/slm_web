-- Single SECURITY DEFINER submit for culture survey.
-- Avoids client RLS failures on responses/completions while still requiring auth.uid().

NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.submit_safety_culture_survey(
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
    v_user uuid := auth.uid();
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
        RAISE EXCEPTION 'not authenticated';
    END IF;

    v_code := nullif(trim(p_wave_code), '');
    IF v_code IS NULL OR v_code NOT LIKE 'auto-%' THEN
        RAISE EXCEPTION 'invalid wave_code';
    END IF;

    IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
        RAISE EXCEPTION 'answers required';
    END IF;

    v_version := COALESCE(nullif(trim(p_item_set_version), ''), 'v1');

    -- Get or create the auto wave for this user cycle.
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

    -- Upsert each answer object key → { uchit, hoy }
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

COMMENT ON FUNCTION public.submit_safety_culture_survey(text, jsonb, text) IS
    'Authenticated user submits full culture survey answers; SECURITY DEFINER bypasses table RLS after auth.uid() check.';

GRANT EXECUTE ON FUNCTION public.submit_safety_culture_survey(text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_safety_culture_survey(text, jsonb, text) TO service_role;

NOTIFY pgrst, 'reload schema';
