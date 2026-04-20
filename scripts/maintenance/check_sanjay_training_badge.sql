-- Read-only check for Sanjay Gorai training badge consistency.
-- Run in Supabase SQL editor.

with target_users as (
  select
    p.id,
    p.full_name,
    coalesce(p.training_level, 0) as profile_training_level,
    coalesce(p.completed_lessons, '[]'::jsonb) as completed_lessons,
    p.updated_at
  from profiles p
  where p.full_name ilike '%Sanjay Gorai%'
     or p.full_name ilike '%Sanjay%Gorai%'
), chapter_counts as (
  select * from (
    values
      (1, 10), (2, 10), (3, 10), (4, 10), (5, 10),
      (6, 11), (7, 10), (8, 10), (9, 10)
  ) as t(chapter_num, lesson_count)
), chapter_progress as (
  select
    tu.id as user_id,
    cc.chapter_num,
    cc.lesson_count,
    count(*) filter (
      where exists (
        select 1
        from jsonb_array_elements_text(tu.completed_lessons) as lesson_id
        where lesson_id = cc.chapter_num::text || '.' || gs.lesson_num::text
      )
    ) as matched_lessons
  from target_users tu
  cross join chapter_counts cc
  cross join lateral generate_series(1, cc.lesson_count) as gs(lesson_num)
  group by tu.id, cc.chapter_num, cc.lesson_count
), computed_level as (
  select
    cp.user_id,
    coalesce(
      min(case when cp.matched_lessons < cp.lesson_count then cp.chapter_num end) - 1,
      9
    ) as calc_training_level
  from chapter_progress cp
  group by cp.user_id
)
select
  tu.id,
  tu.full_name,
  tu.profile_training_level,
  coalesce(cl.calc_training_level, 0) as computed_training_level,
  greatest(1, tu.profile_training_level) as profile_effective_level,
  greatest(1, coalesce(cl.calc_training_level, 0)) as computed_effective_level,
  case greatest(1, tu.profile_training_level)
    when 1 then 'Trainee'
    when 2 then 'Junior'
    when 3 then 'Technician'
    when 4 then 'Skilled'
    when 5 then 'Advanced'
    when 6 then 'Senior'
    when 7 then 'Supervisor'
    when 8 then 'Specialist'
    when 9 then 'Expert'
    else 'Trainee'
  end as profile_badge,
  case greatest(1, coalesce(cl.calc_training_level, 0))
    when 1 then 'Trainee'
    when 2 then 'Junior'
    when 3 then 'Technician'
    when 4 then 'Skilled'
    when 5 then 'Advanced'
    when 6 then 'Senior'
    when 7 then 'Supervisor'
    when 8 then 'Specialist'
    when 9 then 'Expert'
    else 'Trainee'
  end as computed_badge,
  jsonb_array_length(tu.completed_lessons) as completed_lessons_count,
  tu.updated_at
from target_users tu
left join computed_level cl on cl.user_id = tu.id
order by tu.full_name, tu.id;
