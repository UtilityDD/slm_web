-- Focused fix: reading badge consistency only.
-- This script ONLY syncs profiles.training_level from profiles.completed_lessons.
-- It does NOT modify points, reading_points, quiz_points, penalties, or attempts.
-- Scoped now to Sanjay Gorai only.
-- Run in Supabase SQL editor.
--
-- Safety workflow:
-- 1) Run section A (dry-run) first.
-- 2) If preview looks correct, run full script.
-- 3) Review verification output before finishing.

begin;

-- Target user (exact id scope)
-- Keep this in one place to avoid accidental broad updates.
-- Sanjay Gorai id: 3817f1ee-552f-4384-8e67-9cf4afbe8270

-- -----------------------------------------------------
-- 1) Helper: compute sequential level from completed_lessons
-- -----------------------------------------------------
create or replace function public.compute_training_level_from_completed_lessons(p_completed_lessons jsonb)
returns int
language plpgsql
as $$
declare
  lessons jsonb := coalesce(p_completed_lessons, '[]'::jsonb);
  chapter_num int;
  lesson_count int;
  lesson_num int;
  all_completed boolean;
  current_level int := 0;
begin
  for chapter_num, lesson_count in
    select *
    from (values
      (1, 10), (2, 10), (3, 10), (4, 10), (5, 10),
      (6, 11), (7, 10), (8, 10), (9, 10)
    ) as t(chapter_num, lesson_count)
    order by chapter_num
  loop
    all_completed := true;

    for lesson_num in 1..lesson_count loop
      if not exists (
        select 1
        from jsonb_array_elements_text(lessons) as lesson_id
        where lesson_id = chapter_num::text || '.' || lesson_num::text
      ) then
        all_completed := false;
        exit;
      end if;
    end loop;

    if all_completed then
      current_level := chapter_num;
    else
      exit;
    end if;
  end loop;

  return current_level;
end;
$$;


-- -----------------------------------------------------
-- A) DRY-RUN PREVIEW (read-only): what would change?
-- -----------------------------------------------------
with computed as (
  select
    p.id,
    p.full_name,
    coalesce(p.training_level, 0) as profile_training_level,
    greatest(1, public.compute_training_level_from_completed_lessons(coalesce(p.completed_lessons, '[]'::jsonb))) as calc_training_level,
    jsonb_array_length(coalesce(p.completed_lessons, '[]'::jsonb)) as completed_lessons_count,
    p.updated_at
  from profiles p
  where p.id = '3817f1ee-552f-4384-8e67-9cf4afbe8270'
), to_change as (
  select *
  from computed
  where profile_training_level is distinct from calc_training_level
)
select *
from to_change
order by abs(profile_training_level - calc_training_level) desc, full_name;

-- Stop after dry-run if needed. Full write path continues below.


-- -----------------------------------------------------
-- 2) Backup only rows whose training_level will change
-- -----------------------------------------------------
with computed as (
  select
    p.id,
    p.full_name,
    p.points,
    p.reading_points,
    p.quiz_points,
    p.completed_lessons,
    p.training_level,
    greatest(1, public.compute_training_level_from_completed_lessons(coalesce(p.completed_lessons, '[]'::jsonb))) as calc_training_level
  from profiles p
  where p.id = '3817f1ee-552f-4384-8e67-9cf4afbe8270'
), to_change as (
  select *
  from computed
  where coalesce(training_level, 0) is distinct from calc_training_level
)
insert into backup_profiles_progress (
  user_id,
  full_name,
  points,
  reading_points,
  quiz_points,
  completed_lessons,
  training_level
)
select
  tc.id,
  tc.full_name,
  tc.points,
  tc.reading_points,
  tc.quiz_points,
  tc.completed_lessons,
  tc.training_level
from to_change tc;


-- -----------------------------------------------------
-- 3) Reconcile training_level only
-- -----------------------------------------------------
with computed as (
  select
    p.id,
    greatest(1, public.compute_training_level_from_completed_lessons(coalesce(p.completed_lessons, '[]'::jsonb))) as calc_training_level
  from profiles p
  where p.id = '3817f1ee-552f-4384-8e67-9cf4afbe8270'
)
update profiles p
set
  training_level = c.calc_training_level,
  updated_at = now()
from computed c
where p.id = c.id
  and coalesce(p.training_level, 0) is distinct from c.calc_training_level;


-- -----------------------------------------------------
-- 4) Guardrail skipped intentionally in this Sanjay-only run
--    (to avoid introducing global behavior changes now)
-- -----------------------------------------------------
select 'Guardrail not changed (Sanjay-only scoped run)' as status;


-- -----------------------------------------------------
-- 5) Verification: should return zero rows after fix
-- -----------------------------------------------------
with computed as (
  select
    p.id,
    p.full_name,
    coalesce(p.training_level, 0) as profile_training_level,
    greatest(1, public.compute_training_level_from_completed_lessons(coalesce(p.completed_lessons, '[]'::jsonb))) as calc_training_level
  from profiles p
  where p.id = '3817f1ee-552f-4384-8e67-9cf4afbe8270'
)
select
  id,
  full_name,
  profile_training_level,
  calc_training_level,
  profile_training_level - calc_training_level as diff
from computed
where profile_training_level <> calc_training_level
order by abs(profile_training_level - calc_training_level) desc, full_name;

commit;
