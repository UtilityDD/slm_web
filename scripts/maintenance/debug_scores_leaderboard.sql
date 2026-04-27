-- =============================================================================
-- SCORES + LEADERBOARD: DATABASE DEBUG (read-only)
-- Run in Supabase SQL Editor after notifications are stable.
-- =============================================================================

begin;
set transaction read only;

-- 1) Penalty drift: profile vs sum(attempts)
with penalty_check as (
  select
    p.id,
    p.full_name,
    coalesce(p.total_penalties, 0) as profile_penalties,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as history_penalties,
    coalesce(p.total_penalties, 0) - coalesce(sum(coalesce(qa.penalty, 0)), 0) as diff
  from public.profiles p
  left join public.quiz_attempts qa on qa.user_id = p.id
  group by p.id, p.full_name, p.total_penalties
)
select *
from penalty_check
where diff <> 0
order by abs(diff) desc
limit 50;

-- 2) Profile points vs gross-minus-penalty from attempts (sanity)
with attempt_totals as (
  select
    qa.user_id,
    coalesce(sum(coalesce(qa.score, 0)), 0) as gross_score,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as sum_penalty,
    coalesce(sum(coalesce(qa.score, 0)), 0) - coalesce(sum(coalesce(qa.penalty, 0)), 0) as net_from_attempts
  from public.quiz_attempts qa
  group by qa.user_id
)
select
  p.full_name,
  coalesce(p.points, 0) as profile_points,
  coalesce(a.net_from_attempts, 0) as net_from_attempts,
  coalesce(p.points, 0) - coalesce(a.net_from_attempts, 0) as diff
from public.profiles p
left join attempt_totals a on a.user_id = p.id
where coalesce(p.points, 0) <> coalesce(a.net_from_attempts, 0)
order by abs(coalesce(p.points, 0) - coalesce(a.net_from_attempts, 0)) desc
limit 50;

-- 3) Current month: monthly view points vs all-time leaderboard score
with now_ctx as (
  select extract(month from now())::int as m, extract(year from now())::int as y
)
select
  p.full_name,
  coalesce(lv.score, 0) as all_time_score,
  coalesce(mv.points, 0) as monthly_points,
  coalesce(mv.points, 0) - coalesce(lv.score, 0) as monthly_minus_alltime
from public.monthly_leaderboard_view mv
join public.leaderboard_view lv on lv.user_id = mv.user_id
join public.profiles p on p.id = mv.user_id
cross join now_ctx n
where mv.month_num = n.m
  and mv.year_num = n.y
  and coalesce(mv.points, 0) > coalesce(lv.score, 0)
order by monthly_minus_alltime desc
limit 50;

-- 4) Recent hourly attempts with penalty (last 48 hours)
select
  qa.user_id,
  p.full_name,
  qa.quiz_id,
  qa.score,
  qa.penalty,
  qa.created_at
from public.quiz_attempts qa
join public.profiles p on p.id = qa.user_id
where qa.quiz_id like 'hourly-challenge-%'
  and qa.created_at >= now() - interval '48 hours'
  and coalesce(qa.penalty, 0) > 0
order by qa.created_at desc
limit 100;

rollback;
