-- Forensic, read-only investigation for Sanjay Gorai training level drift.
-- Goal: infer likely overwrite timing/cause from available table history.
-- Note: Without an audit log/trigger table on profiles, exact writer/session cannot be proven.

-- =====================================================
-- A) Current profile vs computed level (from completed_lessons and from attempts)
-- =====================================================
with target_user as (
  select
    p.id,
    p.full_name,
    coalesce(p.training_level, 0) as profile_training_level,
    coalesce(p.completed_lessons, '[]'::jsonb) as completed_lessons,
    p.updated_at as profile_updated_at
  from profiles p
  where p.full_name ilike '%Sanjay Gorai%'
     or p.full_name ilike '%Sanjay%Gorai%'
), chapter_counts as (
  select * from (
    values
      (1, 10), (2, 10), (3, 10), (4, 10), (5, 10),
      (6, 11), (7, 10), (8, 10), (9, 10)
  ) as t(chapter_num, lesson_count)
), from_completed_lessons as (
  select
    tu.id,
    coalesce(
      min(case when cp.matched_lessons < cp.lesson_count then cp.chapter_num end) - 1,
      9
    ) as calc_level_from_completed_lessons
  from target_user tu
  join lateral (
    select
      cc.chapter_num,
      cc.lesson_count,
      count(*) filter (
        where exists (
          select 1
          from jsonb_array_elements_text(tu.completed_lessons) as lesson_id
          where lesson_id = cc.chapter_num::text || '.' || gs.lesson_num::text
        )
      ) as matched_lessons
    from chapter_counts cc
    cross join lateral generate_series(1, cc.lesson_count) as gs(lesson_num)
    group by cc.chapter_num, cc.lesson_count
  ) cp on true
  group by tu.id
), distinct_attempt_lessons as (
  select distinct
    qa.user_id,
    regexp_replace(qa.quiz_id, '^lesson_bonus_', '') as lesson_id
  from quiz_attempts qa
  join target_user tu on tu.id = qa.user_id
  where qa.quiz_id like 'lesson_bonus_%'
    and regexp_replace(qa.quiz_id, '^lesson_bonus_', '') ~ '^\d+\.\d+$'
), from_attempts as (
  select
    tu.id,
    coalesce(
      min(case when cp.matched_lessons < cp.lesson_count then cp.chapter_num end) - 1,
      9
    ) as calc_level_from_attempts
  from target_user tu
  join lateral (
    select
      cc.chapter_num,
      cc.lesson_count,
      count(*) filter (
        where exists (
          select 1
          from distinct_attempt_lessons dal
          where dal.user_id = tu.id
            and dal.lesson_id = cc.chapter_num::text || '.' || gs.lesson_num::text
        )
      ) as matched_lessons
    from chapter_counts cc
    cross join lateral generate_series(1, cc.lesson_count) as gs(lesson_num)
    group by cc.chapter_num, cc.lesson_count
  ) cp on true
  group by tu.id
), attempt_times as (
  select
    qa.user_id,
    min(qa.created_at) as first_attempt_at,
    max(qa.created_at) as last_attempt_at,
    max(qa.created_at) filter (where qa.quiz_id like 'lesson_bonus_%') as last_lesson_bonus_attempt_at,
    count(*) as total_attempt_rows,
    count(*) filter (where qa.quiz_id like 'lesson_bonus_%') as total_lesson_bonus_rows
  from quiz_attempts qa
  join target_user tu on tu.id = qa.user_id
  group by qa.user_id
)
select
  tu.id,
  tu.full_name,
  tu.profile_training_level,
  greatest(1, tu.profile_training_level) as profile_effective_level,
  coalesce(fcl.calc_level_from_completed_lessons, 0) as computed_level_from_completed_lessons,
  greatest(1, coalesce(fcl.calc_level_from_completed_lessons, 0)) as computed_effective_from_completed_lessons,
  coalesce(fa.calc_level_from_attempts, 0) as computed_level_from_attempts,
  greatest(1, coalesce(fa.calc_level_from_attempts, 0)) as computed_effective_from_attempts,
  jsonb_array_length(tu.completed_lessons) as completed_lessons_count,
  at.first_attempt_at,
  at.last_attempt_at,
  at.last_lesson_bonus_attempt_at,
  tu.profile_updated_at,
  (tu.profile_updated_at - at.last_attempt_at) as profile_update_minus_last_attempt,
  (tu.profile_updated_at - at.last_lesson_bonus_attempt_at) as profile_update_minus_last_lesson_bonus
from target_user tu
left join from_completed_lessons fcl on fcl.id = tu.id
left join from_attempts fa on fa.id = tu.id
left join attempt_times at on at.user_id = tu.id;


-- =====================================================
-- B) Attempts close to profile.updated_at (likely relevant activity window)
-- =====================================================
with target_user as (
  select id, full_name, updated_at
  from profiles
  where full_name ilike '%Sanjay Gorai%'
     or full_name ilike '%Sanjay%Gorai%'
)
select
  tu.id,
  tu.full_name,
  tu.updated_at as profile_updated_at,
  qa.quiz_id,
  qa.score,
  coalesce(qa.penalty, 0) as penalty,
  qa.created_at as attempt_time,
  (qa.created_at - tu.updated_at) as attempt_minus_profile_update
from target_user tu
left join quiz_attempts qa
  on qa.user_id = tu.id
 and qa.created_at between tu.updated_at - interval '2 days' and tu.updated_at + interval '2 days'
order by qa.created_at nulls last;


-- =====================================================
-- C) Missing lessons by chapter from attempts (if any missing, computed level should stop)
-- =====================================================
with target_user as (
  select id, full_name
  from profiles
  where full_name ilike '%Sanjay Gorai%'
     or full_name ilike '%Sanjay%Gorai%'
), chapter_counts as (
  select * from (
    values
      (1, 10), (2, 10), (3, 10), (4, 10), (5, 10),
      (6, 11), (7, 10), (8, 10), (9, 10)
  ) as t(chapter_num, lesson_count)
), distinct_attempt_lessons as (
  select distinct
    qa.user_id,
    regexp_replace(qa.quiz_id, '^lesson_bonus_', '') as lesson_id
  from quiz_attempts qa
  join target_user tu on tu.id = qa.user_id
  where qa.quiz_id like 'lesson_bonus_%'
    and regexp_replace(qa.quiz_id, '^lesson_bonus_', '') ~ '^\d+\.\d+$'
)
select
  tu.id,
  tu.full_name,
  cc.chapter_num,
  gs.lesson_num,
  cc.chapter_num::text || '.' || gs.lesson_num::text as expected_lesson_id
from target_user tu
cross join chapter_counts cc
cross join lateral generate_series(1, cc.lesson_count) as gs(lesson_num)
where not exists (
  select 1
  from distinct_attempt_lessons dal
  where dal.user_id = tu.id
    and dal.lesson_id = cc.chapter_num::text || '.' || gs.lesson_num::text
)
order by cc.chapter_num, gs.lesson_num;
