-- PENALTY SCORE FIX: PHASE 1 - ENHANCED SAFETY BACKUP
-- This creates timestamped backups of ALL penalty-related data before any changes
-- Run this FIRST - it has ZERO risk of data loss

-- 1. Create timestamped backup tables for penalty data
CREATE TABLE IF NOT EXISTS penalty_backup_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_user_id uuid,
    full_name text,
    total_penalties int,
    backup_timestamp timestamptz DEFAULT now(),
    backup_reason text DEFAULT 'penalty_fix_pre_backup'
);

CREATE TABLE IF NOT EXISTS penalty_backup_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_attempt_id uuid,
    user_id uuid,
    quiz_id text,
    score int,
    penalty int,
    created_at timestamptz,
    backup_timestamp timestamptz DEFAULT now(),
    backup_reason text DEFAULT 'penalty_fix_pre_backup'
);

-- 2. Create the comprehensive penalty backup function
CREATE OR REPLACE FUNCTION create_penalty_backup(backup_reason text DEFAULT 'penalty_fix_backup')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backup_id text;
    profiles_count int;
    attempts_count int;
    result jsonb;
BEGIN
    -- Generate unique backup ID
    backup_id := 'penalty_backup_' || extract(epoch from now())::text;

    -- Backup profiles with penalty data
    INSERT INTO penalty_backup_profiles (
        original_user_id, full_name, total_penalties, backup_reason
    )
    SELECT id, full_name, total_penalties, backup_reason
    FROM profiles
    WHERE total_penalties > 0 OR id IN (
        SELECT DISTINCT user_id FROM quiz_attempts WHERE penalty > 0
    );

    GET DIAGNOSTICS profiles_count = ROW_COUNT;

    -- Backup all quiz attempts with penalty data
    INSERT INTO penalty_backup_attempts (
        original_attempt_id, user_id, quiz_id, score, penalty, created_at, backup_reason
    )
    SELECT id, user_id, quiz_id, score, penalty, created_at, backup_reason
    FROM quiz_attempts
    WHERE penalty > 0;

    GET DIAGNOSTICS attempts_count = ROW_COUNT;

    -- Return backup summary
    result := jsonb_build_object(
        'backup_id', backup_id,
        'timestamp', now(),
        'profiles_backed_up', profiles_count,
        'attempts_backed_up', attempts_count,
        'reason', backup_reason
    );

    -- Log the backup
    RAISE NOTICE 'Penalty backup completed: % profiles, % attempts', profiles_count, attempts_count;

    RETURN result;
END;
$$;

-- 3. Create rollback function (can restore from any backup)
CREATE OR REPLACE FUNCTION rollback_penalty_backup(target_timestamp timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rollback_timestamp timestamptz;
    profiles_restored int := 0;
    attempts_restored int := 0;
    result jsonb;
BEGIN
    -- Use most recent backup if no timestamp specified
    IF target_timestamp IS NULL THEN
        SELECT MAX(backup_timestamp) INTO rollback_timestamp
        FROM penalty_backup_profiles;
    ELSE
        rollback_timestamp := target_timestamp;
    END IF;

    IF rollback_timestamp IS NULL THEN
        RAISE EXCEPTION 'No penalty backup found to rollback to';
    END IF;

    -- Restore profiles total_penalties
    UPDATE profiles p
    SET total_penalties = pb.total_penalties
    FROM penalty_backup_profiles pb
    WHERE p.id = pb.original_user_id
    AND pb.backup_timestamp = rollback_timestamp;

    GET DIAGNOSTICS profiles_restored = ROW_COUNT;

    -- Note: We don't restore quiz_attempts as they may have been legitimately deleted during reset
    -- The total_penalties restoration is the key fix

    result := jsonb_build_object(
        'rollback_timestamp', rollback_timestamp,
        'profiles_restored', profiles_restored,
        'attempts_restored', attempts_restored,
        'status', 'success'
    );

    RAISE NOTICE 'Penalty rollback completed: % profiles restored to %',
        profiles_restored, rollback_timestamp;

    RETURN result;
END;
$$;

-- 4. Execute the initial backup BEFORE any changes
SELECT create_penalty_backup('pre_penalty_fix_backup');