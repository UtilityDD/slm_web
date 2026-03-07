-- 1. Add training_level column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS training_level INTEGER DEFAULT 0;

-- 2. Update the Leaderboard View to include training_level
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  qa.user_id,
  MAX(qa.score) AS score,
  p.full_name,
  p.district,
  p.avatar_url,
  p.training_level -- Added this column
FROM quiz_attempts qa
JOIN profiles p ON qa.user_id = p.id
GROUP BY qa.user_id, p.full_name, p.district, p.avatar_url, p.training_level;

-- 3. Re-grant permissions
GRANT SELECT ON leaderboard_view TO postgres, anon, authenticated, service_role;
