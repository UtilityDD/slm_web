-- 1. Add penalty column to quiz_attempts
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS penalty int DEFAULT 0;

-- 2. Update the submit_quiz_result function to store penalty in historical records
create or replace function submit_quiz_result(
  p_quiz_id text, 
  p_score int,
  p_penalty int default 0
)
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Check if the attempt already exists to prevent duplicate scoring
  if exists (select 1 from quiz_attempts where user_id = current_user_id and quiz_id = p_quiz_id) then
    return;
  end if;

  -- 2. Insert the attempt record including penalty
  insert into quiz_attempts (user_id, quiz_id, score, penalty)
  values (current_user_id, p_quiz_id, p_score, p_penalty);

  -- 3. Update the profile score AND total penalty
  update profiles
  set points = coalesce(points, 0) + p_score,
      total_penalties = coalesce(total_penalties, 0) + p_penalty
  where id = current_user_id;
end;
$$;
