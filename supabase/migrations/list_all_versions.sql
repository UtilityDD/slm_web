-- List all functions named submit_quiz_result_v2 with their parameter types
SELECT 
    p.oid,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'submit_quiz_result_v2';
