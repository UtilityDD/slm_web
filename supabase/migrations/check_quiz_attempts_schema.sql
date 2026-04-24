-- Check constraints and column types of quiz_attempts
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts';

-- Check unique constraints (to verify ON CONFLICT logic)
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'quiz_attempts';
