-- One-time targeted fix for Samiran Bala reading consistency.
-- Mutates data for matched profile(s). Run in Supabase SQL editor.

begin;

-- 0) Backup current profile snapshot for matched user(s)
-- Uses existing backup_profiles_progress table to avoid creating a new table without RLS.
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
  p.id,
  p.full_name,
  p.points,
  p.reading_points,
  p.quiz_points,
  p.completed_lessons,
  p.training_level
from profiles p
where p.full_name ilike '%Samiran Bala%'
   or p.full_name ilike '%Samiran%Bala%';

-- 1) Rebuild profile score fields and completed_lessons from quiz_attempts history.
-- lesson_bonus_* attempts are treated as reading lessons.
with target_users as (
  select p.id
  from profiles p
  where p.full_name ilike '%Samiran Bala%'
     or p.full_name ilike '%Samiran%Bala%'
), attempts_agg as (
  select
    qa.user_id,
    coalesce(sum(qa.score), 0) as calc_points,
    coalesce(sum(case when qa.quiz_id like 'lesson_bonus%' then qa.score else 0 end), 0) as calc_reading_points,
    coalesce(sum(case when qa.quiz_id not like 'lesson_bonus%' then qa.score else 0 end), 0) as calc_quiz_points,
    coalesce(sum(qa.penalty), 0) as calc_total_penalties
  from quiz_attempts qa
  join target_users tu on tu.id = qa.user_id
  group by qa.user_id
), lesson_ids as (
  select
    qa.user_id,
    regexp_replace(qa.quiz_id, '^lesson_bonus_', '') as lesson_id
  from quiz_attempts qa
  join target_users tu on tu.id = qa.user_id
  where qa.quiz_id like 'lesson_bonus_%'
), lessons_json as (
  select
    tu.id as user_id,
    coalesce(
      (
        select jsonb_agg(x.lesson_id order by x.lesson_id)
        from (
          select distinct l.lesson_id
          from lesson_ids l
          where l.user_id = tu.id
            and l.lesson_id ~ '^\\d+\\.\\d+$'
        ) x
      ),
      '[]'::jsonb
    ) as rebuilt_completed_lessons
  from target_users tu
), chapter_counts as (
  select * from (
    values
      (1, 10), (2, 10), (3, 10), (4, 10), (5, 10),
      (6, 11), (7, 10), (8, 10), (9, 10)
  ) as t(chapter_num, lesson_count)
), chapter_progress as (
  select
    lj.user_id,
    cc.chapter_num,
    cc.lesson_count,
    count(*) filter (
      where exists (
        select 1
        from jsonb_array_elements_text(lj.rebuilt_completed_lessons) as lesson_id
        where lesson_id = cc.chapter_num::text || '.' || gs.lesson_num::text
      )
    ) as matched_lessons
  from lessons_json lj
  cross join chapter_counts cc
  cross join lateral generate_series(1, cc.lesson_count) as gs(lesson_num)
  group by lj.user_id, cc.chapter_num, cc.lesson_count
), computed_level as (
  select
    cp.user_id,
    coalesce(max(case when cp.matched_lessons = cp.lesson_count then cp.chapter_num else 0 end), 0) as calc_training_level
  from chapter_progress cp
  group by cp.user_id
)
update profiles p
set
  points = coalesce(a.calc_points, 0),
  reading_points = coalesce(a.calc_reading_points, 0),
  quiz_points = coalesce(a.calc_quiz_points, 0),
  total_penalties = coalesce(a.calc_total_penalties, 0),
  completed_lessons = coalesce(lj.rebuilt_completed_lessons, '[]'::jsonb),
  training_level = greatest(1, coalesce(cl.calc_training_level, 0)),
  updated_at = now()
from target_users tu
left join attempts_agg a on a.user_id = tu.id
left join lessons_json lj on lj.user_id = tu.id
left join computed_level cl on cl.user_id = tu.id
where p.id = tu.id;

-- 2) Verification output after fix
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
  where p.full_name ilike '%Samiran Bala%'
     or p.full_name ilike '%Samiran%Bala%'
  group by p.id, p.full_name, p.training_level, cc.chapter_num, cc.lesson_count
), computed as (
  select
    id,
    full_name,
    profile_training_level,
    coalesce(max(case when matched_lessons = lesson_count then chapter_num else 0 end), 0) as computed_training_level
  from chapter_progress
  group by id, full_name, profile_training_level
), score_computed as (
  select
    qa.user_id,
    coalesce(sum(qa.score), 0) as calc_points,
    coalesce(sum(case when qa.quiz_id like 'lesson_bonus%' then qa.score else 0 end), 0) as calc_reading_points,
    coalesce(sum(case when qa.quiz_id not like 'lesson_bonus%' then qa.score else 0 end), 0) as calc_quiz_points,
    coalesce(sum(qa.penalty), 0) as calc_total_penalties
  from quiz_attempts qa
  group by qa.user_id
)
select
  p.id,
  p.full_name,
  p.points as profile_points,
  coalesce(sc.calc_points, 0) as computed_points,
  p.reading_points as profile_reading_points,
  coalesce(sc.calc_reading_points, 0) as computed_reading_points,
  p.quiz_points as profile_quiz_points,
  coalesce(sc.calc_quiz_points, 0) as computed_quiz_points,
  p.total_penalties as profile_total_penalties,
  coalesce(sc.calc_total_penalties, 0) as computed_total_penalties,
  p.training_level as profile_training_level,
  c.computed_training_level,
  jsonb_array_length(coalesce(p.completed_lessons, '[]'::jsonb)) as completed_lessons_count,
  p.updated_at
from profiles p
left join score_computed sc on sc.user_id = p.id
left join computed c on c.id = p.id
where p.full_name ilike '%Samiran Bala%'
   or p.full_name ilike '%Samiran%Bala%';

commit;
