-- Read-only diagnostics: reading_points / lesson_bonus rows vs completed_lessons.
-- Run in Supabase SQL Editor (service role or admin). Adjust the name filter as needed.

-- A) Snapshot for one user by name (change ILIKE pattern)
select
  p.id,
  p.full_name,
  p.role,
  p.reading_points,
  p.training_level,
  p.completed_lessons,
  p.updated_at
from profiles p
where p.full_name ilike '%Dipankar%Das%'
order by p.updated_at desc
limit 5;

-- B) All lesson_bonus attempts for those users
select
  qa.user_id,
  p.full_name,
  qa.quiz_id,
  qa.score,
  qa.penalty,
  qa.created_at
from quiz_attempts qa
join profiles p on p.id = qa.user_id
where p.full_name ilike '%Dipankar%Das%'
  and qa.quiz_id like 'lesson_bonus_%'
order by qa.created_at desc;

-- C) Users with at least one lesson_bonus attempt but empty completed_lessons (mismatch signal)
with bonus as (
  select
    user_id,
    count(*) as bonus_rows,
    coalesce(sum(score), 0) as bonus_score_sum
  from quiz_attempts
  where quiz_id like 'lesson_bonus_%'
  group by user_id
)
select
  p.id,
  p.full_name,
  p.reading_points,
  p.completed_lessons,
  b.bonus_rows,
  b.bonus_score_sum
from profiles p
join bonus b on b.user_id = p.id
where coalesce(jsonb_array_length(p.completed_lessons), 0) = 0
  and b.bonus_rows > 0
order by b.bonus_score_sum desc
limit 50;
