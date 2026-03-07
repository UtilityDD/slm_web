-- SCHEMA DOCTOR: RUN THIS TO SEE EXACT COLUMN NAMES
-- This script will output the column names of the user_tools table.

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_tools';

-- Also check user_ppe for comparison
SELECT '--- PPE Table ---' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_ppe';
