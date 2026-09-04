-- =============================================================================
-- Non-destructive: profiles.reading_points_ledger + view/RPC dual-write
-- =============================================================================
-- Purpose:
--   Store full cumulative reading (first-time + day-stamped re-reads + life skills)
--   so All-time Rank can stop paging quiz_attempts via overlayCumulativeReading.
--
-- Safe:
--   * Does NOT change profiles.reading_points
--   * Does NOT delete quiz_attempts
--   * leaderboard_view.reading_points becomes COALESCE(ledger, reading_points)
--
-- After applying:
--   1. Run: node scripts/maintenance/backfill_reading_points_ledger.mjs
--   2. Spot-check a few heavy readers vs Rank overlay
--   3. Then ship app that trusts view reading_points (drop overlay)
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_points_ledger integer;

COMMENT ON COLUMN public.profiles.reading_points_ledger IS
  'Full cumulative reading display total (first-time + re-reads + life skills). Non-destructive; reading_points kept as legacy.';

-- Recreate all-time view to prefer ledger when present.
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

CREATE VIEW public.leaderboard_view AS
SELECT
  p.id AS user_id,
  p.points AS score,
  p.full_name,
  p.district,
  p.avatar_url,
  p.training_level,
  p.completed_lessons,
  p.total_penalties,
  COALESCE(p.reading_points_ledger, p.reading_points) AS reading_points,
  p.quiz_points,
  p.last_login_at,
  p.updated_at AS last_active
FROM public.profiles p
WHERE p.points > 0
  AND COALESCE(p.role, 'lineman') <> 'guest';

GRANT SELECT ON public.leaderboard_view TO postgres, anon, authenticated, service_role;

-- Recreate monthly view (same net rules + guest exclusion as live).
DROP VIEW IF EXISTS public.monthly_leaderboard_view;

CREATE VIEW public.monthly_leaderboard_view AS
SELECT
    qa.user_id,
    p.full_name,
    p.avatar_url,
    p.district,
    p.training_level,
    CAST(EXTRACT(MONTH FROM qa.created_at) AS INTEGER) AS month_num,
    CAST(EXTRACT(YEAR FROM qa.created_at) AS INTEGER) AS year_num,
    SUM(COALESCE(qa.score, 0)) - SUM(COALESCE(qa.penalty, 0)) AS points,
    SUM(COALESCE(qa.penalty, 0)) AS total_penalties,
    SUM(
        CASE WHEN qa.quiz_id LIKE 'lesson_bonus%'
             THEN COALESCE(qa.score, 0)
             ELSE 0
        END
    ) AS reading_points,
    (
        SUM(COALESCE(qa.score, 0)) - SUM(COALESCE(qa.penalty, 0))
        - SUM(
            CASE WHEN qa.quiz_id LIKE 'lesson_bonus%'
                 THEN COALESCE(qa.score, 0)
                 ELSE 0
            END
        )
    ) AS quiz_points
FROM public.quiz_attempts qa
JOIN public.profiles p ON p.id = qa.user_id
WHERE COALESCE(p.role, 'lineman') <> 'guest'
GROUP BY
    qa.user_id,
    p.full_name,
    p.avatar_url,
    p.district,
    p.training_level,
    EXTRACT(MONTH FROM qa.created_at),
    EXTRACT(YEAR FROM qa.created_at)
HAVING
    SUM(COALESCE(qa.score, 0)) > 0
    OR SUM(COALESCE(qa.penalty, 0)) > 0;

GRANT SELECT ON public.monthly_leaderboard_view TO postgres, anon, authenticated, service_role;

-- Dual-write: keep reading_points behavior; also maintain reading_points_ledger.
CREATE OR REPLACE FUNCTION public.submit_quiz_result_v2(
  p_quiz_id text,
  p_score numeric,
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

  IF p_quiz_id ~ '^hourly-challenge-\d{4}-\d{2}-\d{2}-\d{1,2}$' THEN
    v_slot := substring(p_quiz_id from 'hourly-challenge-(.*)$');
    v_slot_ist := make_timestamp(
      split_part(v_slot, '-', 1)::int,
      split_part(v_slot, '-', 2)::int,
      split_part(v_slot, '-', 3)::int,
      split_part(v_slot, '-', 4)::int,
      0, 0
    );
    v_diff_min := EXTRACT(EPOCH FROM (v_now_ist - v_slot_ist)) / 60.0;

    IF v_diff_min < -5 OR v_diff_min > 90 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'hourly_time_mismatch',
        'message', 'This hourly challenge can only be submitted during its own hour.',
        'slot_ist', to_char(v_slot_ist, 'YYYY-MM-DD HH24:MI'),
        'now_ist', to_char(v_now_ist, 'YYYY-MM-DD HH24:MI')
      );
    END IF;
  END IF;

  v_net_points := v_score_int - v_penalty_int;

  IF p_quiz_id LIKE 'lesson_%' THEN
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
  -- Ledger also counts life_skill_bonus as reading (matches client overlay).
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

CREATE OR REPLACE FUNCTION public.award_training_points(
  input_quiz_id text,
  input_score numeric,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_final_ledger int;
  v_score_int int := input_score::int;
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

  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
  VALUES (v_user_id, input_quiz_id, v_score_int, 0)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  IF v_inserted_rows > 0 THEN
    UPDATE profiles
    SET
      reading_points = COALESCE(reading_points, 0) + v_score_int,
      reading_points_ledger = COALESCE(reading_points_ledger, reading_points, 0) + v_score_int,
      points = COALESCE(points, 0) + v_score_int,
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  SELECT points, reading_points, reading_points_ledger
  INTO v_final_points, v_final_reading, v_final_ledger
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'already_awarded', (v_inserted_rows = 0),
    'new_total_points', v_final_points,
    'new_reading_points', v_final_reading,
    'new_reading_points_ledger', v_final_ledger
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_result_v2(text, numeric, numeric, uuid)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_training_points(text, numeric, uuid)
  TO anon, authenticated, service_role;

COMMIT;
