-- Create a fresh, uniquely named function to avoid any legacy conflicts
CREATE OR REPLACE FUNCTION public.award_training_points(
  input_quiz_id text,
  input_score numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_score_int int := input_score::int;
BEGIN
  -- Basic auth check
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Insert into quiz_attempts
  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
  VALUES (v_user_id, input_quiz_id, v_score_int, 0)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  -- 2. Update profile if newly awarded
  IF v_inserted_rows > 0 THEN
    UPDATE profiles 
    SET 
      reading_points = COALESCE(reading_points, 0) + v_score_int,
      points = COALESCE(points, 0) + v_score_int,
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
