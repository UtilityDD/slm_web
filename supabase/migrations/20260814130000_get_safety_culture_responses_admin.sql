-- Admin culture-survey summary for custom phone/PIN auth (no JWT / auth.uid()).
-- Direct SELECT on safety_culture_responses is empty under RLS even when rows exist.
-- Same trust model as get_notifications_admin(p_caller_id).
--
-- RUN THIS in the Supabase SQL editor.

NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.get_safety_culture_responses_admin(
    p_caller_id uuid,
    p_since timestamptz DEFAULT NULL,
    p_until timestamptz DEFAULT NULL
)
RETURNS TABLE (
    user_id uuid,
    item_id text,
    answer_uchit text,
    answer_hoy text,
    submitted_at timestamptz,
    wave_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_caller_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = p_caller_id
          AND trim(lower(p.role::text)) = 'admin'
    ) THEN
        RAISE EXCEPTION 'not authorized';
    END IF;

    RETURN QUERY
    SELECT
        r.user_id,
        r.item_id,
        r.answer_uchit,
        r.answer_hoy,
        r.submitted_at,
        r.wave_id
    FROM public.safety_culture_responses r
    WHERE (p_since IS NULL OR r.submitted_at >= p_since)
      AND (p_until IS NULL OR r.submitted_at <= p_until)
    ORDER BY r.submitted_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_safety_culture_responses_admin(uuid, timestamptz, timestamptz) IS
    'Admin period summary of culture survey answers. Caller must be profiles.role = admin.';

GRANT EXECUTE ON FUNCTION public.get_safety_culture_responses_admin(uuid, timestamptz, timestamptz)
    TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
