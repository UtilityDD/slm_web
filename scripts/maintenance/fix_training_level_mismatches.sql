-- One-time repair for stale rank-stage data.
-- This updates profiles.training_level from completed_lessons and keeps the app's minimum level of 1.

begin;

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
    greatest(1, coalesce(max(case when matched_lessons = lesson_count then chapter_num else 0 end), 0)) as computed_training_level
  from chapter_progress
  group by id, full_name, profile_training_level
), updated as (
  update profiles p
  set training_level = c.computed_training_level,
      updated_at = now()
  from computed c
  where p.id = c.id
    and coalesce(p.training_level, 0) <> c.computed_training_level
  returning p.id, p.full_name, p.training_level as new_training_level
)
select
  c.id,
  c.full_name,
  c.profile_training_level as old_training_level,
  c.computed_training_level as repaired_training_level
from computed c
join updated u on u.id = c.id
order by abs(c.profile_training_level - c.computed_training_level) desc, c.full_name;

-- Verification pass: should return no rows after the repair.
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
    greatest(1, coalesce(max(case when matched_lessons = lesson_count then chapter_num else 0 end), 0)) as computed_training_level
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

commit;