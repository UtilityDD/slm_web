-- =============================================================================
-- Recreate empty admin score-reset backup tables + clear ledger on reset
-- =============================================================================
-- After 20260904121000 dropped the fat backup snapshots. Admin reset still
-- needs empty tables (or CREATE IF NOT EXISTS inside the function).
-- Non-destructive for live profiles / quiz_attempts.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.backup_quiz_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_id uuid,
    user_id uuid,
    quiz_id text,
    score int,
    penalty int,
    created_at timestamptz,
    backup_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backup_profiles_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    full_name text,
    points int,
    reading_points int,
    reading_points_ledger int,
    quiz_points int,
    completed_lessons jsonb,
    training_level int,
    backup_at timestamptz DEFAULT now()
);

-- Older DBs may have the table without ledger column
ALTER TABLE public.backup_profiles_progress
  ADD COLUMN IF NOT EXISTS reading_points_ledger integer;

CREATE OR REPLACE FUNCTION public.create_score_backup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure tables exist even if a prior cleanup dropped them
  CREATE TABLE IF NOT EXISTS public.backup_quiz_attempts (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      original_id uuid,
      user_id uuid,
      quiz_id text,
      score int,
      penalty int,
      created_at timestamptz,
      backup_at timestamptz DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.backup_profiles_progress (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid,
      full_name text,
      points int,
      reading_points int,
      reading_points_ledger int,
      quiz_points int,
      completed_lessons jsonb,
      training_level int,
      backup_at timestamptz DEFAULT now()
  );

  ALTER TABLE public.backup_profiles_progress
    ADD COLUMN IF NOT EXISTS reading_points_ledger integer;

  INSERT INTO backup_quiz_attempts (original_id, user_id, quiz_id, score, penalty, created_at)
  SELECT id, user_id, quiz_id, score, penalty, created_at FROM quiz_attempts;

  INSERT INTO backup_profiles_progress (
    user_id, full_name, points, reading_points, reading_points_ledger, quiz_points, completed_lessons, training_level
  )
  SELECT id, full_name, points, reading_points, reading_points_ledger, quiz_points, completed_lessons, training_level
  FROM profiles;
END;
$$;

-- Keep admin_reset_score behavior; also zero reading_points_ledger.
-- Auth model: many admin RPCs use p_caller_id; this legacy function still uses auth.uid().
-- If auth.uid() is null under custom login, Admin UI may already use a different path —
-- we only harden backup + ledger here.
CREATE OR REPLACE FUNCTION public.admin_reset_score(p_target_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO is_admin FROM profiles WHERE id = auth.uid();
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can reset scores';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'backup_profiles_progress'
  ) OR NOT EXISTS (
    SELECT 1 FROM backup_profiles_progress WHERE backup_at > now() - interval '1 minute'
  ) THEN
    PERFORM create_score_backup();
  END IF;

  IF p_target_user_id IS NOT NULL THEN
    UPDATE profiles SET
      points = 0,
      reading_points = 0,
      reading_points_ledger = 0,
      quiz_points = 0,
      completed_lessons = '[]'::jsonb,
      training_level = 1
    WHERE id = p_target_user_id;

    DELETE FROM quiz_attempts WHERE user_id = p_target_user_id;
  ELSE
    UPDATE profiles SET
      points = 0,
      reading_points = 0,
      reading_points_ledger = 0,
      quiz_points = 0,
      completed_lessons = '[]'::jsonb,
      training_level = 1
    WHERE role != 'admin';

    DELETE FROM quiz_attempts
    WHERE user_id IN (SELECT id FROM profiles WHERE role != 'admin');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_score_backup() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_score(uuid) TO authenticated, service_role;

COMMIT;
