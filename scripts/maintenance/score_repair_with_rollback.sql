-- Score Repair With Mandatory Rollback Path
-- Purpose:
-- 1) Snapshot current score state to rollback tables.
-- 2) Recompute profile score columns from quiz_attempts in one transaction.
-- 3) Validate key mismatch metrics after repair.
--
-- IMPORTANT:
-- - Run in Supabase SQL editor during low traffic window.
-- - Do not edit manually unless you understand every statement.

begin;

-- 0a) Prevent BEFORE UPDATE trigger from overwriting `points` during repair.
--     Trigger: trg_sync_profile_points ON (completed_lessons, quiz_points)
--     Without this, repair sets points then trigger may recompute points from stale logic.
do $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'trg_sync_profile_points'
      and not t.tgisinternal
  ) then
    execute 'alter table public.profiles disable trigger trg_sync_profile_points';
  end if;
end $$;

-- 0) Rollback storage tables (created once, reused)
create table if not exists score_repair_backup_profiles (
  backup_id text not null,
  backed_up_at timestamptz not null default now(),
  user_id uuid not null,
  full_name text,
  points int,
  reading_points int,
  quiz_points int,
  total_penalties int,
  primary key (backup_id, user_id)
);

create table if not exists score_repair_backup_attempts (
  backup_id text not null,
  backed_up_at timestamptz not null default now(),
  attempt_id uuid not null,
  user_id uuid not null,
  quiz_id text not null,
  score int,
  penalty int,
  created_at timestamptz,
  primary key (backup_id, attempt_id)
);

-- 1) Create deterministic backup id for this run
create temporary table _score_repair_ctx as
select 'score_repair_' || to_char(now(), 'YYYYMMDD_HH24MISS') as backup_id;

-- 2) Snapshot profiles + attempts
insert into score_repair_backup_profiles (
  backup_id, user_id, full_name, points, reading_points, quiz_points, total_penalties
)
select
  c.backup_id,
  p.id,
  p.full_name,
  coalesce(p.points, 0),
  coalesce(p.reading_points, 0),
  coalesce(p.quiz_points, 0),
  coalesce(p.total_penalties, 0)
from profiles p
cross join _score_repair_ctx c;

insert into score_repair_backup_attempts (
  backup_id, attempt_id, user_id, quiz_id, score, penalty, created_at
)
select
  c.backup_id,
  qa.id,
  qa.user_id,
  qa.quiz_id,
  coalesce(qa.score, 0),
  coalesce(qa.penalty, 0),
  qa.created_at
from quiz_attempts qa
cross join _score_repair_ctx c;

-- 3) Recompute per-user metrics from attempt history
with attempt_totals as (
  select
    qa.user_id,
    coalesce(sum(coalesce(qa.score, 0)), 0) as gross_points,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as total_penalties,
    coalesce(sum(case when qa.quiz_id like 'lesson_bonus%' then coalesce(qa.score, 0) else 0 end), 0) as reading_points
  from quiz_attempts qa
  group by qa.user_id
), repaired as (
  select
    p.id as user_id,
    coalesce(a.gross_points, 0) as gross_points,
    coalesce(a.total_penalties, 0) as total_penalties,
    coalesce(a.reading_points, 0) as reading_points
  from profiles p
  left join attempt_totals a on a.user_id = p.id
)
update profiles p
set
  total_penalties = r.total_penalties,
  reading_points = r.reading_points,
  points = greatest(0, r.gross_points - r.total_penalties),
  quiz_points = greatest(0, (r.gross_points - r.total_penalties) - r.reading_points),
  updated_at = now()
from repaired r
where p.id = r.user_id;

-- 3b) Re-enable profile sync trigger
do $$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and t.tgname = 'trg_sync_profile_points'
      and not t.tgisinternal
  ) then
    execute 'alter table public.profiles enable trigger trg_sync_profile_points';
  end if;
end $$;

-- 4) Post-repair safety diagnostics
-- 4a) Penalty mismatch count (must be zero)
with penalty_check as (
  select
    p.id,
    coalesce(p.total_penalties, 0) as profile_penalties,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as history_penalties
  from profiles p
  left join quiz_attempts qa on qa.user_id = p.id
  group by p.id, p.total_penalties
)
select
  (select backup_id from _score_repair_ctx) as backup_id,
  count(*) filter (where profile_penalties <> history_penalties) as penalty_mismatch_users
from penalty_check;

-- 4b) Impossible monthly > all-time rows (current month)
with now_ctx as (
  select extract(month from now())::int as m, extract(year from now())::int as y
)
select
  count(*) as monthly_gt_all_time_users
from monthly_leaderboard_view mv
join leaderboard_view lv on lv.user_id = mv.user_id
cross join now_ctx n
where mv.month_num = n.m
  and mv.year_num = n.y
  and coalesce(mv.points, 0) > coalesce(lv.score, 0);

commit;

-- Copy this backup id value from query result for rollback script.
