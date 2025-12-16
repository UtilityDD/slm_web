-- Run this script in your Supabase SQL Editor

create or replace function submit_quiz_result(
  p_quiz_id text, 
  p_score int
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
  set points = coalesce(points, 0) + p_score
  where id = current_user_id;
  
end;
$$;
