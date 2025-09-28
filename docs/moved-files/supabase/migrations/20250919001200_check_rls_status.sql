-- Check current RLS status and existing policies
-- This will help us understand what needs to be restored

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED'
        ELSE 'RLS DISABLED'
    END as status
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename = pc.relname
WHERE pt.schemaname = 'public'
AND pt.tablename NOT LIKE 'pg_%'
ORDER BY pt.tablename;

-- Check existing RLS policies  
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count of tables with RLS enabled vs disabled
SELECT 
    CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as status,
    COUNT(*) as table_count
FROM pg_tables pt
JOIN pg_class pc ON pt.tablename = pc.relname  
WHERE pt.schemaname = 'public'
AND pt.tablename NOT LIKE 'pg_%'
GROUP BY rowsecurity;

SELECT 'RLS Status Check Complete' as result;