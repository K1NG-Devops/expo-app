-- Direct fix for infinite recursion - execute this directly on the database
-- This bypasses the migration system and fixes the issue immediately
-- Updated with correct column names from database inspection

BEGIN;

-- ====================================================================
-- PART 1: DROP EXISTING CONFLICTING POLICIES
-- ====================================================================

-- Drop policies on profiles table that might cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;

-- Drop policies on preschools table
DROP POLICY IF EXISTS "Users can view their own preschool" ON preschools;
DROP POLICY IF EXISTS "Admins can manage their preschool" ON preschools;
DROP POLICY IF EXISTS "Service role full access to preschools" ON preschools;

-- Drop policies on petty_cash_accounts table (main culprit for recursion)
DROP POLICY IF EXISTS "petty_cash_accounts_tenant_isolation_policy" ON petty_cash_accounts;
DROP POLICY IF EXISTS "petty_cash_accounts_select_policy" ON petty_cash_accounts;
DROP POLICY IF EXISTS "petty_cash_accounts_insert_policy" ON petty_cash_accounts;
DROP POLICY IF EXISTS "petty_cash_accounts_update_policy" ON petty_cash_accounts;
DROP POLICY IF EXISTS "petty_cash_accounts_delete_policy" ON petty_cash_accounts;

-- Drop policies on activity_logs table
DROP POLICY IF EXISTS "activity_logs_tenant_isolation_policy" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_policy" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_update_policy" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete_policy" ON activity_logs;

-- ====================================================================
-- PART 2: DROP PROBLEMATIC FUNCTIONS THAT CAUSE RECURSION
-- ====================================================================

-- Drop the recursive functions that query profiles
DROP FUNCTION IF EXISTS get_user_capabilities(uuid);
DROP FUNCTION IF EXISTS user_has_capability(uuid, text);

-- ====================================================================
-- PART 3: CREATE SAFE, NON-RECURSIVE POLICIES
-- ====================================================================

-- PROFILES TABLE - Safe policies using only auth.uid()
CREATE POLICY "profiles_own_access"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_own_update"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_service_role"
ON profiles FOR ALL TO service_role
USING (true);

-- PRESCHOOLS TABLE - Safe policies
CREATE POLICY "preschools_own_access"
ON preschools FOR SELECT TO authenticated
USING (
    id IN (
        SELECT organization_id FROM profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "preschools_service_role"
ON preschools FOR ALL TO service_role
USING (true);

-- PETTY_CASH_ACCOUNTS TABLE - Safe tenant isolation without recursion (uses school_id)
CREATE POLICY "petty_cash_accounts_simple_access"
ON petty_cash_accounts FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND organization_id = petty_cash_accounts.school_id
    )
);

CREATE POLICY "petty_cash_accounts_service_role"
ON petty_cash_accounts FOR ALL TO service_role
USING (true);

-- ACTIVITY_LOGS TABLE - Safe policies (uses organization_id)
CREATE POLICY "activity_logs_simple_access"
ON activity_logs FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND organization_id = activity_logs.organization_id
    )
);

CREATE POLICY "activity_logs_service_role"
ON activity_logs FOR ALL TO service_role
USING (true);

COMMIT;