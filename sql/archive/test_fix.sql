-- Test queries to verify the infinite recursion fix

-- Test 1: Basic profiles query (should work)
SELECT 'Testing profiles table...' as test;
SELECT COUNT(*) as profile_count FROM profiles LIMIT 5;

-- Test 2: Basic preschools query (should work)
SELECT 'Testing preschools table...' as test;
SELECT COUNT(*) as preschool_count FROM preschools LIMIT 5;

-- Test 3: Basic petty_cash_accounts query (this was causing recursion)
SELECT 'Testing petty_cash_accounts table...' as test;
SELECT COUNT(*) as petty_cash_count FROM petty_cash_accounts LIMIT 5;

-- Test 4: Basic activity_logs query (this was also causing recursion)
SELECT 'Testing activity_logs table...' as test;
SELECT COUNT(*) as activity_log_count FROM activity_logs LIMIT 5;

-- Test 5: Check if RLS policies exist and are working
SELECT 'Checking RLS policies...' as test;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles
FROM pg_policies 
WHERE tablename IN ('profiles', 'preschools', 'petty_cash_accounts', 'activity_logs')
ORDER BY tablename, policyname;