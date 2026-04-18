-- PHASE 2: Fix admin reset and backup functions to include total_penalties
-- This ensures penalty scores are properly reset and backed up

-- Update the existing admin_reset_score function to reset total_penalties
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
            total_penalties = 0,  -- ADD THIS: Reset penalties for individual user
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
            total_penalties = 0,  -- ADD THIS: Reset penalties for all users
            completed_lessons = '[]'::jsonb,
            training_level = 1
        WHERE role != 'admin'; -- Safety: Don't usually reset admin stats unless requested

        DELETE FROM quiz_attempts
        WHERE user_id IN (SELECT id FROM profiles WHERE role != 'admin');
    END IF;
END;
$$;

-- Update the create_score_backup function to include total_penalties
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

    -- Backup attempts (already includes penalty)
    INSERT INTO backup_quiz_attempts (original_id, user_id, quiz_id, score, penalty, created_at)
    SELECT id, user_id, quiz_id, score, penalty, created_at FROM quiz_attempts;

    -- Backup profile progress (ADD total_penalties to backup)
    INSERT INTO backup_profiles_progress (
        user_id, full_name, points, reading_points, quiz_points,
        completed_lessons, training_level, total_penalties
    )
    SELECT
        id, full_name, points, reading_points, quiz_points,
        completed_lessons, training_level, total_penalties
    FROM profiles;
END;
$$;

-- Add total_penalties column to backup_profiles_progress if it doesn't exist
ALTER TABLE backup_profiles_progress
ADD COLUMN IF NOT EXISTS total_penalties int DEFAULT 0;

-- Update existing backup function to include total_penalties
UPDATE backup_profiles_progress
SET total_penalties = 0
WHERE total_penalties IS NULL;

-- Create a function to recalculate total_penalties from quiz_attempts
-- This can be used to fix any inconsistencies
CREATE OR REPLACE FUNCTION recalculate_total_penalties()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    users_updated int;
    result jsonb;
BEGIN
    -- Recalculate total_penalties for all users based on their quiz attempts
    UPDATE profiles p
    SET total_penalties = COALESCE((
        SELECT SUM(qa.penalty)
        FROM quiz_attempts qa
        WHERE qa.user_id = p.id
    ), 0);

    GET DIAGNOSTICS users_updated = ROW_COUNT;

    -- Return summary
    result := jsonb_build_object(
        'users_updated', users_updated,
        'timestamp', now(),
        'message', 'Total penalties recalculated from quiz attempts'
    );

    -- Log the recalculation
    RAISE NOTICE 'Penalty recalculation complete: % users updated', users_updated;

    RETURN result;
END;
$$;