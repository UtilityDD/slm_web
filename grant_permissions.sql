-- Grant execute permission to authenticated users (and anon if needed, but usually not for this)
GRANT EXECUTE ON FUNCTION submit_quiz_result_v2(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_quiz_result_v2(text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION submit_quiz_result_v2(text, int, int) TO anon;

-- Force schema cache reload again to ensure permissions are picked up
NOTIFY pgrst, 'reload schema';
