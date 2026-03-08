-- 1. Create Backup Tables if they don't exist
CREATE TABLE IF NOT EXISTS backup_quiz_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_id uuid,
    user_id uuid,
    quiz_id text,
    score int,
    penalty int,
    created_at timestamptz,
    backup_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_profiles_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    full_name text,
    points int,
    reading_points int,
    quiz_points int,
    completed_lessons jsonb,
    training_level int,
    backup_at timestamptz DEFAULT now()
);

-- 2. Create the Backup Function
CREATE OR REPLACE FUNCTION create_score_backup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only admin can run manually, but we also call it internally
    IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can create backups';
    END IF;

    -- Backup attempts
    INSERT INTO backup_quiz_attempts (original_id, user_id, quiz_id, score, penalty, created_at)
    SELECT id, user_id, quiz_id, score, penalty, created_at FROM quiz_attempts;

    -- Backup profile progress
    INSERT INTO backup_profiles_progress (user_id, full_name, points, reading_points, quiz_points, completed_lessons, training_level)
    SELECT id, full_name, points, reading_points, quiz_points, completed_lessons, training_level FROM profiles;
END;
$$;

-- 3. Create the Reset Function
CREATE OR REPLACE FUNCTION admin_reset_score(p_target_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Check Authorization
    SELECT (role = 'admin') INTO is_admin FROM profiles WHERE id = auth.uid();
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can reset scores';
    END IF;

    -- MANDATORY AUTO-BACKUP BEFORE RESET
    -- We only backup if we haven't backed up in the last 1 minute to avoid spamming
    IF NOT EXISTS (SELECT 1 FROM backup_profiles_progress WHERE backup_at > now() - interval '1 minute') THEN
        PERFORM create_score_backup();
    END IF;

    IF p_target_user_id IS NOT NULL THEN
        -- Individual Reset
        UPDATE profiles SET 
            points = 0,
            reading_points = 0,
            quiz_points = 0,
            completed_lessons = '[]'::jsonb,
            training_level = 1
        WHERE id = p_target_user_id;

        DELETE FROM quiz_attempts WHERE user_id = p_target_user_id;
    ELSE
        -- Global Reset (Exclude Admins if needed, but usually we reset everyone)
        UPDATE profiles SET 
            points = 0,
            reading_points = 0,
            quiz_points = 0,
            completed_lessons = '[]'::jsonb,
            training_level = 1
        WHERE role != 'admin'; -- Safety: Don't usually reset admin stats unless requested

        DELETE FROM quiz_attempts 
        WHERE user_id IN (SELECT id FROM profiles WHERE role != 'admin');
    END IF;
END;
$$;
