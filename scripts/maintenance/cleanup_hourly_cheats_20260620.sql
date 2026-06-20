-- =====================================================================
-- June 2026 hourly-cheat cleanup  (backup-first, single transaction)
-- =====================================================================
-- WHAT IT DOES
--   Removes hourly attempts whose quiz_id hour does not match the real
--   India time (same rule as the live guard: submit-vs-slot difference
--   < -5 minutes OR > 90 minutes), and deducts the exact net points those
--   attempts added to profiles.points / profiles.quiz_points.
--
-- WHY IT IS SAFE
--   * Everything runs inside ONE transaction (BEGIN ... COMMIT).
--   * Two backup tables are created FIRST, so the change is fully reversible
--     via rollback_hourly_cheat_cleanup_20260620.sql.
--   * monthly_leaderboard_view recomputes from quiz_attempts, so the monthly
--     board self-corrects once the rows are gone — no view edit needed.
--   * reading_points is never touched (hourly never affects reading).
--
-- HOW TO USE  (Supabase Dashboard -> SQL Editor, with write access)
--   1) Run STEP 0 alone and eyeball the numbers (matches the Node preview).
--   2) Run STEP 1..5 together to apply.
--      - To test without saving, change the final COMMIT to ROLLBACK.
--   3) To undo after commit, run rollback_hourly_cheat_cleanup_20260620.sql.
-- =====================================================================


-- ---------- STEP 0: PREVIEW (read-only, run alone first) ----------
WITH flagged AS (
  SELECT qa.id, qa.user_id, qa.score, qa.penalty,
    EXTRACT(EPOCH FROM (
      (qa.created_at AT TIME ZONE 'Asia/Kolkata')
      - make_timestamp(
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 1)::int,
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 2)::int,
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 3)::int,
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 4)::int,
          0, 0)
    )) / 60 AS diff_min
  FROM public.quiz_attempts qa
  WHERE qa.quiz_id ~ '^hourly-challenge-\d{4}-\d{2}-\d{2}-\d{1,2}$'
    AND qa.created_at >= '2026-06-01T00:00:00Z'
    AND qa.created_at <  '2026-07-01T00:00:00Z'
)
SELECT f.user_id, pr.full_name, pr.slm_id,
       COUNT(*) AS rows_to_delete,
       SUM(COALESCE(f.score, 0) - COALESCE(f.penalty, 0)) AS net_deduct,
       pr.points AS points_now,
       GREATEST(0, pr.points - SUM(COALESCE(f.score, 0) - COALESCE(f.penalty, 0))) AS points_after
FROM flagged f
JOIN public.profiles pr ON pr.id = f.user_id
WHERE f.diff_min < -5 OR f.diff_min > 90
GROUP BY f.user_id, pr.full_name, pr.slm_id, pr.points
ORDER BY net_deduct DESC;


-- ---------- STEP 1..5: APPLY (run together) ----------
BEGIN;

-- STEP 1: back up the exact rows that will be deleted (same schema as quiz_attempts)
DROP TABLE IF EXISTS public.backup_hourly_cheat_20260620;
CREATE TABLE public.backup_hourly_cheat_20260620 AS
WITH flagged AS (
  SELECT qa.id,
    EXTRACT(EPOCH FROM (
      (qa.created_at AT TIME ZONE 'Asia/Kolkata')
      - make_timestamp(
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 1)::int,
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 2)::int,
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 3)::int,
          split_part(substring(qa.quiz_id from 'hourly-challenge-(.*)$'), '-', 4)::int,
          0, 0)
    )) / 60 AS diff_min
  FROM public.quiz_attempts qa
  WHERE qa.quiz_id ~ '^hourly-challenge-\d{4}-\d{2}-\d{2}-\d{1,2}$'
    AND qa.created_at >= '2026-06-01T00:00:00Z'
    AND qa.created_at <  '2026-07-01T00:00:00Z'
)
SELECT qa.*
FROM public.quiz_attempts qa
JOIN flagged f ON f.id = qa.id
WHERE f.diff_min < -5 OR f.diff_min > 90;

-- Lock the backup table down (no anon/authenticated access; service role bypasses RLS).
ALTER TABLE public.backup_hourly_cheat_20260620 ENABLE ROW LEVEL SECURITY;

-- STEP 2: snapshot the point columns of every affected profile
DROP TABLE IF EXISTS public.backup_profile_points_20260620;
CREATE TABLE public.backup_profile_points_20260620 AS
SELECT id, points, quiz_points, reading_points, now() AS backed_up_at
FROM public.profiles
WHERE id IN (SELECT DISTINCT user_id FROM public.backup_hourly_cheat_20260620);

ALTER TABLE public.backup_profile_points_20260620 ENABLE ROW LEVEL SECURITY;

-- STEP 3: deduct exactly the net points the cheated rows had added
UPDATE public.profiles pr
SET points       = GREATEST(0, COALESCE(pr.points, 0)       - agg.net),
    quiz_points  = GREATEST(0, COALESCE(pr.quiz_points, 0)  - agg.net),
    updated_at   = now()
FROM (
  SELECT user_id, SUM(COALESCE(score, 0) - COALESCE(penalty, 0)) AS net
  FROM public.backup_hourly_cheat_20260620
  GROUP BY user_id
) agg
WHERE pr.id = agg.user_id;

-- STEP 4: delete the cheated attempts (fixes the monthly view automatically)
DELETE FROM public.quiz_attempts
WHERE id IN (SELECT id FROM public.backup_hourly_cheat_20260620);

-- STEP 5: verify before committing
SELECT
  (SELECT COUNT(*) FROM public.backup_hourly_cheat_20260620)        AS rows_backed_up_and_deleted,
  (SELECT COUNT(DISTINCT user_id) FROM public.backup_hourly_cheat_20260620) AS users_affected,
  (SELECT COUNT(*) FROM public.backup_profile_points_20260620)      AS profiles_snapshotted;

COMMIT;
-- ^ Change COMMIT to ROLLBACK above if you want to test this run without saving.
