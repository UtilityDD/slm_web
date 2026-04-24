-- Re-implement submit_quiz_result_v2 to support both Training and Hourly Quiz
-- This ensures backward compatibility for components like Competitions.jsx
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
  v_score_int int := p_score::int;
  v_penalty_int int := p_penalty::int;
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
BEGIN
  -- Basic auth check
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Insert into quiz_attempts
  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
  VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  -- 2. Award Points (ONLY IF INSERTED)
  -- Note: We subtract penalty from the points awarded if it's a competitive quiz
  -- But usually, reading points don't have penalties.
  IF v_inserted_rows > 0 THEN
    UPDATE profiles 
    SET 
      -- Only add to reading_points if it's a lesson
      reading_points = CASE 
        WHEN p_quiz_id LIKE 'lesson_%' THEN COALESCE(reading_points, 0) + v_score_int 
        ELSE COALESCE(reading_points, 0) 
      END,
      -- Quiz points are for everything else
      quiz_points = CASE 
        WHEN p_quiz_id NOT LIKE 'lesson_%' THEN COALESCE(quiz_points, 0) + (v_score_int - v_penalty_int)
        ELSE COALESCE(quiz_points, 0)
      END,
      -- Total points update
      points = COALESCE(points, 0) + (v_score_int - v_penalty_int),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 3. Get final status
  SELECT points, reading_points 
  INTO v_final_points, v_final_reading
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'already_awarded', (v_inserted_rows = 0),
    'new_total_points', v_final_points,
    'new_reading_points', v_final_reading
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
