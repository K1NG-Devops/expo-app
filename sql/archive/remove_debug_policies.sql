-- Remove Debug Policies After Testing
-- Run this after you've confirmed your app is working properly

BEGIN;

-- Remove anonymous debug access policies
DROP POLICY IF EXISTS "profiles_debug_anon" ON profiles;
DROP POLICY IF EXISTS "activity_logs_debug_anon" ON activity_logs;
DROP POLICY IF EXISTS "preschools_debug_anon" ON preschools;
DROP POLICY IF EXISTS "petty_cash_debug_anon" ON petty_cash_accounts;

COMMIT;

-- Check remaining policies
SELECT 'Remaining policies after cleanup:' as status;
SELECT tablename, policyname, permissive, roles 
FROM pg_policies 
WHERE tablename IN ('profiles', 'activity_logs', 'preschools', 'petty_cash_accounts')
ORDER BY tablename, policyname;