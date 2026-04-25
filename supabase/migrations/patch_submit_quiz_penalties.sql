-- 1. Remove the old trigger that was causing issues/conflicts
DROP TRIGGER IF EXISTS after_quiz_attempt_insert ON quiz_attempts;
DROP FUNCTION IF EXISTS public.update_total_penalty();

-- 2. Drop existing function if needed
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(uuid, text, numeric, boolean, text, jsonb, numeric);

-- 3. Create the centralized and highly reliable function
CREATE OR REPLACE FUNCTION public.submit_quiz_result_v2(
  p_user_id uuid,
  p_quiz_id text,
  p_score numeric,
  p_is_passed boolean,
  p_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_penalty numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := p_user_id;
  v_score_int integer := ROUND(p_score);
  v_penalty_int integer := ROUND(COALESCE(p_penalty, 0));
  v_net_points integer := v_score_int - v_penalty_int;
  v_inserted_rows integer;
  v_final_points integer;
  v_final_reading integer;
  v_final_quiz_points integer;
  v_final_penalties integer;
BEGIN
  -- 1. Insert Attempt
  INSERT INTO quiz_attempts (
    user_id, quiz_id, score, is_passed, type, metadata, penalty
  )
  VALUES (
    v_user_id, p_quiz_id, v_score_int, p_is_passed, p_type, p_metadata, v_penalty_int
  )
  ON CONFLICT (user_id, quiz_id) 
  DO NOTHING;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  -- 2. Award Points & Penalties directly in one UPDATE call
  UPDATE profiles 
  SET 
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

    -- ALWAYS incrementally add penalty for newly inserted rows centrally
    total_penalties = CASE 
      WHEN v_inserted_rows > 0 AND v_penalty_int > 0 
      THEN COALESCE(total_penalties, 0) + v_penalty_int
      ELSE COALESCE(total_penalties, 0)
    END,
    
    updated_at = now()
  WHERE id = v_user_id;

  -- 3. Get final status
  SELECT points, reading_points, quiz_points, total_penalties 
  INTO v_final_points, v_final_reading, v_final_quiz_points, v_final_penalties
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'points_awarded', CASE WHEN v_inserted_rows > 0 THEN v_net_points ELSE 0 END,
    'penalty_applied', CASE WHEN v_inserted_rows > 0 THEN v_penalty_int ELSE 0 END,
    'is_new_attempt', v_inserted_rows > 0,
    'new_total_score', v_final_points,
    'new_reading_points', v_final_reading,
    'new_quiz_points', v_final_quiz_points,
    'new_total_penalties', v_final_penalties
  );
END;
$$;
