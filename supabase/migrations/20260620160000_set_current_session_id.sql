-- Single-device session support for custom-auth clients (no Supabase JWT / auth.uid()).
-- The app authenticates via the authenticate_user RPC and stores a token in
-- localStorage, so the browser client has NO Supabase Auth session and
-- auth.uid() is always NULL. That means a direct
--   .from('profiles').update({ current_session_id })
-- is silently blocked by the profiles RLS UPDATE policy (id = auth.uid()).
--
-- This SECURITY DEFINER RPC writes current_session_id for an explicit user id,
-- the same trust model already used by submit_quiz_result_v2 and
-- log_reading_habit_completion. It ONLY touches current_session_id and does not
-- modify points, penalties, lessons, or any scoring logic.

CREATE OR REPLACE FUNCTION public.set_current_session_id(
    p_user_id uuid,
    p_session_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := COALESCE(p_user_id, auth.uid());
    v_session_id text := trim(coalesce(p_session_id, ''));
    v_updated int;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing user id');
    END IF;

    IF v_session_id = '' THEN
        RETURN json_build_object('success', false, 'error', 'Missing session id');
    END IF;

    UPDATE public.profiles
    SET current_session_id = v_session_id
    WHERE id = v_user_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN json_build_object('success', v_updated > 0, 'session_id', v_session_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_current_session_id(uuid, text) TO anon, authenticated, service_role;

-- Realtime: ensure profiles UPDATEs are broadcast so the previously-logged-in
-- device receives the session change and signs out instantly. Without this,
-- the old device only detects the mismatch on its next profile refresh
-- (app reopen or pull-to-refresh).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;
