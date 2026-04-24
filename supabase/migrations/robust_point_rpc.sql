-- AUTHORITATIVE FIX: Super Robust Quiz/Reading Point Update
CREATE OR REPLACE FUNCTION submit_quiz_result_v2(
  p_quiz_id text, 
  p_score int,
  p_penalty int DEFAULT 0,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_full_name text;
  old_data RECORD;
  score_delta int := 0;
  penalty_delta int := 0;
BEGIN
  -- Use explicit user_id if provided, otherwise fall back to auth.uid()
  current_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Validation
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_score IS NULL THEN p_score := 0; END IF;
  IF p_penalty IS NULL THEN p_penalty := 0; END IF;

  -- Fetch user's full name from profiles
  SELECT full_name INTO user_full_name 
  FROM profiles 
  WHERE id = current_user_id;

  -- 1. Get existing data for this quiz if it exists
  SELECT score, penalty INTO old_data 
  FROM quiz_attempts 
  WHERE user_id = current_user_id AND quiz_id = p_quiz_id;

  -- 2. Insert or Update quiz_attempts
  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty, full_name)
  VALUES (current_user_id, p_quiz_id, p_score, p_penalty, user_full_name)
  ON CONFLICT (user_id, quiz_id) DO UPDATE SET
    score = CASE 
      WHEN p_quiz_id = 'hourly-challenge' OR p_quiz_id LIKE 'hourly-challenge-%' THEN quiz_attempts.score + EXCLUDED.score
      ELSE EXCLUDED.score
    END,
    penalty = CASE 
      WHEN p_quiz_id = 'hourly-challenge' OR p_quiz_id LIKE 'hourly-challenge-%' THEN quiz_attempts.penalty + EXCLUDED.penalty
      ELSE EXCLUDED.penalty
    END,
    full_name = COALESCE(EXCLUDED.full_name, quiz_attempts.full_name),
    created_at = now(),
    completed_at = now();

  -- 3. Calculate deltas for profiles table
  IF p_quiz_id = 'hourly-challenge' OR p_quiz_id LIKE 'hourly-challenge-%' THEN
    score_delta := p_score;
    penalty_delta := p_penalty;
  ELSE
    score_delta := p_score - COALESCE(old_data.score, 0);
    penalty_delta := p_penalty - COALESCE(old_data.penalty, 0);
  END IF;

  -- 4. Update profile points breakdown
  UPDATE profiles
  SET 
    points = GREATEST(0, COALESCE(points, 0) + COALESCE(score_delta, 0)),
    total_penalties = COALESCE(total_penalties, 0) + COALESCE(penalty_delta, 0),
    reading_points = CASE 
        WHEN p_quiz_id LIKE 'lesson_bonus%' 
        THEN GREATEST(0, COALESCE(reading_points, 0) + COALESCE(score_delta, 0))
        ELSE reading_points
    END,
    quiz_points = CASE 
        WHEN p_quiz_id NOT LIKE 'lesson_bonus%'
        THEN GREATEST(0, COALESCE(quiz_points, 0) + COALESCE(score_delta, 0))
        ELSE quiz_points
    END,
    updated_at = now()
  WHERE id = current_user_id;
END;
$$;
