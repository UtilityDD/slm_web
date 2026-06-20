-- =====================================================================
-- ROLLBACK for cleanup_hourly_cheats_20260620.sql
-- =====================================================================
-- Restores the deleted hourly attempts and the original profile point
-- columns from the backup tables created during the cleanup.
-- Run in Supabase SQL Editor only if you need to undo the cleanup.
--
-- Requires that these backup tables still exist:
--   public.backup_hourly_cheat_20260620
--   public.backup_profile_points_20260620
-- =====================================================================

BEGIN;

-- 1. Restore the deleted attempts (same columns/order as quiz_attempts).
INSERT INTO public.quiz_attempts
SELECT * FROM public.backup_hourly_cheat_20260620
ON CONFLICT (user_id, quiz_id) DO NOTHING;

-- 2. Restore the original point columns exactly as they were.
UPDATE public.profiles pr
SET points         = b.points,
    quiz_points    = b.quiz_points,
    reading_points = b.reading_points,
    updated_at     = now()
FROM public.backup_profile_points_20260620 b
WHERE pr.id = b.id;

-- 3. Verify.
SELECT
  (SELECT COUNT(*) FROM public.backup_hourly_cheat_20260620) AS rows_available_to_restore,
  (SELECT COUNT(*) FROM public.backup_profile_points_20260620) AS profiles_to_restore;

COMMIT;

-- Optional: once you are satisfied the data is correct, you may drop backups:
-- DROP TABLE IF EXISTS public.backup_hourly_cheat_20260620;
-- DROP TABLE IF EXISTS public.backup_profile_points_20260620;
