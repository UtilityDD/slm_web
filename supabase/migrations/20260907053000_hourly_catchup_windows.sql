-- Hourly catch-up windows + one-write-per-hour + seeded question pool
-- =============================================================================
-- Apply only after the new 5-question catch-up client is live.
-- The old makeup client (100–300 pts) would have scores clamped to 50.
-- Day slots (06–22 IST): submit within 3h 15m of that hour’s start.
-- Night slots (23, 00–05 IST): submit within 6h 15m while it is still night.
-- During daytime (now 06–22 IST), leftover night hours also cap at 3h 15m.
-- Future slots still blocked (5 min drift).
-- Hourly attempts insert once; never overwrite a score.
-- get_random_hourly_questions: same user+hour always gets the same pool.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.submit_quiz_result_v2(
  p_quiz_id text,
  p_score numeric DEFAULT 0,
  p_penalty numeric DEFAULT 0,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_final_quiz_points int;
  v_final_ledger int;
  v_score_int int := ROUND(p_score)::int;
  v_penalty_int int := ROUND(p_penalty)::int;
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_net_points int;
  v_slot text;
  v_slot_ist timestamp;
  v_now_ist timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
  v_diff_min numeric;
  v_slot_hour int;
  v_now_hour int;
  v_window_min numeric;
  v_is_hourly boolean := false;
  v_bump_reading boolean;
  v_bump_ledger boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF public.is_guest_user(v_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'guest_preview',
      'message', 'Guest preview accounts cannot save scores.'
    );
  END IF;

  -- Canonical hourly id only: hourly-challenge-YYYY-MM-DD-HH (two-digit hour).
  IF p_quiz_id ~ '^hourly-challenge-\d{4}-\d{2}-\d{2}-\d{2}$' THEN
    v_is_hourly := true;
    v_slot := substring(p_quiz_id from 'hourly-challenge-(.*)$');
    v_slot_hour := split_part(v_slot, '-', 4)::int;
    v_slot_ist := make_timestamp(
      split_part(v_slot, '-', 1)::int,
      split_part(v_slot, '-', 2)::int,
      split_part(v_slot, '-', 3)::int,
      v_slot_hour,
      0, 0
    );
    v_diff_min := EXTRACT(EPOCH FROM (v_now_ist - v_slot_ist)) / 60.0;
    v_now_hour := EXTRACT(HOUR FROM v_now_ist)::int;
    v_window_min := CASE
      WHEN v_slot_hour IN (23, 0, 1, 2, 3, 4, 5) THEN 375
      ELSE 195
    END;
    -- Daytime insist: do not keep 6h night leftovers open after 6 AM.
    IF v_now_hour NOT IN (23, 0, 1, 2, 3, 4, 5) THEN
      v_window_min := LEAST(v_window_min, 195);
    END IF;

    IF v_diff_min < -5 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'hourly_time_mismatch',
        'message', 'This hourly challenge can only be submitted during its own hour.',
        'slot_ist', to_char(v_slot_ist, 'YYYY-MM-DD HH24:MI'),
        'now_ist', to_char(v_now_ist, 'YYYY-MM-DD HH24:MI')
      );
    END IF;

    IF v_diff_min > v_window_min THEN
      RETURN json_build_object(
        'success', false,
        'error', 'hourly_window_closed',
        'message', 'This hourly challenge is no longer open.',
        'slot_ist', to_char(v_slot_ist, 'YYYY-MM-DD HH24:MI'),
        'now_ist', to_char(v_now_ist, 'YYYY-MM-DD HH24:MI')
      );
    END IF;

    v_score_int := GREATEST(0, LEAST(50, v_score_int));
    v_penalty_int := GREATEST(0, LEAST(50, v_penalty_int));
  ELSIF p_quiz_id ~ '^hourly-challenge-' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'hourly_time_mismatch',
      'message', 'Invalid hourly quiz id.'
    );
  END IF;

  v_net_points := v_score_int - v_penalty_int;

  IF p_quiz_id LIKE 'lesson_%' OR v_is_hourly THEN
    INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
    VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
    ON CONFLICT (user_id, quiz_id) DO NOTHING;
  ELSE
    INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
    VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
    ON CONFLICT (user_id, quiz_id) DO UPDATE SET
      score = EXCLUDED.score,
      penalty = EXCLUDED.penalty,
      created_at = now();
  END IF;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  v_bump_reading := (v_inserted_rows > 0 OR p_quiz_id NOT LIKE 'lesson_%') AND p_quiz_id LIKE 'lesson_%';
  v_bump_ledger :=
    (v_bump_reading)
    OR (v_inserted_rows > 0 AND p_quiz_id LIKE 'life_skill_bonus%');

  UPDATE profiles
  SET
    reading_points = CASE
      WHEN v_bump_reading
      THEN COALESCE(reading_points, 0) + v_score_int
      ELSE COALESCE(reading_points, 0)
    END,
    reading_points_ledger = CASE
      WHEN v_bump_ledger
      THEN COALESCE(reading_points_ledger, reading_points, 0) + v_score_int
      ELSE COALESCE(reading_points_ledger, reading_points)
    END,
    quiz_points = CASE
      WHEN v_inserted_rows > 0 AND p_quiz_id NOT LIKE 'lesson_%'
      THEN COALESCE(quiz_points, 0) + v_net_points
      ELSE COALESCE(quiz_points, 0)
    END,
    points = CASE
      WHEN v_inserted_rows > 0
      THEN COALESCE(points, 0) + v_net_points
      ELSE COALESCE(points, 0)
    END,
    updated_at = now()
  WHERE id = v_user_id;

  SELECT points, reading_points, quiz_points, reading_points_ledger
  INTO v_final_points, v_final_reading, v_final_quiz_points, v_final_ledger
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'already_played', (v_is_hourly AND v_inserted_rows = 0),
    'new_total_points', v_final_points,
    'new_reading_points', v_final_reading,
    'new_reading_points_ledger', v_final_ledger,
    'new_quiz_points', v_final_quiz_points,
    'v_inserted_rows', v_inserted_rows
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

DROP FUNCTION IF EXISTS public.get_random_hourly_questions(text, integer);
DROP FUNCTION IF EXISTS public.get_random_hourly_questions(text, int);
DROP FUNCTION IF EXISTS public.get_random_hourly_questions(text, integer, text[]);
DROP FUNCTION IF EXISTS public.get_random_hourly_questions(text, int, text[]);
DROP FUNCTION IF EXISTS public.get_random_hourly_questions(text, integer, text[], uuid, text);
DROP FUNCTION IF EXISTS public.get_random_hourly_questions(text, int, text[], uuid, text);

CREATE FUNCTION public.get_random_hourly_questions(
  lang text,
  limit_count int,
  difficulty_tags text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_quiz_id text DEFAULT NULL
)
RETURNS SETOF hourly_questions
LANGUAGE sql
AS $$
  SELECT *
  FROM hourly_questions
  WHERE language = lang
    AND (
      difficulty_tags IS NULL
      OR cardinality(difficulty_tags) = 0
      OR tags && difficulty_tags
      OR tags IS NULL
      OR cardinality(tags) = 0
    )
  ORDER BY
    CASE
      WHEN p_user_id IS NOT NULL AND coalesce(p_quiz_id, '') <> ''
        THEN md5(id::text || p_user_id::text || p_quiz_id)
      ELSE md5(id::text || clock_timestamp()::text)
    END
  LIMIT GREATEST(1, LEAST(80, COALESCE(limit_count, 30)));
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_result_v2(text, numeric, numeric, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_random_hourly_questions(text, int, text[], uuid, text)
  TO anon, authenticated, service_role;
