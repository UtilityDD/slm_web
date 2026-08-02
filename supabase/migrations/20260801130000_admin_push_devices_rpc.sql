-- ============================================================
-- Admin: list Web Push devices for one user — ADDITIVE ONLY
-- Does NOT alter profiles, notifications, or existing RPCs.
-- Requires: public.push_subscriptions (20260801120000_push_subscriptions.sql)
--
-- Full endpoints are push credentials, so only the provider host and a short
-- tail are returned — enough to tell devices apart without leaking the URL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_push_devices(
  p_caller_id uuid,
  p_target_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target uuid := COALESCE(p_target_user_id, p_caller_id);
  v_rows json;
BEGIN
  IF p_caller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_caller_id
      AND trim(lower(p.role::text)) = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'not authorized');
  END IF;

  IF to_regclass('public.push_subscriptions') IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'push_subscriptions table missing — run 20260801120000_push_subscriptions.sql'
    );
  END IF;

  SELECT COALESCE(json_agg(d ORDER BY d.created_at DESC), '[]'::json)
  INTO v_rows
  FROM (
    SELECT
      s.id,
      split_part(s.endpoint, '/', 3) AS provider,
      right(s.endpoint, 8) AS endpoint_tail,
      s.user_agent,
      s.created_at,
      s.updated_at,
      s.last_pushed_at
    FROM public.push_subscriptions s
    WHERE s.user_id = v_target
  ) d;

  RETURN json_build_object(
    'success', true,
    'target_user_id', v_target,
    'devices', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_push_devices(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_push_devices(uuid, uuid)
  TO anon, authenticated, service_role;
