-- Run this script in your Supabase SQL Editor
-- This version supports single-row cumulative hourly quiz scoring

-- 1. Ensure the Unique Constraint exists (CRITICAL for ON CONFLICT)
alter table quiz_attempts 
drop constraint if exists quiz_attempts_user_id_quiz_id_key;

alter table quiz_attempts
add constraint quiz_attempts_user_id_quiz_id_key unique (user_id, quiz_id);

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
  old_data record;
  score_delta int := 0;
  penalty_delta int := 0;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'Not authenticated'; end if;

  -- 1. Get existing data for this quiz if it exists
  select score, penalty into old_data 
  from quiz_attempts 
  where user_id = current_user_id and quiz_id = p_quiz_id;

  -- 2. Insert or Update quiz_attempts
  insert into quiz_attempts (user_id, quiz_id, score, penalty)
  values (current_user_id, p_quiz_id, p_score, p_penalty)
  on conflict (user_id, quiz_id) do update set
    score = CASE 
      WHEN p_quiz_id = 'hourly-challenge' THEN quiz_attempts.score + EXCLUDED.score
      ELSE EXCLUDED.score
    END,
    penalty = CASE 
      WHEN p_quiz_id = 'hourly-challenge' THEN quiz_attempts.penalty + EXCLUDED.penalty
      ELSE EXCLUDED.penalty
    END,
    created_at = EXCLUDED.created_at;

  -- 3. Calculate deltas for profiles table
  if p_quiz_id = 'hourly-challenge' then
    score_delta := p_score;
    penalty_delta := p_penalty;
  else
    score_delta := p_score - coalesce(old_data.score, 0);
    penalty_delta := p_penalty - coalesce(old_data.penalty, 0);
  end if;

  -- 4. Update profile points and penalties
  update profiles
  set points = greatest(0, coalesce(points, 0) + score_delta),
      total_penalties = coalesce(total_penalties, 0) + penalty_delta
  where id = current_user_id;
end;
$$;
