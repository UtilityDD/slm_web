-- Cleanup overloaded functions to prevent ambiguity
-- Run this in your Supabase SQL Editor

-- Drop old versions (with 3 or 4 parameters)
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, integer, integer);
DROP FUNCTION IF EXISTS public.submit_quiz_result_v2(text, integer, integer, uuid);

-- Now re-verify that our new 2-parameter version is the ONLY one
-- (You don't need to run the CREATE FUNCTION again if you already did, 
-- but it doesn't hurt)
