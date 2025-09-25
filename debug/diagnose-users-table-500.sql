-- Diagnose Users Table 500 Error 
-- Purpose: Identify why GET /rest/v1/users?select=id&limit=1000 returns HTTP 500

-- Check 1: Does the users table exist?
SELECT 'CHECKING TABLE EXISTENCE' AS step;
SELECT 
    table_name, 
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_name = 'users' 
AND table_schema IN ('public', 'auth');

-- Check 2: What columns does the users table have?
SELECT 'CHECKING TABLE COLUMNS' AS step;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 3: Is RLS enabled and what are the policies?
SELECT 'CHECKING RLS STATUS' AS step;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Check 4: What RLS policies exist?
SELECT 'CHECKING RLS POLICIES' AS step;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Check 5: Are there any broken foreign key references?
SELECT 'CHECKING FOREIGN KEYS' AS step;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass
OR confrelid = 'public.users'::regclass;

-- Check 6: Test a simple query that might be causing the error
SELECT 'TESTING SIMPLE QUERY' AS step;
BEGIN;
    -- Try to select just the ID column with a limit
    SELECT 'Testing basic select...' AS test;
    SELECT count(*) FROM public.users;
    
    SELECT 'Testing select id...' AS test;  
    SELECT id FROM public.users LIMIT 5;
    
    SELECT 'Testing with auth context...' AS test;
    -- This might fail if RLS policies are broken
    SET LOCAL row_security = on;
    SELECT id FROM public.users LIMIT 1;
ROLLBACK;

-- Check 7: Look for any triggers or functions that might be failing
SELECT 'CHECKING TRIGGERS' AS step;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'public';

-- Check 8: Look for any functions that might be called by RLS policies
SELECT 'CHECKING FUNCTIONS USED IN RLS' AS step;
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth', 'app_auth')
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- Check 9: Test authentication functions
SELECT 'TESTING AUTH FUNCTIONS' AS step;
SELECT 'Testing auth.uid()...' AS test, auth.uid() AS result;

-- Check 10: Look for any recent errors in logs (if accessible)
SELECT 'SUMMARY - POTENTIAL ISSUES TO CHECK' AS step;
SELECT 'Look for these common causes of 500 errors:' AS issue_type
UNION ALL
SELECT '1. RLS policy references non-existent columns (e.g. auth_user_id)'
UNION ALL  
SELECT '2. RLS policy calls functions that return errors'
UNION ALL
SELECT '3. Foreign key constraints reference non-existent records'
UNION ALL
SELECT '4. Trigger functions that fail during SELECT operations'
UNION ALL
SELECT '5. Column name mismatches between policies and actual table structure'
UNION ALL
SELECT '6. Missing indexes causing performance issues that timeout as 500s';