-- =============================================================================
-- Verify: did new play after score repair explain profile vs attempts drift?
-- Run in Supabase SQL Editor (read-only).
--
-- Uses the latest row in score_repair_backup_profiles as "repair time"
-- (each repair run inserts rows with backed_up_at ≈ run time).
-- =============================================================================

-- 0) When was the most recent repair snapshot?
with latest as (
  select max(backed_up_at) as t from score_repair_backup_profiles
)
select
  l.t as last_repair_at,
  (select b.backup_id from score_repair_backup_profiles b where b.backed_up_at = l.t limit 1) as latest_backup_id
from latest l;

-- 1) For users who still show drift in debug query 2, paste their names below
--    (or remove the WHERE filter to scan everyone with drift).
with repair_time as (
  select coalesce(max(backed_up_at), 'epoch'::timestamptz) as t
  from score_repair_backup_profiles
),
attempt_totals as (
  select
    qa.user_id,
    coalesce(sum(coalesce(qa.score, 0)), 0) as gross_all,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as pen_all,
    coalesce(sum(coalesce(qa.score, 0)) filter (where qa.created_at < (select t from repair_time)), 0) as gross_before,
    coalesce(sum(coalesce(qa.penalty, 0)) filter (where qa.created_at < (select t from repair_time)), 0) as pen_before,
    coalesce(sum(coalesce(qa.score, 0)) filter (where qa.created_at >= (select t from repair_time)), 0) as gross_after,
    coalesce(sum(coalesce(qa.penalty, 0)) filter (where qa.created_at >= (select t from repair_time)), 0) as pen_after,
    count(*) filter (where qa.created_at >= (select t from repair_time)) as attempts_after_repair
  from public.quiz_attempts qa
  group by qa.user_id
),
drift_users as (
  select
    p.id,
    p.full_name,
    coalesce(p.points, 0) as profile_points,
    coalesce(a.gross_all - a.pen_all, 0) as net_from_attempts_all
  from public.profiles p
  join attempt_totals a on a.user_id = p.id
  where coalesce(p.points, 0) <> coalesce(a.gross_all - a.pen_all, 0)
)
select
  d.full_name,
  (select t from repair_time) as repair_cutoff,
  d.profile_points,
  d.net_from_attempts_all,
  d.profile_points - d.net_from_attempts_all as drift_total,
  a.gross_before,
  a.pen_before,
  (a.gross_before - a.pen_before) as net_before_repair_cutoff,
  a.gross_after,
  a.pen_after,
  (a.gross_after - a.pen_after) as net_after_repair_cutoff,
  a.attempts_after_repair,
  p.updated_at as profile_updated_at
from drift_users d
join attempt_totals a on a.user_id = d.id
join public.profiles p on p.id = d.id
where d.full_name in ('Jahangir Alam', 'Abujar Rahaman', 'Jalaluddin Ahamed')
order by abs(d.profile_points - d.net_from_attempts_all) desc;

-- 2) Interpretation (no query output):
--    If attempts_after_repair > 0 AND net_after_repair_cutoff ≈ drift_total,
--    then new play after repair explains the gap.
--    If attempts_after_repair = 0 but drift_total <> 0, drift is NOT from post-repair play;
--    then re-run repair or investigate non-attempt score changes / mixed score semantics in rows.
