-- Sample SQL for updating hints in hourly_questions table
-- Edit this file to match your actual question IDs and add appropriate hints

-- First, let's see what questions we have:
-- Uncomment and run this to view your questions:
/*
SELECT id, question_text, category 
FROM hourly_questions 
ORDER BY id 
LIMIT 20;
*/

-- Sample hint updates - CUSTOMIZE THESE FOR YOUR ACTUAL QUESTIONS
-- Replace the IDs and hints with your actual data

UPDATE hourly_questions 
SET hint = 'Safety equipment must meet industry standards. Consider OSHA requirements for lineman work.'
WHERE id = 1; -- Replace with actual question ID

UPDATE hourly_questions 
SET hint = 'Think about the voltage levels and required minimum clearance distances for different power line types.'
WHERE id = 2;

UPDATE hourly_questions 
SET hint = 'Proper grounding procedures are essential. Review the step-by-step process in your training materials.'
WHERE id = 3;

UPDATE hourly_questions 
SET hint = 'PPE inspection is critical. What are the key items to check before starting work?'
WHERE id = 4;

UPDATE hourly_questions 
SET hint = 'Emergency response protocols must be followed in the correct sequence for safety.'
WHERE id = 5;

-- For bulk updates using CASE statement:
/*
UPDATE hourly_questions 
SET hint = CASE id
    WHEN 1 THEN 'Your hint for question 1'
    WHEN 2 THEN 'Your hint for question 2'
    WHEN 3 THEN 'Your hint for question 3'
    -- Add more WHEN clauses for each question
    ELSE hint -- Preserve existing hints
END
WHERE id IN (1, 2, 3); -- List all IDs you're updating
*/

-- Verify your updates:
SELECT id, question_text, hint 
FROM hourly_questions 
WHERE hint IS NOT NULL 
ORDER BY id;
