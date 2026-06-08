-- ============================================================
-- SAFE BACKFILL: reading_habit_completions
-- ============================================================
-- NON-DESTRUCTIVE:
--   - INSERT only, ON CONFLICT DO NOTHING
--   - Does NOT touch profiles, quiz_attempts, RPCs, or triggers
--
-- Run in Supabase SQL Editor AFTER create_reading_habit_completions.sql
-- Run each section in order. Review previews before INSERTs.
-- ============================================================

-- ------------------------------------------------------------
-- STEP 0: Sanity check — table exists
-- ------------------------------------------------------------
SELECT
    to_regclass('public.reading_habit_completions') AS table_exists,
    (SELECT count(*) FROM public.reading_habit_completions) AS rows_before;

-- ------------------------------------------------------------
-- STEP 1A: Preview — backfill from quiz_attempts (best timestamps)
-- Uses existing lesson_bonus_* rows where they exist (Apr 2026 and earlier).
-- ------------------------------------------------------------
SELECT
    p.full_name,
    p.slm_id,
    replace(qa.quiz_id, 'lesson_bonus_', '') AS lesson_id,
    qa.created_at AS completed_at,
    'backfill_quiz_attempts' AS source,
    CASE
        WHEN rhc.id IS NOT NULL THEN 'ALREADY IN HABIT TABLE - SKIP'
        ELSE 'WILL INSERT'
    END AS action
FROM public.quiz_attempts qa
JOIN public.profiles p ON p.id = qa.user_id
LEFT JOIN public.reading_habit_completions rhc
    ON rhc.user_id = qa.user_id
   AND rhc.lesson_id = replace(qa.quiz_id, 'lesson_bonus_', '')
WHERE qa.quiz_id LIKE 'lesson_bonus_%'
  AND replace(qa.quiz_id, 'lesson_bonus_', '') ~ '^\d+\.\d+$'
ORDER BY qa.created_at DESC
LIMIT 100;

-- Count for Step 1A
SELECT count(*) AS will_insert_from_quiz_attempts
FROM public.quiz_attempts qa
LEFT JOIN public.reading_habit_completions rhc
    ON rhc.user_id = qa.user_id
   AND rhc.lesson_id = replace(qa.quiz_id, 'lesson_bonus_', '')
WHERE qa.quiz_id LIKE 'lesson_bonus_%'
  AND replace(qa.quiz_id, 'lesson_bonus_', '') ~ '^\d+\.\d+$'
  AND rhc.id IS NULL;

-- ------------------------------------------------------------
-- STEP 1B: INSERT from quiz_attempts (run after preview looks OK)
-- ------------------------------------------------------------
INSERT INTO public.reading_habit_completions (user_id, lesson_id, completed_at, source)
SELECT
    qa.user_id,
    replace(qa.quiz_id, 'lesson_bonus_', '') AS lesson_id,
    qa.created_at AS completed_at,
    'backfill_quiz_attempts' AS source
FROM public.quiz_attempts qa
WHERE qa.quiz_id LIKE 'lesson_bonus_%'
  AND replace(qa.quiz_id, 'lesson_bonus_', '') ~ '^\d+\.\d+$'
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- ------------------------------------------------------------
-- STEP 2A: Preview — backfill remaining lessons from profiles.completed_lessons
-- Timestamp = profiles.updated_at (approximate “last activity”, NOT exact per lesson).
-- Only fills gaps not already in reading_habit_completions.
-- ------------------------------------------------------------
SELECT
    p.full_name,
    p.slm_id,
    lesson_id,
    coalesce(p.updated_at, p.created_at) AS approximate_completed_at,
    'backfill_profile' AS source,
    CASE
        WHEN rhc.id IS NOT NULL THEN 'ALREADY IN HABIT TABLE - SKIP'
        ELSE 'WILL INSERT (APPROXIMATE TIME)'
    END AS action
FROM public.profiles p
CROSS JOIN LATERAL (
    SELECT trim(both '"' from value::text) AS lesson_id
    FROM jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb))
) lessons
LEFT JOIN public.reading_habit_completions rhc
    ON rhc.user_id = p.id
   AND rhc.lesson_id = lessons.lesson_id
WHERE lessons.lesson_id ~ '^\d+\.\d+$'
ORDER BY p.full_name, lesson_id
LIMIT 100;

-- Count for Step 2A
SELECT count(*) AS will_insert_from_profiles
FROM public.profiles p
CROSS JOIN LATERAL (
    SELECT trim(both '"' from value::text) AS lesson_id
    FROM jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb))
) lessons
LEFT JOIN public.reading_habit_completions rhc
    ON rhc.user_id = p.id
   AND rhc.lesson_id = lessons.lesson_id
WHERE lessons.lesson_id ~ '^\d+\.\d+$'
  AND rhc.id IS NULL;

-- ------------------------------------------------------------
-- STEP 2B: INSERT from profiles (run after preview looks OK)
-- ------------------------------------------------------------
INSERT INTO public.reading_habit_completions (user_id, lesson_id, completed_at, source)
SELECT
    p.id AS user_id,
    lessons.lesson_id,
    coalesce(p.updated_at, p.created_at) AS completed_at,
    'backfill_profile' AS source
FROM public.profiles p
CROSS JOIN LATERAL (
    SELECT trim(both '"' from value::text) AS lesson_id
    FROM jsonb_array_elements_text(coalesce(p.completed_lessons, '[]'::jsonb))
) lessons
LEFT JOIN public.reading_habit_completions rhc
    ON rhc.user_id = p.id
   AND rhc.lesson_id = lessons.lesson_id
WHERE lessons.lesson_id ~ '^\d+\.\d+$'
  AND rhc.id IS NULL
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- ------------------------------------------------------------
-- STEP 3: Verify
-- ------------------------------------------------------------
SELECT
    source,
    count(*) AS rows,
    min(completed_at) AS earliest,
    max(completed_at) AS latest
FROM public.reading_habit_completions
GROUP BY source
ORDER BY source;

-- Users with completed_lessons but zero habit rows (should be 0 after backfill)
SELECT
    p.slm_id,
    p.full_name,
    jsonb_array_length(coalesce(p.completed_lessons, '[]'::jsonb)) AS completed_lessons_count,
    count(rhc.id) AS habit_rows
FROM public.profiles p
LEFT JOIN public.reading_habit_completions rhc ON rhc.user_id = p.id
WHERE coalesce(jsonb_array_length(p.completed_lessons), 0) > 0
GROUP BY p.id, p.slm_id, p.full_name, p.completed_lessons
HAVING count(rhc.id) = 0
ORDER BY completed_lessons_count DESC
LIMIT 20;

-- Sample: latest joined users with reading habit data
SELECT
    p.slm_id,
    p.full_name,
    p.created_at AS joined_at,
    rhc.lesson_id,
    rhc.completed_at,
    rhc.source
FROM public.profiles p
JOIN public.reading_habit_completions rhc ON rhc.user_id = p.id
ORDER BY p.created_at DESC, rhc.completed_at DESC
LIMIT 30;
