-- Run this script to fix the "Foreign Key Incompatible" error

-- 1. Drop the constraint that is preventing the change
-- (This constraint likely links to a 'quizzes' table which we aren't using for these JSON quizzes)
alter table quiz_attempts
drop constraint if exists quiz_attempts_quiz_id_fkey;

-- 2. NOW we can change the type to Text
alter table quiz_attempts
alter column quiz_id type text;
