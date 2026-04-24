-- Robust version of point submission RPC
-- Features: 
-- 1. Idempotent (ON CONFLICT DO NOTHING)
-- 2. COALESCE to prevent NULL + X = NULL bug
-- 3. Syncs both reading_points and total points
-- 4. Returns the updated points for verification

CREATE OR REPLACE FUNCTION public.submit_quiz_result_v2(
  p_quiz_id text,
  p_score int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_lesson_bonus boolean;
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_final_quiz int;
BEGIN
  -- 1. Validation
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Not authenticated',
      'already_awarded', false
    );
  END IF;

  v_is_lesson_bonus := p_quiz_id LIKE 'lesson_bonus_%';

  -- 2. Insert into quiz_attempts (Idempotent)
  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
  VALUES (v_user_id, p_quiz_id, p_score, 0)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  -- 3. Update Profile (Only if newly inserted, OR if points seem missing)
  -- We always run the update but with logic to prevent double counting if the row already existed.
  -- Actually, the safest way is to only update if v_inserted_rows > 0.
  
  IF v_inserted_rows > 0 THEN
    IF v_is_lesson_bonus THEN
      UPDATE profiles 
      SET 
        points = COALESCE(points, 0) + p_score,
        reading_points = COALESCE(reading_points, 0) + p_score,
        updated_at = NOW()
      WHERE id = v_user_id;
    ELSE
      UPDATE profiles 
      SET 
        points = COALESCE(points, 0) + p_score,
        quiz_points = COALESCE(quiz_points, 0) + p_score,
        updated_at = NOW()
      WHERE id = v_user_id;
    END IF;
  END IF;

  -- 4. Get final values for confirmation
  SELECT points, reading_points, quiz_points 
  INTO v_final_points, v_final_reading, v_final_quiz
  FROM profiles 
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'points', v_final_points,
    'reading_points', v_final_reading,
    'quiz_points', v_final_quiz,
    'new_attempt', (v_inserted_rows > 0)
  );
END;
$$;
