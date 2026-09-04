-- URGENT restore after accidental global admin_reset_score
-- Run in Supabase SQL editor as postgres / dashboard.
-- Profiles may already be restored via script; this restores quiz_attempts safely.

BEGIN;

-- 1) Profiles from latest backup snapshot
UPDATE public.profiles p
SET
  points = b.points,
  reading_points = b.reading_points,
  reading_points_ledger = COALESCE(b.reading_points_ledger, b.reading_points, 0),
  quiz_points = b.quiz_points,
  completed_lessons = COALESCE(b.completed_lessons, '[]'::jsonb),
  training_level = COALESCE(b.training_level, 1),
  updated_at = now()
FROM public.backup_profiles_progress b
WHERE p.id = b.user_id
  AND b.backup_at = (SELECT MAX(backup_at) FROM public.backup_profiles_progress);

-- 2) Replace attempts with backup
DELETE FROM public.quiz_attempts;

INSERT INTO public.quiz_attempts (id, user_id, quiz_id, score, penalty, created_at)
SELECT b.original_id, b.user_id, b.quiz_id, COALESCE(b.score, 0), COALESCE(b.penalty, 0), b.created_at
FROM public.backup_quiz_attempts b
WHERE b.backup_at = (SELECT MAX(backup_at) FROM public.backup_quiz_attempts)
  AND b.original_id IS NOT NULL;

COMMIT;

-- Quick verify
SELECT
  (SELECT count(*) FROM profiles WHERE points > 0) AS profiles_with_points,
  (SELECT count(*) FROM quiz_attempts) AS attempts,
  (SELECT max(points) FROM profiles) AS max_points;
