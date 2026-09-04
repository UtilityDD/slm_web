-- Harden admin score backup/reset: FAIL CLOSED when auth.uid() is null.
-- Prevents service-role / anon accidental global resets.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_score_backup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() required';
  END IF;
  IF (SELECT role FROM profiles WHERE id = v_uid) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can create backups';
  END IF;

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

CREATE OR REPLACE FUNCTION public.admin_reset_score(p_target_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  is_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: auth.uid() required';
  END IF;

  SELECT (role = 'admin') INTO is_admin FROM profiles WHERE id = v_uid;
  IF is_admin IS DISTINCT FROM true THEN
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

COMMIT;
