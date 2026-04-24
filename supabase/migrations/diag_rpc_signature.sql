-- Check exact signature and parameters of submit_quiz_result_v2
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as args,
    t.typname as return_type
FROM pg_proc p
JOIN pg_type t ON p.prorettype = t.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'submit_quiz_result_v2';
