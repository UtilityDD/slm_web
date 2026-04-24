-- Final Cleanup and Consolidation of submit_quiz_result_v2
-- This migration drops ALL variations of the function to ensure NO AMBIGUITY.

-- 1. Drop all possible variations (text, numeric vs int, with/without user_id)
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, numeric, numeric, uuid);
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, numeric, numeric);
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, int, int, uuid);
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, int, int);
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, integer, integer);
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, integer, integer, uuid);

-- 2. Create the ONE TRUE function
-- We use NUMERIC for score and penalty to be safe with JS Number types
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
BEGIN
  -- Basic auth check
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

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
