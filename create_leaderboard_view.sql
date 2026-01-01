-- Run this script to fix the "Duplicate Names" on Leaderboard

-- 1. Create a View that pulls total points from the profiles table
create or replace view leaderboard_view as
select 
  id as user_id,
  points as score, -- Pulls total points
  full_name,
  district,
  avatar_url,
  training_level,
  completed_lessons,
  total_penalties
from profiles
where points > 0;

-- 2. Allow everyone to see this view
grant select on leaderboard_view to postgres, anon, authenticated, service_role;
