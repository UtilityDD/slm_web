-- Migrate all "user" roles to "lineman" for consistency
-- This ensures standardized role naming across the application

-- Update all profiles with role = 'user' to 'lineman'
UPDATE profiles
SET role = 'lineman'
WHERE role = 'user';

-- Optional: Verify the migration
-- SELECT role, COUNT(*) as count
-- FROM profiles
-- GROUP BY role
-- ORDER BY role;
