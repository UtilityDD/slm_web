-- Check column defaults to see if ID is auto-generated
SELECT column_name, column_default, is_nullable, data_type
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts';
