-- Temporary debug version of the RPC to test logic for specific users
-- This is identical to submit_quiz_result_v2 but takes a p_user_id
CREATE OR REPLACE FUNCTION public.submit_quiz_result_debug(
  p_user_id uuid,
  p_quiz_id text,
  p_score int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
BEGIN
  -- 1. Insert into quiz_attempts
  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
  VALUES (p_user_id, p_quiz_id, p_score, 0)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  -- 2. Update profile
  IF v_inserted_rows > 0 THEN
    UPDATE profiles 
    SET 
      reading_points = COALESCE(reading_points, 0) + p_score,
      points = COALESCE(points, 0) + p_score,
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  -- 3. Get results
  SELECT points, reading_points INTO v_final_points, v_final_reading
  FROM profiles WHERE id = p_user_id;

  RETURN json_build_object(
    'success', v_inserted_rows > 0,
    'new_points', v_final_points,
    'new_reading', v_final_reading,
    'already_awarded', v_inserted_rows = 0
  );
END;
$$;
