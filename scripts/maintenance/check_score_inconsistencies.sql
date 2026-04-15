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

rollback;
