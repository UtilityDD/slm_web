-- Read-only diagnostics for score inconsistencies.
-- Safe to run in Supabase SQL editor. No data mutation statements are used.

begin;
set transaction read only;

-- 1) Quick health snapshot
select
  (select count(*) from profiles) as total_profiles,
  (select count(*) from quiz_attempts) as total_attempts,
  (select count(*) from profiles where coalesce(points, 0) < 0) as negative_points_profiles,
  (select count(*) from profiles where coalesce(reading_points, 0) < 0) as negative_reading_profiles,
  (select count(*) from profiles where coalesce(quiz_points, 0) < 0) as negative_quiz_profiles,
  (select count(*) from quiz_attempts where coalesce(score, 0) < 0) as negative_attempt_rows;

-- 2) Profiles that are currently negative in any score bucket
select
  p.id,
  p.full_name,
  p.role,
  p.points,
  p.reading_points,
  p.quiz_points,
  p.total_penalties,
  p.updated_at
from profiles p
where coalesce(p.points, 0) < 0
   or coalesce(p.reading_points, 0) < 0
   or coalesce(p.quiz_points, 0) < 0
order by p.points asc nulls last, p.reading_points asc nulls last, p.quiz_points asc nulls last;

-- 3) Recomputed totals from quiz_attempts (source-of-truth style)
with computed as (
  select
    qa.user_id,
    coalesce(sum(qa.score), 0) as calc_points,
    coalesce(sum(case when qa.quiz_id like 'lesson_bonus%' then qa.score else 0 end), 0) as calc_reading_points,
    coalesce(sum(case when qa.quiz_id not like 'lesson_bonus%' then qa.score else 0 end), 0) as calc_quiz_points,
    coalesce(sum(qa.penalty), 0) as calc_total_penalties,
    count(*) as attempts_count
  from quiz_attempts qa
  group by qa.user_id
)
select
  p.id,
  p.full_name,
  p.role,
  coalesce(p.points, 0) as profile_points,
  coalesce(c.calc_points, 0) as computed_points,
  coalesce(p.points, 0) - coalesce(c.calc_points, 0) as diff_points,
  coalesce(p.reading_points, 0) as profile_reading_points,
  coalesce(c.calc_reading_points, 0) as computed_reading_points,
  coalesce(p.reading_points, 0) - coalesce(c.calc_reading_points, 0) as diff_reading_points,
  coalesce(p.quiz_points, 0) as profile_quiz_points,
  coalesce(c.calc_quiz_points, 0) as computed_quiz_points,
  coalesce(p.quiz_points, 0) - coalesce(c.calc_quiz_points, 0) as diff_quiz_points,
  coalesce(p.total_penalties, 0) as profile_total_penalties,
  coalesce(c.calc_total_penalties, 0) as computed_total_penalties,
  coalesce(p.total_penalties, 0) - coalesce(c.calc_total_penalties, 0) as diff_total_penalties,
  coalesce(c.attempts_count, 0) as attempts_count
from profiles p
left join computed c on c.user_id = p.id
where
  coalesce(p.points, 0) <> coalesce(c.calc_points, 0)
  or coalesce(p.reading_points, 0) <> coalesce(c.calc_reading_points, 0)
  or coalesce(p.quiz_points, 0) <> coalesce(c.calc_quiz_points, 0)
  or coalesce(p.total_penalties, 0) <> coalesce(c.calc_total_penalties, 0)
order by abs(coalesce(p.points, 0) - coalesce(c.calc_points, 0)) desc,
         abs(coalesce(p.reading_points, 0) - coalesce(c.calc_reading_points, 0)) desc,
         abs(coalesce(p.quiz_points, 0) - coalesce(c.calc_quiz_points, 0)) desc;

-- 3b) Penalty mismatch check
-- This isolates profiles where total_penalties no longer matches the sum of penalties in quiz_attempts.
with penalty_computed as (
  select
    qa.user_id,
    coalesce(sum(qa.penalty), 0) as calc_total_penalties,
    count(*) filter (where coalesce(qa.penalty, 0) <> 0) as penalty_attempts_count,
    min(qa.created_at) filter (where coalesce(qa.penalty, 0) <> 0) as first_penalty_attempt_at,
    max(qa.created_at) filter (where coalesce(qa.penalty, 0) <> 0) as last_penalty_attempt_at
  from quiz_attempts qa
  group by qa.user_id
)
select
  p.id,
  p.full_name,
  p.role,
  coalesce(p.total_penalties, 0) as profile_total_penalties,
  coalesce(c.calc_total_penalties, 0) as computed_total_penalties,
  coalesce(p.total_penalties, 0) - coalesce(c.calc_total_penalties, 0) as diff_total_penalties,
  coalesce(c.penalty_attempts_count, 0) as penalty_attempts_count,
  c.first_penalty_attempt_at,
  c.last_penalty_attempt_at,
  p.updated_at
from profiles p
left join penalty_computed c on c.user_id = p.id
where coalesce(p.total_penalties, 0) <> coalesce(c.calc_total_penalties, 0)
order by abs(coalesce(p.total_penalties, 0) - coalesce(c.calc_total_penalties, 0)) desc,
         p.full_name;

-- 4) Users with points below 1000 but negative attempts in history
-- This helps verify policy violations for low-score users.
select
  p.id,
  p.full_name,
  p.role,
  coalesce(p.points, 0) as profile_points,
  count(*) filter (where qa.score < 0) as negative_attempt_count,
  min(qa.score) as most_negative_attempt,
  max(qa.created_at) filter (where qa.score < 0) as last_negative_attempt_at
from profiles p
left join quiz_attempts qa on qa.user_id = p.id
group by p.id, p.full_name, p.role, p.points
having coalesce(p.points, 0) < 1000
   and count(*) filter (where qa.score < 0) > 0
order by negative_attempt_count desc, profile_points asc;

-- 5) Potential reset anomalies
-- 5a) Profiles reset to zero but still have attempts (partial reset symptom)
select
  p.id,
  p.full_name,
  p.role,
  p.points,
  p.reading_points,
  p.quiz_points,
  count(qa.id) as attempts_count,
  max(qa.created_at) as last_attempt_at
from profiles p
left join quiz_attempts qa on qa.user_id = p.id
where coalesce(p.points, 0) = 0
  and coalesce(p.reading_points, 0) = 0
  and coalesce(p.quiz_points, 0) = 0
group by p.id, p.full_name, p.role, p.points, p.reading_points, p.quiz_points
having count(qa.id) > 0
order by attempts_count desc;

-- 5b) Global reset skip candidates (role is NULL and not reset)
select
  p.id,
  p.full_name,
  p.role,
  p.points,
  p.reading_points,
  p.quiz_points
from profiles p
where p.role is null
  and (
    coalesce(p.points, 0) <> 0
    or coalesce(p.reading_points, 0) <> 0
    or coalesce(p.quiz_points, 0) <> 0
  )
order by p.points desc;

-- 6) Leaderboard mismatch check
-- If leaderboard_view should mirror profiles.points, these rows indicate mismatch.
select
  lv.user_id,
  lv.full_name,
  lv.score as leaderboard_score,
  p.points as profile_points,
  lv.score - p.points as diff
from leaderboard_view lv
join profiles p on p.id = lv.user_id
where coalesce(lv.score, 0) <> coalesce(p.points, 0)
order by abs(lv.score - p.points) desc;

-- 7) Rank stage mismatch check
-- This catches profiles where training_level/badge no longer matches completed_lessons.
with chapter_counts as (
  select * from (
    values
      (1, 10), (2, 10), (3, 10), (4, 10), (5, 10),
      (6, 11), (7, 10), (8, 10), (9, 10)
  ) as t(chapter_num, lesson_count)
), chapter_progress as (
  select
    p.id,
    p.full_name,
    coalesce(p.training_level, 0) as profile_training_level,
    cc.chapter_num,
    cc.lesson_count,
    count(*) filter (
      where exists (
        select 1
        from jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb)) as lesson_id
        where lesson_id = cc.chapter_num::text || '.' || gs.lesson_num::text
      )
    ) as matched_lessons
  from profiles p
  cross join chapter_counts cc
  cross join lateral generate_series(1, cc.lesson_count) as gs(lesson_num)
  group by p.id, p.full_name, p.training_level, cc.chapter_num, cc.lesson_count
), computed as (
  select
    id,
    full_name,
    profile_training_level,
    coalesce(max(case when matched_lessons = lesson_count then chapter_num else 0 end), 0) as computed_training_level
  from chapter_progress
  group by id, full_name, profile_training_level
)
select
  id,
  full_name,
  profile_training_level,
  computed_training_level,
  profile_training_level - computed_training_level as diff
from computed
where profile_training_level <> computed_training_level
order by abs(profile_training_level - computed_training_level) desc, full_name;

-- 8) Targeted penalty history for Prasanta Majhi
-- Use this to inspect whether the stored penalty total was rebuilt, reset, or only changed through attempts.
with target_user as (
  select id, full_name, role, points, reading_points, quiz_points, total_penalties, training_level, completed_lessons, updated_at
  from profiles
  where full_name ilike '%Prasanta Majhi%'
     or full_name ilike '%Prasanta%Majhi%'
), penalty_history as (
  select
    qa.user_id,
    qa.quiz_id,
    qa.score,
    coalesce(qa.penalty, 0) as penalty,
    qa.created_at,
    sum(coalesce(qa.penalty, 0)) over (
      partition by qa.user_id
      order by qa.created_at, qa.quiz_id, qa.id
      rows between unbounded preceding and current row
    ) as running_penalty
  from quiz_attempts qa
  join target_user tu on tu.id = qa.user_id
)
select
  tu.id,
  tu.full_name,
  tu.role,
  tu.total_penalties as profile_total_penalties,
  coalesce((select sum(coalesce(penalty, 0)) from penalty_history ph where ph.user_id = tu.id), 0) as computed_penalty_from_attempts,
  tu.total_penalties - coalesce((select sum(coalesce(penalty, 0)) from penalty_history ph where ph.user_id = tu.id), 0) as diff,
  tu.training_level,
  tu.points,
  tu.reading_points,
  tu.quiz_points,
  tu.updated_at,
  tu.completed_lessons
from target_user tu;

with target_user as (
  select id
  from profiles
  where full_name ilike '%Prasanta Majhi%'
     or full_name ilike '%Prasanta%Majhi%'
), penalty_history as (
  select
    qa.user_id,
    qa.quiz_id,
    qa.score,
    coalesce(qa.penalty, 0) as penalty,
    qa.created_at,
    sum(coalesce(qa.penalty, 0)) over (
      partition by qa.user_id
      order by qa.created_at, qa.quiz_id, qa.id
      rows between unbounded preceding and current row
    ) as running_penalty
  from quiz_attempts qa
  join target_user tu on tu.id = qa.user_id
)
select
  ph.quiz_id,
  ph.score,
  ph.penalty,
  ph.running_penalty,
  ph.created_at
from penalty_history ph
order by ph.created_at asc, ph.quiz_id asc;

rollback;
