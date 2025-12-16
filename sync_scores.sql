-- Run this script to SYNC your Home Page score with the Leaderboard
-- It resets the 'profiles' score to match the sum of 'quiz_attempts'

update profiles p
set points = (
    select coalesce(sum(score), 0)
    from quiz_attempts qa
    where qa.user_id = p.id
);
