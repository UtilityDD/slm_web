-- Auto 90-day culture survey: users get a cycle wave without admin push.
-- SECURITY DEFINER so authenticated users can create their own cycle bucket.

CREATE OR REPLACE FUNCTION public.get_or_create_safety_culture_wave(
    p_wave_code text,
    p_item_set_version text DEFAULT 'v1'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
    v_code text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    v_code := nullif(trim(p_wave_code), '');
    IF v_code IS NULL THEN
        RAISE EXCEPTION 'wave_code required';
    END IF;

    -- Only allow auto-* cycle codes from non-admins (prevent arbitrary wave spam).
    IF v_code NOT LIKE 'auto-%' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
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
        auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.get_or_create_safety_culture_wave(text, text) IS
    'Creates or returns a culture survey wave by code. Non-admins may only create auto-* cycle waves.';

GRANT EXECUTE ON FUNCTION public.get_or_create_safety_culture_wave(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_safety_culture_wave(text, text) TO service_role;
