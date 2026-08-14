-- Safety culture survey: verify + repair submit path (safe to re-run)

-- 1) Reload API schema cache (important after creating RPC)
NOTIFY pgrst, 'reload schema';

-- 2) Recreate RPC (SECURITY DEFINER) + grants
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

GRANT EXECUTE ON FUNCTION public.get_or_create_safety_culture_wave(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_safety_culture_wave(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_safety_culture_wave(text, text) TO anon;

-- 3) Allow non-admin insert of own auto-* waves (fallback if RPC path fails)
DROP POLICY IF EXISTS "Users insert own auto culture waves" ON public.safety_culture_waves;
CREATE POLICY "Users insert own auto culture waves"
    ON public.safety_culture_waves
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = created_by
        AND wave_code LIKE 'auto-%'
    );

-- 4) Verification output
SELECT 'function' AS check_type, p.proname AS name, p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_or_create_safety_culture_wave'

UNION ALL

SELECT 'policy', policyname, true
FROM pg_policies
WHERE tablename = 'safety_culture_waves' AND policyname = 'Users insert own auto culture waves'

UNION ALL

SELECT 'grant', grantee, true
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'get_or_create_safety_culture_wave'
  AND grantee IN ('authenticated', 'anon', 'PUBLIC');
