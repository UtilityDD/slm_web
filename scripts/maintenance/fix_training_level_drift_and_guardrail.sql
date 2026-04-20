-- Fix + guardrail for training_level drift.
-- Run in Supabase SQL editor.
-- This script:
--   1) Backs up profiles that will change.
--   2) Reconciles training_level from completed_lessons for existing users.
--   3) Adds a trigger so future inserts/updates keep training_level in sync.

begin;

-- -----------------------------------------------------
-- 1) Helper: compute sequential training level from completed_lessons
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
  -- Chapter lesson counts must match app logic.
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
-- 2) Backup only rows that need change
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
-- 3) Reconcile existing profiles
-- -----------------------------------------------------
with computed as (
  select
    p.id,
    greatest(1, public.compute_training_level_from_completed_lessons(coalesce(p.completed_lessons, '[]'::jsonb))) as calc_training_level
  from profiles p
)
update profiles p
set
  training_level = c.calc_training_level,
  updated_at = now()
from computed c
where p.id = c.id
  and coalesce(p.training_level, 0) is distinct from c.calc_training_level;


-- -----------------------------------------------------
-- 4) Guardrail: keep training_level synced on insert/update
-- -----------------------------------------------------
create or replace function public.sync_training_level_from_completed_lessons()
returns trigger
language plpgsql
as $$
begin
  new.training_level := greatest(
    1,
    public.compute_training_level_from_completed_lessons(coalesce(new.completed_lessons, '[]'::jsonb))
  );
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_training_level on public.profiles;

create trigger trg_profiles_sync_training_level
before insert or update of completed_lessons
on public.profiles
for each row
execute function public.sync_training_level_from_completed_lessons();


-- -----------------------------------------------------
-- 5) Verification output
-- -----------------------------------------------------
with computed as (
  select
    p.id,
    p.full_name,
    coalesce(p.training_level, 0) as profile_training_level,
    greatest(1, public.compute_training_level_from_completed_lessons(coalesce(p.completed_lessons, '[]'::jsonb))) as calc_training_level
  from profiles p
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
