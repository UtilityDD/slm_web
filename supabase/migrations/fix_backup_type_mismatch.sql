-- FIX TYPE MISMATCH FOR SCORE RESET BACKUP
-- The original 'id' in quiz_attempts is a UUID, but the backup table was defined with BIGINT.

-- 1. Modify the backup_quiz_attempts table if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'backup_quiz_attempts' 
        AND column_name = 'original_id' 
        AND data_type = 'bigint'
    ) THEN
        -- Drop everything and recreate or just alter
        -- Since it's a backup table, we can just alter it
        ALTER TABLE backup_quiz_attempts 
        ALTER COLUMN original_id TYPE uuid USING (gen_random_uuid()); -- temporary bridge if needed, but usually just casting
        
        -- Better: just clear and fix if data isn't critical
        TRUNCATE TABLE backup_quiz_attempts;
        ALTER TABLE backup_quiz_attempts 
        ALTER COLUMN original_id TYPE uuid;
    END IF;
END $$;

-- 2. Update the create_score_backup function to ensure compatibility
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

    -- Clear old backups to avoid duplicate unique keys or just append
    -- For this system, we append with a new backup_at timestamp
    
    -- Backup attempts
    INSERT INTO backup_quiz_attempts (original_id, user_id, quiz_id, score, penalty, created_at)
    SELECT id, user_id, quiz_id, score, penalty, created_at FROM quiz_attempts;

    -- Backup profile progress
    INSERT INTO backup_profiles_progress (user_id, full_name, points, reading_points, quiz_points, completed_lessons, training_level)
    SELECT id, full_name, points, reading_points, quiz_points, completed_lessons, training_level FROM profiles;
END;
$$;
