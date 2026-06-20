-- Hourly submit time guard for submit_quiz_result_v2
-- =====================================================================
-- PURPOSE
--   Stop device-clock manipulation on the hourly challenge. The client
--   builds the quiz_id ('hourly-challenge-YYYY-MM-DD-HH') from the
--   device clock, so a user can change their phone time to play many
--   hours quickly. This adds ONE server-side check that compares the
--   hour inside the quiz_id against the real server time (Asia/Kolkata).
--
-- WHAT CHANGED vs the consolidated function
--   * Added a small "Hourly time guard" block right after the auth check.
--   * Everything else (insert, points math, penalties, return shape,
--     exception handler) is byte-for-byte the same as before.
--
-- BEHAVIOUR
--   * Only strict hourly ids are checked: 'hourly-challenge-YYYY-MM-DD-HH'.
--   * Lessons ('lesson_%'), legacy/other quiz ids: NOT affected.
--   * Honest play (slot hour == current IST hour) always passes.
--   * If the slot is in the future, or more than 90 minutes in the past,
--     the function returns success=false and awards NO points / saves NO row.
--
-- SAFETY
--   * Additive only. No client code change required.
--   * Fully reversible: re-run consolidate_submit_quiz_result.sql to revert.
--
-- HOW TO APPLY
--   Run this whole file in Supabase Dashboard -> SQL Editor (needs write access).
-- =====================================================================

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
  v_score_int int := ROUND(p_score)::int;
  v_penalty_int int := ROUND(p_penalty)::int;
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_net_points int;
  -- Hourly time guard vars
  v_slot text;
  v_slot_ist timestamp;
  v_now_ist timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
  v_diff_min numeric;
BEGIN
  -- Basic auth check
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- ---- Hourly time guard (additive; strict hourly ids only) ----
  -- quiz_id shape: hourly-challenge-YYYY-MM-DD-HH (HH in device/IST local hour)
  IF p_quiz_id ~ '^hourly-challenge-\d{4}-\d{2}-\d{2}-\d{1,2}$' THEN
    v_slot := substring(p_quiz_id from 'hourly-challenge-(.*)$'); -- 'YYYY-MM-DD-HH'
    v_slot_ist := make_timestamp(
      split_part(v_slot, '-', 1)::int,
      split_part(v_slot, '-', 2)::int,
      split_part(v_slot, '-', 3)::int,
      split_part(v_slot, '-', 4)::int,
      0, 0
    );
    -- Minutes between the claimed slot hour and the real IST time.
    -- Honest submit happens inside the slot's own hour => 0..59 min.
    v_diff_min := EXTRACT(EPOCH FROM (v_now_ist - v_slot_ist)) / 60.0;

    -- Block future slots (diff < -5 allows tiny clock drift) and very late
    -- submits (> 90 min) which indicate the clock was moved.
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
  -- ---- end hourly time guard ----

  -- Calculate net points to add
  v_net_points := v_score_int - v_penalty_int;

  -- 1. Insert into quiz_attempts
  -- We allow UPSERT for hourly quizzes but only award points ONCE for lesson quizzes
  IF p_quiz_id LIKE 'lesson_%' THEN
    INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
    VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
    ON CONFLICT (user_id, quiz_id) DO NOTHING;
  ELSE
    -- Hourly quizzes or others can be updated (idempotent for points)
    INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
    VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
    ON CONFLICT (user_id, quiz_id) DO UPDATE SET
      score = EXCLUDED.score,
      penalty = EXCLUDED.penalty,
      created_at = now();
  END IF;
  
  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  -- 2. Award Points
  -- Important logic:
  -- - Lessons add to reading_points (No penalty applied to reading_points)
  -- - Hourly/Others add to quiz_points (Penalty IS applied here)
  -- - Total points always gets (score - penalty)
  
  UPDATE profiles 
  SET 
    -- Only add points if it's a NEW attempt (for lessons) or ANY attempt (for hourly)
    -- Actually, to avoid double-counting points for hourly, we only add if it's a NEW row 
    -- OR we handle the delta. 
    -- Given the current app logic, hourly quiz IDs are unique per hour, so ONCE per hour.
    
    reading_points = CASE 
      WHEN (v_inserted_rows > 0 OR p_quiz_id NOT LIKE 'lesson_%') AND p_quiz_id LIKE 'lesson_%' 
      THEN COALESCE(reading_points, 0) + v_score_int 
      ELSE COALESCE(reading_points, 0) 
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

  -- 3. Get final status
  SELECT points, reading_points, quiz_points 
  INTO v_final_points, v_final_reading, v_final_quiz_points
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'new_total_points', v_final_points,
    'new_reading_points', v_final_reading,
    'new_quiz_points', v_final_quiz_points,
    'v_inserted_rows', v_inserted_rows
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
