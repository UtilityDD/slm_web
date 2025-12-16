-- Run this script to fix the "Duplicate Names" on Leaderboard

-- 1. Create a View that finds the HIGHEST score for each user
create or replace view leaderboard_view as
select 
  qa.user_id,
  max(qa.score) as score, -- Takes the best score
  p.full_name,
  p.district,
  p.avatar_url
from quiz_attempts qa
join profiles p on qa.user_id = p.id
group by qa.user_id, p.full_name, p.district, p.avatar_url;

-- 2. Allow everyone to see this view
grant select on leaderboard_view to postgres, anon, authenticated, service_role;
