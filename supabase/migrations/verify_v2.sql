-- 1. Check if the V2 function exists
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'submit_quiz_result_v2';

-- 2. Force a schema reload just in case
NOTIFY pgrst, 'reload schema';
