-- =============================================================================
-- Safe table cleanup (run AFTER exporting backups to JSON/CSV)
-- =============================================================================
-- Already exported locally:
--   scripts/maintenance/exports/<date>/backup_quiz_attempts.json
--   scripts/maintenance/exports/<date>/backup_profiles_progress.json
--
-- Drops only admin-reset snapshot tables that the live app does not read.
-- Does NOT touch profiles, quiz_attempts, hourly_questions, or feature tables.
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS public.backup_quiz_attempts;
DROP TABLE IF EXISTS public.backup_profiles_progress;

-- Optional empty leftovers (IF EXISTS — safe if already gone)
DROP TABLE IF EXISTS public.safety_library;
DROP TABLE IF EXISTS public.user_ppes;
DROP TABLE IF EXISTS public.contact_messages;
DROP TABLE IF EXISTS public.invitations;
DROP TABLE IF EXISTS public.lessons;
DROP TABLE IF EXISTS public.quiz_questions;
DROP TABLE IF EXISTS public.training_lessons;
DROP TABLE IF EXISTS public.penalty_backup_profiles;
DROP TABLE IF EXISTS public.penalty_backup_attempts;
DROP TABLE IF EXISTS public.score_repair_backup_profiles;

COMMIT;
