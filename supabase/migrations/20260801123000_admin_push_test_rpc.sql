-- ============================================================
-- Admin helpers for Web Push testing — ADDITIVE ONLY
-- Does NOT alter profiles, notifications, or existing RPCs.
-- Requires: public.push_subscriptions (20260801120000_push_subscriptions.sql)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_push_subscription_stats(p_caller_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_users bigint;
  v_mine bigint;
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

  SELECT count(*) INTO v_total FROM public.push_subscriptions;
  SELECT count(DISTINCT user_id) INTO v_users FROM public.push_subscriptions;
  SELECT count(*) INTO v_mine
  FROM public.push_subscriptions
  WHERE user_id = p_caller_id;

  RETURN json_build_object(
    'success', true,
    'total_subscriptions', v_total,
    'unique_users', v_users,
    'mine', v_mine
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_push_subscription_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_push_subscription_stats(uuid)
  TO anon, authenticated, service_role;
