-- Run this script in your Supabase SQL Editor
-- This version supports single-row cumulative hourly quiz scoring

-- 1. Ensure the Unique Constraint exists (CRITICAL for ON CONFLICT)
alter table quiz_attempts 
drop constraint if exists quiz_attempts_user_id_quiz_id_key;

alter table quiz_attempts
add constraint quiz_attempts_user_id_quiz_id_key unique (user_id, quiz_id);

-- 2. Updated RPC for Cumulative Scoring
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
  is_new_record boolean;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'Not authenticated'; end if;

  -- Insert or Update (Cumulative for hourly-challenge, Replace for others)
  insert into quiz_attempts (user_id, quiz_id, score, penalty)
  values (current_user_id, p_quiz_id, p_score, p_penalty)
  on conflict (user_id, quiz_id) do update set
    score = CASE 
      WHEN p_quiz_id = 'hourly-challenge' THEN quiz_attempts.score + EXCLUDED.score
      ELSE EXCLUDED.score
    END,
    penalty = EXCLUDED.penalty,
    created_at = EXCLUDED.created_at
  returning (xmax = 0) into is_new_record;

  -- Only update profile if this was a NEW record (not an update)
  if is_new_record then
    update profiles
    set points = greatest(0, coalesce(points, 0) + p_score),
        total_penalties = coalesce(total_penalties, 0) + p_penalty
    where id = current_user_id;
  end if;
end;
$$;
