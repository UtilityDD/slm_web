-- Run this script in your Supabase SQL Editor
-- This version adds Penalty Tracking, Idempotency, and Negative Score Protection

-- 1. Ensure the Unique Constraint exists (CRITICAL for ON CONFLICT)
-- First, clean up any existing duplicates that might prevent adding the constraint
delete from quiz_attempts t1
using quiz_attempts t2
where t1.id < t2.id 
  and t1.user_id = t2.user_id 
  and t1.quiz_id = t2.quiz_id;

-- Add the unique constraint
alter table quiz_attempts 
drop constraint if exists quiz_attempts_user_id_quiz_id_key;

alter table quiz_attempts
add constraint quiz_attempts_user_id_quiz_id_key unique (user_id, quiz_id);

-- 2. Hardened Synchronisation Function
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
  if current_user_id is null then raise exception 'Not authenticated'; end if;

  -- 1. Atomic Insert (Idempotent)
  insert into quiz_attempts (user_id, quiz_id, score, penalty)
  values (current_user_id, p_quiz_id, p_score, p_penalty)
  on conflict (user_id, quiz_id) do nothing;

  -- 2. Atomic Profile Update with Negative Floor (Greatest 0)
  if found then
    update profiles
    set points = greatest(0, coalesce(points, 0) + p_score),
        total_penalties = coalesce(total_penalties, 0) + p_penalty
    where id = current_user_id;
  end if;
end;
$$;
