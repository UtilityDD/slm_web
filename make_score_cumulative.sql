-- Run this script to switch to "Incremental Single Row" storage

-- 1. CLEANUP: Delete duplicate rows (keeping the most recent ones) if any exist
-- This ensures we can add a unique constraint safely
delete from quiz_attempts a using quiz_attempts b
where a.id < b.id and a.user_id = b.user_id and a.quiz_id = b.quiz_id;

-- 2. CONSTRAINT: Make sure (user_id + quiz_id) is Unique
alter table quiz_attempts 
drop constraint if exists quiz_attempts_user_quiz_unique;

alter table quiz_attempts 
add constraint quiz_attempts_user_quiz_unique unique (user_id, quiz_id);

-- 3. RPC: Update the function to "Upsert" (Add to existing score)
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
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Upsert Logic: Insert new OR Add to existing
  insert into quiz_attempts (user_id, quiz_id, score)
  values (current_user_id, p_quiz_id, p_score)
  on conflict (user_id, quiz_id) 
  do update set 
    score = quiz_attempts.score + EXCLUDED.score, -- <--- INCREMENT logic
    created_at = now(); -- Update last played time

  -- Also update the global profile total
  update profiles
  set points = coalesce(points, 0) + p_score
  where id = current_user_id;
end;
$$;
