-- Run this script in your Supabase SQL Editor
-- This version adds Penalty Tracking

-- 1. Ensure the column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_penalties int DEFAULT 0;

-- 2. Update the function
create or replace function submit_quiz_result(
  p_quiz_id text, 
  p_score int,
  p_penalty int default 0 -- New parameter for penalty
)
returns void
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  -- Get the ID of the currently logged-in user
  current_user_id := auth.uid();
  
  -- Ensure user is logged in
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Insert the attempt record (History)
  insert into quiz_attempts (user_id, quiz_id, score)
  values (current_user_id, p_quiz_id, p_score);

  -- 2. Update the profile score (Total for User)
  update profiles
  set points = coalesce(points, 0) + p_score,
      total_penalties = coalesce(total_penalties, 0) + p_penalty -- Track penalty
  where id = current_user_id;
  
end;
$$;
