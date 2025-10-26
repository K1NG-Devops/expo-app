-- Complete Policy Cleanup and Rebuild
-- This will remove ALL existing policies and create clean, working ones

BEGIN;

-- ====================================================================
-- PART 1: REMOVE ALL EXISTING POLICIES TO START CLEAN
-- ====================================================================

-- Drop ALL profiles policies
DROP POLICY IF EXISTS "profiles_own_access" ON profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON profiles;
DROP POLICY IF EXISTS "admin_organization_access" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_read" ON profiles;
DROP POLICY IF EXISTS "profiles_rls_write" ON profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON profiles;
DROP POLICY IF EXISTS "temp_anon_debug_access" ON profiles;
DROP POLICY IF EXISTS "users_own_profile_access" ON profiles;

-- Drop ALL activity_logs policies
DROP POLICY IF EXISTS "activity_logs_service_role" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_simple_access" ON activity_logs;
DROP POLICY IF EXISTS "admin_update_access" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_read_access" ON activity_logs;
DROP POLICY IF EXISTS "authenticated_write_access" ON activity_logs;
DROP POLICY IF EXISTS "service_role_full_access" ON activity_logs;
DROP POLICY IF EXISTS "temp_anon_debug_access" ON activity_logs;

-- Drop ALL petty_cash_accounts policies
DROP POLICY IF EXISTS "petty_cash_accounts_simple_access" ON petty_cash_accounts;
DROP POLICY IF EXISTS "petty_cash_accounts_service_role" ON petty_cash_accounts;
DROP POLICY IF EXISTS "Users can view petty cash accounts in their preschool" ON petty_cash_accounts;
DROP POLICY IF EXISTS "Principals and admins can manage petty cash accounts" ON petty_cash_accounts;

-- Drop ALL preschools policies
DROP POLICY IF EXISTS "preschools_own_access" ON preschools;
DROP POLICY IF EXISTS "preschools_service_role" ON preschools;
DROP POLICY IF EXISTS "Users can view their own preschool" ON preschools;
DROP POLICY IF EXISTS "Admins can manage their preschool" ON preschools;
DROP POLICY IF EXISTS "Service role full access to preschools" ON preschools;

-- ====================================================================
-- PART 2: CREATE CLEAN, SIMPLE POLICIES THAT WORK
-- ====================================================================

-- PROFILES TABLE - Essential policies
CREATE POLICY "profiles_authenticated_access"
ON profiles FOR SELECT TO authenticated
USING (true);  -- Allow all authenticated users to read profiles

CREATE POLICY "profiles_own_update"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_service_access"
ON profiles FOR ALL TO service_role
USING (true);

-- PRESCHOOLS TABLE - Essential policies
CREATE POLICY "preschools_authenticated_access"
ON preschools FOR SELECT TO authenticated
USING (true);  -- Allow all authenticated users to read preschools

CREATE POLICY "preschools_service_access"
ON preschools FOR ALL TO service_role
USING (true);

-- ACTIVITY_LOGS TABLE - Essential policies
CREATE POLICY "activity_logs_authenticated_access"
ON activity_logs FOR SELECT TO authenticated
USING (true);  -- Allow all authenticated users to read activity logs

CREATE POLICY "activity_logs_authenticated_insert"
ON activity_logs FOR INSERT TO authenticated
WITH CHECK (true);  -- Allow authenticated users to insert logs

CREATE POLICY "activity_logs_service_access"
ON activity_logs FOR ALL TO service_role
USING (true);

-- PETTY_CASH_ACCOUNTS TABLE - Essential policies
CREATE POLICY "petty_cash_authenticated_access"
ON petty_cash_accounts FOR SELECT TO authenticated
USING (true);  -- Allow all authenticated users to read petty cash accounts

CREATE POLICY "petty_cash_service_access"
ON petty_cash_accounts FOR ALL TO service_role
USING (true);

-- ====================================================================
-- PART 3: ADD TEMPORARY DEBUG POLICIES FOR TROUBLESHOOTING
-- ====================================================================

-- These allow anonymous access for debugging - REMOVE AFTER TESTING
CREATE POLICY "profiles_debug_anon"
ON profiles FOR SELECT TO anon
USING (true);

CREATE POLICY "activity_logs_debug_anon"
ON activity_logs FOR SELECT TO anon
USING (true);

CREATE POLICY "preschools_debug_anon"
ON preschools FOR SELECT TO anon
USING (true);

CREATE POLICY "petty_cash_debug_anon"
ON petty_cash_accounts FOR SELECT TO anon
USING (true);

COMMIT;