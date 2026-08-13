-- Progressive PPE nudge state for field-job users (custom-auth clients).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ppe_nudge_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.ppe_nudge_state IS
  'Progressive PPE nudge state: { last_prompt_date, skips: { itemName: count }, answered: { itemName: true } }';

CREATE OR REPLACE FUNCTION public.apply_ppe_nudge(
    p_user_id uuid,
    p_nudge_state jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := COALESCE(p_user_id, auth.uid());
    v_updated int;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing user id');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF p_nudge_state IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Nothing to update');
    END IF;

    UPDATE public.profiles
    SET
        ppe_nudge_state = COALESCE(ppe_nudge_state, '{}'::jsonb) || p_nudge_state,
        updated_at = now()
    WHERE id = v_user_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN json_build_object('success', v_updated > 0);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ppe_nudge(uuid, jsonb) TO anon, authenticated, service_role;
