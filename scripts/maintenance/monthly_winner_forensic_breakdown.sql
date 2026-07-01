-- =============================================================================
-- MONTHLY WINNER FORENSIC BREAKDOWN (read-only)
-- Run in Supabase SQL Editor. Adjust target month/year in params CTE if needed.
-- Default: previous calendar month (server clock / session TZ).
-- =============================================================================

begin;
set transaction read only;

-- ── Target period (edit here to pin a specific month) ─────────────────────────
with params as (
  select
    extract(month from (date_trunc('month', now()) - interval '1 month'))::int as month_num,
    extract(year from (date_trunc('month', now()) - interval '1 month'))::int as year_num
),
month_bounds as (
  select
    p.month_num,
    p.year_num,
    make_timestamptz(p.year_num, p.month_num, 1, 0, 0, 0, 'UTC') as month_start_utc,
    make_timestamptz(p.year_num, p.month_num, 1, 0, 0, 0, 'UTC') + interval '1 month' as month_end_utc
  from params p
),
ranked as (
  select
    mv.*,
    row_number() over (order by mv.points desc nulls last) as rank
  from public.monthly_leaderboard_view mv
  cross join params p
  where mv.month_num = p.month_num
    and mv.year_num = p.year_num
),
winner as (
  select * from ranked where rank = 1
),
w as (
  select user_id from winner limit 1
)

-- ── 0) Period + winner header ─────────────────────────────────────────────────
select
  '0_HEADER' as section,
  mb.year_num,
  mb.month_num,
  mb.month_start_utc,
  mb.month_end_utc,
  wn.user_id,
  wn.full_name,
  wn.points as monthly_view_points,
  wn.quiz_points as monthly_view_quiz_points,
  wn.reading_points as monthly_view_reading_points,
  wn.total_penalties as monthly_view_penalties,
  wn.training_level,
  wn.district
from winner wn
cross join month_bounds mb;

-- ── 1) Profile + all-time vs monthly (cheat / drift flags) ───────────────────
select
  '1_PROFILE_VS_VIEWS' as section,
  p.id,
  p.full_name,
  p.slm_id,
  p.created_at as profile_created_at,
  coalesce(p.points, 0) as profile_lifetime_points,
  coalesce(p.reading_points, 0) as profile_lifetime_reading,
  coalesce(p.quiz_points, 0) as profile_quiz_points,
  coalesce(p.total_penalties, 0) as profile_total_penalties,
  coalesce(lv.score, 0) as all_time_leaderboard_score,
  wn.points as monthly_view_points,
  coalesce(wn.points, 0) - coalesce(lv.score, 0) as monthly_minus_alltime,
  case
    when coalesce(wn.points, 0) > coalesce(lv.score, 0) then 'FLAG: monthly > all-time'
    else 'ok'
  end as monthly_vs_alltime_flag,
  case
    when extract(month from p.created_at at time zone 'UTC') = mb.month_num
     and extract(year from p.created_at at time zone 'UTC') = mb.year_num
    then 'joined_this_month_utc'
    else 'joined_before_month'
  end as join_bucket_utc,
  greatest(
    0,
    coalesce(p.reading_points, 0) - coalesce(wn.reading_points, 0)
  ) as app_reading_gap_if_new_user_local_month
from winner wn
join public.profiles p on p.id = wn.user_id
left join public.leaderboard_view lv on lv.user_id = wn.user_id
cross join month_bounds mb;

-- ── 2) Recomputed net from attempts in month (should match view if v2 net) ───
with w as (select user_id from winner limit 1),
month_bounds as (
  select
    extract(month from (date_trunc('month', now()) - interval '1 month'))::int as month_num,
    extract(year from (date_trunc('month', now()) - interval '1 month'))::int as year_num,
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) as month_start_utc,
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) + interval '1 month' as month_end_utc
)
select
  '2_RECOMPUTE_FROM_ATTEMPTS' as section,
  count(*) as attempt_rows_in_month,
  coalesce(sum(coalesce(qa.score, 0)), 0) as gross_score,
  coalesce(sum(coalesce(qa.penalty, 0)), 0) as sum_penalty,
  coalesce(sum(coalesce(qa.score, 0)), 0) - coalesce(sum(coalesce(qa.penalty, 0)), 0) as net_points,
  coalesce(sum(case when qa.quiz_id like 'lesson_bonus%' then coalesce(qa.score, 0) else 0 end), 0) as reading_net,
  (
    coalesce(sum(coalesce(qa.score, 0)), 0) - coalesce(sum(coalesce(qa.penalty, 0)), 0)
    - coalesce(sum(case when qa.quiz_id like 'lesson_bonus%' then coalesce(qa.score, 0) else 0 end), 0)
  ) as quiz_net
from public.quiz_attempts qa
cross join w
cross join month_bounds mb
where qa.user_id = w.user_id
  and qa.created_at >= mb.month_start_utc
  and qa.created_at < mb.month_end_utc;

-- ── 3) Breakdown by quiz category ─────────────────────────────────────────────
with w as (select user_id from winner limit 1),
month_bounds as (
  select
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) as month_start_utc,
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) + interval '1 month' as month_end_utc
)
select
  '3_BY_CATEGORY' as section,
  case
    when qa.quiz_id like 'lesson_bonus%' then 'reading_lesson_bonus'
    when qa.quiz_id like 'hourly-challenge%' then 'hourly_challenge'
    when qa.quiz_id = 'hourly-challenge' then 'hourly_challenge_legacy'
    else 'other_quiz'
  end as category,
  count(*) as rows,
  count(distinct qa.quiz_id) as distinct_quiz_ids,
  coalesce(sum(qa.score), 0) as gross_score,
  coalesce(sum(qa.penalty), 0) as penalties,
  coalesce(sum(qa.score), 0) - coalesce(sum(qa.penalty), 0) as net_points
from public.quiz_attempts qa
cross join w
cross join month_bounds mb
where qa.user_id = w.user_id
  and qa.created_at >= mb.month_start_utc
  and qa.created_at < mb.month_end_utc
group by 1
order by net_points desc;

-- ── 4) Top quiz_id rows (possible duplicate / farming) ───────────────────────
with w as (select user_id from winner limit 1),
month_bounds as (
  select
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) as month_start_utc,
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) + interval '1 month' as month_end_utc
)
select
  '4_TOP_QUIZ_IDS' as section,
  qa.quiz_id,
  count(*) as row_count,
  coalesce(sum(qa.score), 0) as gross_score,
  coalesce(sum(qa.penalty), 0) as penalties,
  coalesce(sum(qa.score), 0) - coalesce(sum(qa.penalty), 0) as net_points,
  min(qa.created_at) as first_at,
  max(qa.created_at) as last_at,
  case when count(*) > 1 then 'FLAG: duplicate user+quiz_id rows' else 'ok' end as dup_flag
from public.quiz_attempts qa
cross join w
cross join month_bounds mb
where qa.user_id = w.user_id
  and qa.created_at >= mb.month_start_utc
  and qa.created_at < mb.month_end_utc
group by qa.quiz_id
order by net_points desc
limit 40;

-- ── 5) Daily activity (burst / bot pattern) ───────────────────────────────────
with w as (select user_id from winner limit 1),
month_bounds as (
  select
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) as month_start_utc,
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) + interval '1 month' as month_end_utc
)
select
  '5_DAILY' as section,
  (qa.created_at at time zone 'UTC')::date as day_utc,
  count(*) as attempts,
  coalesce(sum(qa.score), 0) - coalesce(sum(qa.penalty), 0) as net_points
from public.quiz_attempts qa
cross join w
cross join month_bounds mb
where qa.user_id = w.user_id
  and qa.created_at >= mb.month_start_utc
  and qa.created_at < mb.month_end_utc
group by 1
order by 1;

-- ── 6) Red flags summary ──────────────────────────────────────────────────────
with w as (select user_id from winner limit 1),
params as (
  select
    extract(month from (date_trunc('month', now()) - interval '1 month'))::int as month_num,
    extract(year from (date_trunc('month', now()) - interval '1 month'))::int as year_num
),
month_bounds as (
  select
    make_timestamptz(p.year_num, p.month_num, 1, 0, 0, 0, 'UTC') as month_start_utc,
    make_timestamptz(p.year_num, p.month_num, 1, 0, 0, 0, 'UTC') + interval '1 month' as month_end_utc
  from params p
),
attempts as (
  select qa.*
  from public.quiz_attempts qa
  cross join w
  cross join month_bounds mb
  where qa.user_id = w.user_id
    and qa.created_at >= mb.month_start_utc
    and qa.created_at < mb.month_end_utc
)
select '6_RED_FLAGS' as section, flag, detail, severity
from (
  select
    'duplicate_quiz_id_rows' as flag,
    count(*)::text || ' quiz_ids with >1 row in month' as detail,
    case when count(*) > 0 then 'high' else 'none' end as severity
  from (
    select quiz_id from attempts group by quiz_id having count(*) > 1
  ) d

  union all

  select
    'hourly_score_over_100' as flag,
    count(*)::text || ' hourly rows with score > 100' as detail,
    case when count(*) > 0 then 'medium' else 'none' end
  from attempts
  where quiz_id like 'hourly-challenge%'
    and coalesce(score, 0) > 100

  union all

  select
    'negative_or_zero_net_rows' as flag,
    count(*)::text || ' rows where score < penalty' as detail,
    case when count(*) > 0 then 'low' else 'none' end
  from attempts
  where coalesce(score, 0) < coalesce(penalty, 0)

  union all

  select
    'lesson_bonus_not_20' as flag,
    count(*)::text || ' lesson_bonus rows where score <> 20' as detail,
    case when count(*) > 0 then 'medium' else 'none' end
  from attempts
  where quiz_id like 'lesson_bonus%'
    and coalesce(score, 0) <> 20

  union all

  select
    'legacy_hourly_id_format' as flag,
    count(*)::text || ' rows matching hourly-challenge-YYYYMMDDHH (no dashes in date)' as detail,
    case when count(*) > 0 then 'medium' else 'none' end
  from attempts
  where quiz_id ~ '^hourly-challenge-[0-9]{10}$'
) flags
where severity <> 'none';

-- ── 7) Full attempt ledger (chronological) ────────────────────────────────────
with w as (select user_id from winner limit 1),
month_bounds as (
  select
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) as month_start_utc,
    make_timestamptz(
      extract(year from (date_trunc('month', now()) - interval '1 month'))::int,
      extract(month from (date_trunc('month', now()) - interval '1 month'))::int,
      1, 0, 0, 0, 'UTC'
    ) + interval '1 month' as month_end_utc
)
select
  '7_LEDGER' as section,
  qa.created_at,
  qa.quiz_id,
  qa.score,
  qa.penalty,
  coalesce(qa.score, 0) - coalesce(qa.penalty, 0) as net,
  qa.id as attempt_id
from public.quiz_attempts qa
cross join w
cross join month_bounds mb
where qa.user_id = w.user_id
  and qa.created_at >= mb.month_start_utc
  and qa.created_at < mb.month_end_utc
order by qa.created_at;

rollback;
