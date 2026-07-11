-- Admin-only password reset for existing users.
--
-- Generates a random 6-digit temporary PIN, stores it as a bcrypt hash in
-- profiles.password_hash, and forces the user to change it on next login
-- (must_change_password = true). Mirrors create_user_account, but targets an
-- existing profile instead of creating a new one.
--
-- SECURITY: This RPC returns a working credential, so unlike admin_reset_score
-- it MUST verify the caller is a logged-in admin. Because the app uses custom
-- auth (auth.uid() is null), we verify against the caller's active session:
-- p_admin_id must be an 'admin' profile whose current_session_id matches the
-- p_admin_session token the client holds (set by claimDeviceSession at login).

CREATE OR REPLACE FUNCTION public.admin_reset_password(
    p_user_id uuid,
    p_admin_id uuid,
    p_admin_session text
)
RETURNS TABLE(user_id uuid, full_name text, phone_number text, temp_password text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_temp_password TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Authorize: caller must be an admin with a matching active session.
    SELECT EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = p_admin_id
          AND role = 'admin'
          AND current_session_id IS NOT NULL
          AND current_session_id = p_admin_session
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: valid admin session required';
    END IF;

    -- Generate a random 6-digit numeric PIN (easy to read out to the user).
    v_temp_password := floor(random() * 900000 + 100000)::TEXT;

    UPDATE profiles
    SET password_hash        = crypt(v_temp_password, gen_salt('bf')),
        must_change_password = true,
        updated_at           = now()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    RETURN QUERY
    SELECT p.id, p.full_name, p.phone_number, v_temp_password
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, uuid, text) TO anon, authenticated;
