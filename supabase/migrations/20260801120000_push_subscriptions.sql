-- ============================================================
-- Web Push subscriptions (re-engagement) — ADDITIVE ONLY
-- Creates a NEW table + SECURITY DEFINER RPCs.
-- Does NOT ALTER profiles, notifications, quiz_attempts,
-- reading_habit_completions, or any existing RPCs/triggers.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    last_pushed_at timestamptz,
    CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

COMMENT ON TABLE public.push_subscriptions IS
    'PWA Web Push endpoints for inactive-user re-engagement. Independent of in-app notifications.';

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
    ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_inactive_push_idx
    ON public.push_subscriptions (last_pushed_at);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- No direct client table access — only RPCs below + service_role (Edge Function).
REVOKE ALL ON public.push_subscriptions FROM PUBLIC;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

-- Upsert subscription for custom-auth clients (auth.uid() is usually null).
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
    p_user_id uuid,
    p_endpoint text,
    p_p256dh text,
    p_auth text,
    p_user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := p_user_id;
    v_endpoint text := trim(coalesce(p_endpoint, ''));
    v_p256dh text := trim(coalesce(p_p256dh, ''));
    v_auth text := trim(coalesce(p_auth, ''));
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'user_id required');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'user not found');
    END IF;

    IF v_endpoint = '' OR length(v_endpoint) > 2048 THEN
        RETURN json_build_object('success', false, 'error', 'invalid endpoint');
    END IF;

    IF v_p256dh = '' OR v_auth = '' THEN
        RETURN json_build_object('success', false, 'error', 'invalid keys');
    END IF;

    INSERT INTO public.push_subscriptions (
        user_id, endpoint, p256dh, auth, user_agent, updated_at
    )
    VALUES (
        v_user_id,
        v_endpoint,
        v_p256dh,
        v_auth,
        left(nullif(trim(coalesce(p_user_agent, '')), ''), 512),
        timezone('utc'::text, now())
    )
    ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = COALESCE(EXCLUDED.user_agent, public.push_subscriptions.user_agent),
        updated_at = timezone('utc'::text, now());

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(
    p_user_id uuid,
    p_endpoint text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_endpoint text := trim(coalesce(p_endpoint, ''));
BEGIN
    IF p_user_id IS NULL OR v_endpoint = '' THEN
        RETURN json_build_object('success', false, 'error', 'user_id and endpoint required');
    END IF;

    DELETE FROM public.push_subscriptions
    WHERE user_id = p_user_id
      AND endpoint = v_endpoint;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_push_subscription(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_push_subscription(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(uuid, text, text, text, text)
    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription(uuid, text)
    TO anon, authenticated, service_role;
