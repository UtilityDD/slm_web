-- Identify (পরিচিতি) real score: one row per user; each submit REPLACES score.
-- Non-admin: one chance per IST day. Admin: always allowed (preview).

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.identify_scores (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 10000),
  asked integer NOT NULL DEFAULT 0 CHECK (asked >= 0 AND asked <= 10000),
  mistakes integer NOT NULL DEFAULT 0 CHECK (mistakes >= 0 AND mistakes <= 20),
  played_on date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS identify_scores_score_idx
  ON public.identify_scores (score DESC, updated_at DESC);

COMMENT ON TABLE public.identify_scores IS
  'Parichiti real-score: one score per user; submit replaces score; 1 play / IST day (admin unlimited).';

ALTER TABLE public.identify_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identify_scores_select_own ON public.identify_scores;
CREATE POLICY identify_scores_select_own
  ON public.identify_scores
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Writes only via SECURITY DEFINER RPC
REVOKE INSERT, UPDATE, DELETE ON public.identify_scores FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.ist_today()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (timezone('Asia/Kolkata', now()))::date;
$$;

CREATE OR REPLACE FUNCTION public.get_identify_score_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_row public.identify_scores%ROWTYPE;
  v_today date := public.ist_today();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  v_is_admin := (v_role = 'admin');

  IF public.is_guest_user(v_uid) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'guest', true,
      'is_admin', false,
      'can_play', false,
      'score', null,
      'played_on', null,
      'played_today', false,
      'today', v_today
    );
  END IF;

  SELECT * INTO v_row FROM public.identify_scores WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'guest', false,
    'is_admin', v_is_admin,
    'can_play', v_is_admin OR v_row.user_id IS NULL OR v_row.played_on IS DISTINCT FROM v_today,
    'score', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.score END,
    'asked', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.asked END,
    'mistakes', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.mistakes END,
    'played_on', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.played_on::text END,
    'played_today', COALESCE(v_row.played_on = v_today, false),
    'today', v_today
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_identify_score(
  p_score integer,
  p_asked integer DEFAULT 0,
  p_mistakes integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_is_admin boolean := false;
  v_today date := public.ist_today();
  v_existing public.identify_scores%ROWTYPE;
  v_score integer;
  v_asked integer;
  v_mistakes integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF public.is_guest_user(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'guest_preview');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  v_is_admin := (v_role = 'admin');

  v_score := GREATEST(0, LEAST(10000, COALESCE(p_score, 0)));
  v_asked := GREATEST(0, LEAST(10000, COALESCE(p_asked, 0)));
  v_mistakes := GREATEST(0, LEAST(20, COALESCE(p_mistakes, 0)));

  SELECT * INTO v_existing FROM public.identify_scores WHERE user_id = v_uid;

  IF NOT v_is_admin
     AND v_existing.user_id IS NOT NULL
     AND v_existing.played_on = v_today THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_played',
      'score', v_existing.score,
      'played_on', v_existing.played_on,
      'today', v_today
    );
  END IF;

  INSERT INTO public.identify_scores AS s (
    user_id, score, asked, mistakes, played_on, updated_at
  )
  VALUES (
    v_uid, v_score, v_asked, v_mistakes, v_today, timezone('utc'::text, now())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score = EXCLUDED.score,
    asked = EXCLUDED.asked,
    mistakes = EXCLUDED.mistakes,
    played_on = EXCLUDED.played_on,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'ok', true,
    'score', v_existing.score,
    'asked', v_existing.asked,
    'mistakes', v_existing.mistakes,
    'played_on', v_existing.played_on,
    'preview', v_is_admin,
    'today', v_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ist_today() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_identify_score_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_identify_score(integer, integer, integer) TO authenticated, service_role;
