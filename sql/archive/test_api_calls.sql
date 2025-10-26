-- Test the specific API calls that were failing

-- Test 1: Activity logs query similar to the failing API call
SELECT 'Testing activity_logs with specific filters...' as test;
SELECT 
    id, 
    activity_type, 
    description, 
    organization_id, 
    user_id,
    created_at
FROM activity_logs 
WHERE organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'
ORDER BY created_at DESC 
LIMIT 8;

-- Test 2: Profiles query for avatar_url
SELECT 'Testing profiles avatar query...' as test;
SELECT 
    id,
    avatar_url,
    organization_id
FROM profiles 
WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Test 3: Check if these specific UUIDs exist in the database
SELECT 'Checking if organization exists...' as test;
SELECT COUNT(*) as org_count FROM preschools WHERE id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';

SELECT 'Checking if profile exists...' as test;
SELECT COUNT(*) as profile_count FROM profiles WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Test 4: General queries to ensure tables are accessible
SELECT 'General activity_logs count...' as test;
SELECT COUNT(*) as total_logs FROM activity_logs;

SELECT 'General profiles count...' as test;
SELECT COUNT(*) as total_profiles FROM profiles;