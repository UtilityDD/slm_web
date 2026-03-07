-- SQL to add Hint column to hourly_questions table
ALTER TABLE hourly_questions ADD COLUMN IF NOT EXISTS hint TEXT;

-- Recommended: Update some existing rows with hints for testing
-- UPDATE hourly_questions SET hint = 'This is a test hint for safety questions.' WHERE id IN (SELECT id FROM hourly_questions LIMIT 5);

COMMENT ON COLUMN hourly_questions.hint IS 'Educational hint for the question, shown after user selects an answer.';
