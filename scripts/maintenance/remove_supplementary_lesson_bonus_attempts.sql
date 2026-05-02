-- =============================================================================
-- Remove erroneous Life Skills (supplementary) reading bonuses from the DB
-- =============================================================================
-- Problem: Core training awards `lesson_bonus_<chapter.lesson>` (e.g. 1.1).
--          Supplementary modules use ids like `supp_10_1` and must NOT create
--          `lesson_bonus_supp_*` rows or server reading points.
--
-- This script (apply section only after running the preview):
--   1) Lists users who have `lesson_bonus_supp_%` attempts
--   2) Deletes those attempt rows
--   3) Recomputes profiles.points, reading_points, quiz_points, total_penalties
--      for affected users only (same net split as score_repair_with_rollback.sql)
--   4) Strips `supp_*` strings from profiles.completed_lessons JSON array
--
-- Run in Supabase SQL Editor. Prefer a low-traffic window. Take a backup first.
-- If you use `trg_sync_profile_points` on profiles, disable it for the UPDATE
-- block like score_repair_with_rollback.sql (optional DO block below).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) PREVIEW — who is affected (read-only; run alone first)
-- ---------------------------------------------------------------------------
select
  qa.user_id,
  p.full_name,
  p.slm_id,
  qa.quiz_id,
  qa.score,
  qa.created_at
from quiz_attempts qa
left join profiles p on p.id = qa.user_id
where qa.quiz_id like 'lesson_bonus_supp\_%' escape '\'
order by qa.created_at desc;

select count(*) as bad_attempt_rows
from quiz_attempts
where quiz_id like 'lesson_bonus_supp\_%' escape '\';

-- Distinct users + current profile reading (preview impact)
select
  p.id as user_id,
  p.full_name,
  p.slm_id,
  p.reading_points as profile_reading_points_before,
  p.completed_lessons,
  count(qa.id) as bad_bonus_rows,
  coalesce(sum(qa.score), 0) as bad_bonus_score_sum
from quiz_attempts qa
join profiles p on p.id = qa.user_id
where qa.quiz_id like 'lesson_bonus_supp\_%' escape '\'
group by p.id, p.full_name, p.slm_id, p.reading_points, p.completed_lessons
order by bad_bonus_rows desc;

-- ---------------------------------------------------------------------------
-- A2) If A shows 0 rows — broader search (still read-only)
-- ---------------------------------------------------------------------------
-- Any attempt row whose quiz_id mentions "supp" (case-insensitive)
select quiz_id, count(*) as row_count, coalesce(sum(score), 0) as score_sum
from quiz_attempts
where quiz_id ilike '%supp%'
group by quiz_id
order by row_count desc;

-- Any lesson_bonus row that does NOT look like core chapter.lesson (digits.digits)
-- (may include typos, old experiments, or non-standard ids)
select qa.quiz_id, count(*) as row_count, coalesce(sum(qa.score), 0) as score_sum
from quiz_attempts qa
where qa.quiz_id like 'lesson_bonus\_%' escape '\'
  and qa.quiz_id !~ E'^lesson_bonus_[0-9]+\\.[0-9]+$'
group by qa.quiz_id
order by row_count desc;

-- Profiles that still store supplementary ids in completed_lessons (even if attempts are gone)
select
  p.id,
  p.full_name,
  p.reading_points,
  p.completed_lessons
from profiles p
where exists (
  select 1
  from jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb)) e
  where lower(e) like 'supp\_%' escape '\'
)
order by p.updated_at desc nulls last;

-- ---------------------------------------------------------------------------
-- B) APPLY — uncomment the whole block from BEGIN through COMMIT when ready
-- ---------------------------------------------------------------------------
/*
begin;

-- Optional: disable profile sync trigger during repair (if it exists)
do $$
begin
  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and t.tgname = 'trg_sync_profile_points' and not t.tgisinternal
  ) then
    execute 'alter table public.profiles disable trigger trg_sync_profile_points';
  end if;
end $$;

create temporary table _supp_bonus_victims (user_id uuid primary key) on commit drop;

insert into _supp_bonus_victims (user_id)
select distinct user_id
from quiz_attempts
where quiz_id like 'lesson_bonus_supp\_%' escape '\';

delete from quiz_attempts
where quiz_id like 'lesson_bonus_supp\_%' escape '\';

-- Recompute score columns for everyone who lost a supplementary bonus row
with attempt_totals as (
  select
    qa.user_id,
    coalesce(sum(coalesce(qa.score, 0)), 0) as gross_points,
    coalesce(sum(coalesce(qa.penalty, 0)), 0) as total_penalties,
    coalesce(
      sum(case when qa.quiz_id like 'lesson_bonus%' then coalesce(qa.score, 0) else 0 end),
      0
    ) as reading_points
  from quiz_attempts qa
  where qa.user_id in (select user_id from _supp_bonus_victims)
  group by qa.user_id
)
update profiles p
set
  total_penalties = coalesce(at.total_penalties, 0),
  reading_points = coalesce(at.reading_points, 0),
  points = greatest(0, coalesce(at.gross_points, 0) - coalesce(at.total_penalties, 0)),
  quiz_points = greatest(
    0,
    (coalesce(at.gross_points, 0) - coalesce(at.total_penalties, 0)) - coalesce(at.reading_points, 0)
  ),
  updated_at = now()
from _supp_bonus_victims v
left join attempt_totals at on at.user_id = v.user_id
where p.id = v.user_id;

-- Strip supplementary ids from completed_lessons (server should be core-only)
update profiles p
set
  completed_lessons = coalesce(
    (
      select jsonb_agg(to_jsonb(e))
      from jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb)) as e
      where lower(e) not like 'supp\_%' escape '\'
    ),
    '[]'::jsonb
  ),
  updated_at = now()
where p.id in (select user_id from _supp_bonus_victims)
  and exists (
    select 1
    from jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb)) e
    where lower(e) like 'supp\_%' escape '\'
  );

do $$
begin
  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and t.tgname = 'trg_sync_profile_points' and not t.tgisinternal
  ) then
    execute 'alter table public.profiles enable trigger trg_sync_profile_points';
  end if;
end $$;

commit;
*/
