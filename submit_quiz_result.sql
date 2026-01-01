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

  -- 1. Insert attempt record and update profile atomically
  -- We only update the profile if the insert actually happened (it wasn't a duplicate)
  -- This is the gold standard for idempotent scoring
  insert into quiz_attempts (user_id, quiz_id, score, penalty)
  values (current_user_id, p_quiz_id, p_score, p_penalty)
  on conflict (user_id, quiz_id) do nothing;

  -- 2. Only update profiles if the attempt was just created
  -- Check if the last command affected any rows
  if found then
    update profiles
    set points = coalesce(points, 0) + p_score,
        total_penalties = coalesce(total_penalties, 0) + p_penalty
    where id = current_user_id;
  end if;
  
end;
$$;
