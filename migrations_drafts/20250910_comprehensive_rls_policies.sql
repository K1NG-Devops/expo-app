-- Comprehensive RLS Policies Migration for EduDash
-- This migration implements organization-scoped Row Level Security policies
-- for all core tables with role-based access control

-- ============================================================================
-- HELPER FUNCTIONS FOR RBAC CHECKS
-- ============================================================================

-- Get current user's role from profiles table
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(p.role, 'unknown')
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Check if current user is a super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('super_admin', 'superadmin')
  );
$$;

-- Check if current user is admin of specific organization
CREATE OR REPLACE FUNCTION auth.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.preschool_id = org_id
    AND p.role IN ('principal_admin', 'principal', 'admin')
  );
$$;

-- Check if current user is member of specific organization
CREATE OR REPLACE FUNCTION auth.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = org_id
  );
$$;

-- Check if current user has active seat in organization
CREATE OR REPLACE FUNCTION auth.has_active_seat(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id = org_id
    AND om.seat_status = 'active'
  );
$$;

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION auth.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT p.preschool_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Check if current user can access student data (teacher or admin of same org)
CREATE OR REPLACE FUNCTION auth.can_access_student_data(student_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.is_super_admin()
  OR auth.is_org_admin(student_org_id)
  OR (
    auth.get_user_role() = 'teacher'
    AND auth.has_active_seat(student_org_id)
  );
$$;

-- ============================================================================
-- ENABLE RLS ON ALL CORE TABLES
-- ============================================================================

-- Core user and organization tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preschools ENABLE ROW LEVEL SECURITY;

-- Educational data tables
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Business tables (if not already enabled)
ALTER TABLE public.enterprise_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can always read their own profile
CREATE POLICY profiles_read_own ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own basic profile info (not role/org)
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = OLD.role  -- Cannot change own role
  AND preschool_id = OLD.preschool_id  -- Cannot change own org
);

-- Super admins can read/update all profiles
CREATE POLICY profiles_admin_all ON public.profiles
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization admins can read profiles in their org
CREATE POLICY profiles_org_admin_read ON public.profiles
FOR SELECT
TO authenticated
USING (
  preschool_id IS NOT NULL 
  AND auth.is_org_admin(preschool_id)
);

-- Organization admins can update member profiles in their org (limited fields)
CREATE POLICY profiles_org_admin_update ON public.profiles
FOR UPDATE
TO authenticated
USING (
  preschool_id IS NOT NULL 
  AND auth.is_org_admin(preschool_id)
  AND id != auth.uid()  -- Cannot update own profile through admin policy
)
WITH CHECK (
  preschool_id = OLD.preschool_id  -- Cannot move users between orgs
  AND role IN ('teacher', 'parent')  -- Cannot modify admin roles
);

-- ============================================================================
-- ORGANIZATIONS/PRESCHOOLS TABLE POLICIES
-- ============================================================================

-- Super admins can manage all organizations
CREATE POLICY organizations_admin_all ON public.organizations
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

CREATE POLICY preschools_admin_all ON public.preschools
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization members can read their own organization
CREATE POLICY organizations_member_read ON public.organizations
FOR SELECT
TO authenticated
USING (auth.is_org_member(id));

CREATE POLICY preschools_member_read ON public.preschools
FOR SELECT
TO authenticated
USING (auth.is_org_member(id) OR id = auth.get_user_org_id());

-- Organization admins can update their own organization
CREATE POLICY organizations_admin_update ON public.organizations
FOR UPDATE
TO authenticated
USING (auth.is_org_admin(id))
WITH CHECK (auth.is_org_admin(id));

CREATE POLICY preschools_admin_update ON public.preschools
FOR UPDATE
TO authenticated
USING (auth.is_org_admin(id))
WITH CHECK (auth.is_org_admin(id));

-- ============================================================================
-- ORGANIZATION_MEMBERS TABLE POLICIES
-- ============================================================================

-- Users can read their own membership
CREATE POLICY org_members_read_own ON public.organization_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Super admins can manage all memberships
CREATE POLICY org_members_admin_all ON public.organization_members
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization admins can read memberships in their org
CREATE POLICY org_members_org_admin_read ON public.organization_members
FOR SELECT
TO authenticated
USING (auth.is_org_admin(organization_id));

-- Organization admins can manage memberships in their org
CREATE POLICY org_members_org_admin_manage ON public.organization_members
FOR ALL
TO authenticated
USING (
  auth.is_org_admin(organization_id)
  AND user_id != auth.uid()  -- Cannot modify own membership
)
WITH CHECK (
  auth.is_org_admin(organization_id)
  AND user_id != auth.uid()
);

-- ============================================================================
-- TEACHERS TABLE POLICIES
-- ============================================================================

-- Teachers can read their own record
CREATE POLICY teachers_read_own ON public.teachers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR id = auth.uid()
);

-- Super admins can manage all teacher records
CREATE POLICY teachers_admin_all ON public.teachers
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization admins can manage teachers in their org
CREATE POLICY teachers_org_admin_all ON public.teachers
FOR ALL
TO authenticated
USING (auth.is_org_admin(preschool_id))
WITH CHECK (auth.is_org_admin(preschool_id));

-- Teachers in same org can read each other (for collaboration)
CREATE POLICY teachers_same_org_read ON public.teachers
FOR SELECT
TO authenticated
USING (
  auth.get_user_role() = 'teacher'
  AND preschool_id = auth.get_user_org_id()
  AND auth.has_active_seat(preschool_id)
);

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

-- Super admins can manage all student records
CREATE POLICY students_admin_all ON public.students
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization admins can manage students in their org
CREATE POLICY students_org_admin_all ON public.students
FOR ALL
TO authenticated
USING (auth.is_org_admin(preschool_id))
WITH CHECK (auth.is_org_admin(preschool_id));

-- Teachers can read/update students in their org (if they have active seat)
CREATE POLICY students_teacher_access ON public.students
FOR ALL
TO authenticated
USING (auth.can_access_student_data(preschool_id))
WITH CHECK (auth.can_access_student_data(preschool_id));

-- Parents can read their own children's records
CREATE POLICY students_parent_read_own ON public.students
FOR SELECT
TO authenticated
USING (
  auth.get_user_role() = 'parent'
  AND (
    parent_id = auth.uid()
    OR guardian_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.email = parent_email
    )
  )
);

-- ============================================================================
-- CLASSES TABLE POLICIES
-- ============================================================================

-- Super admins can manage all classes
CREATE POLICY classes_admin_all ON public.classes
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization admins can manage classes in their org
CREATE POLICY classes_org_admin_all ON public.classes
FOR ALL
TO authenticated
USING (auth.is_org_admin(preschool_id))
WITH CHECK (auth.is_org_admin(preschool_id));

-- Teachers can read classes in their org
CREATE POLICY classes_teacher_read ON public.classes
FOR SELECT
TO authenticated
USING (
  auth.get_user_role() = 'teacher'
  AND preschool_id = auth.get_user_org_id()
  AND auth.has_active_seat(preschool_id)
);

-- Teachers can update classes they are assigned to
CREATE POLICY classes_teacher_update_assigned ON public.classes
FOR UPDATE
TO authenticated
USING (
  auth.get_user_role() = 'teacher'
  AND teacher_id = auth.uid()
  AND preschool_id = auth.get_user_org_id()
)
WITH CHECK (
  teacher_id = auth.uid()
  AND preschool_id = auth.get_user_org_id()
);

-- Parents can read classes their children are enrolled in
CREATE POLICY classes_parent_read_children ON public.classes
FOR SELECT
TO authenticated
USING (
  auth.get_user_role() = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.class_id = id
    AND (
      s.parent_id = auth.uid()
      OR s.guardian_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.email = s.parent_email
      )
    )
  )
);

-- ============================================================================
-- ENHANCED ENTERPRISE LEADS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS enterprise_leads_insert_authenticated ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_admin_read ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_admin_update ON public.enterprise_leads;
DROP POLICY IF EXISTS enterprise_leads_admin_delete ON public.enterprise_leads;

-- Allow anyone to insert leads (contact form submissions)
CREATE POLICY enterprise_leads_public_insert ON public.enterprise_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Super admins can manage all leads
CREATE POLICY enterprise_leads_admin_all ON public.enterprise_leads
FOR ALL
TO authenticated
USING (auth.is_super_admin())
WITH CHECK (auth.is_super_admin());

-- Organization admins can view leads for their organization
CREATE POLICY enterprise_leads_org_view ON public.enterprise_leads
FOR SELECT
TO authenticated
USING (
  auth.get_user_role() IN ('principal_admin', 'principal', 'admin')
  AND organization_name IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.preschools p
    WHERE p.name ILIKE '%' || enterprise_leads.organization_name || '%'
    AND p.id = auth.get_user_org_id()
  )
);

-- ============================================================================
-- JWT VERIFICATION UTILITIES
-- ============================================================================

-- Function to verify JWT token server-side
CREATE OR REPLACE FUNCTION auth.verify_jwt_token(token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload JSON;
BEGIN
  -- This is a placeholder for JWT verification
  -- In production, use a proper JWT library
  -- For now, we rely on Supabase's built-in JWT handling
  SELECT auth.jwt() INTO payload;
  RETURN payload;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Function to get user capabilities from JWT
CREATE OR REPLACE FUNCTION auth.get_user_capabilities()
RETURNS TEXT[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'app_metadata')::json ->> 'capabilities',
    '[]'
  )::json#>>'{}' || '[]'
  ;
$$;

-- ============================================================================
-- AUDIT LOGGING FUNCTIONS
-- ============================================================================

-- Create audit log table for permission changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSON,
  new_values JSON,
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can read audit logs
CREATE POLICY audit_logs_admin_read ON public.audit_logs
FOR SELECT
TO authenticated
USING (auth.is_super_admin());

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  action TEXT,
  table_name TEXT DEFAULT NULL,
  record_id UUID DEFAULT NULL,
  old_values JSON DEFAULT NULL,
  new_values JSON DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    inet_client_addr()
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS FOR SAFE OPERATIONS
-- ============================================================================

-- Function to safely assign teacher seat
CREATE OR REPLACE FUNCTION public.assign_teacher_seat_secure(
  p_subscription_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Check if caller is authorized
  SELECT s.school_id INTO v_org_id
  FROM public.subscriptions s
  WHERE s.id = p_subscription_id;
  
  IF NOT (auth.is_super_admin() OR auth.is_org_admin(v_org_id)) THEN
    RAISE EXCEPTION 'Insufficient permissions to assign seat';
  END IF;
  
  -- Check if subscription has available seats
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = p_subscription_id
    AND s.seats_used < s.seats_total
  ) THEN
    RAISE EXCEPTION 'No available seats in subscription';
  END IF;
  
  -- Assign the seat
  INSERT INTO public.subscription_seats (subscription_id, user_id)
  VALUES (p_subscription_id, p_user_id)
  ON CONFLICT DO NOTHING;
  
  -- Update organization member status
  UPDATE public.organization_members
  SET seat_status = 'active'
  WHERE user_id = p_user_id AND organization_id = v_org_id;
  
  -- Log the action
  PERFORM public.log_audit_event(
    'assign_teacher_seat',
    'subscription_seats',
    p_subscription_id,
    NULL,
    json_build_object('user_id', p_user_id, 'subscription_id', p_subscription_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_teacher_seat_secure TO authenticated;

-- Function to safely revoke teacher seat  
CREATE OR REPLACE FUNCTION public.revoke_teacher_seat_secure(
  p_subscription_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Check authorization
  SELECT s.school_id INTO v_org_id
  FROM public.subscriptions s
  WHERE s.id = p_subscription_id;
  
  IF NOT (auth.is_super_admin() OR auth.is_org_admin(v_org_id)) THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke seat';
  END IF;
  
  -- Revoke the seat
  DELETE FROM public.subscription_seats
  WHERE subscription_id = p_subscription_id AND user_id = p_user_id;
  
  -- Update organization member status
  UPDATE public.organization_members
  SET seat_status = 'inactive'
  WHERE user_id = p_user_id AND organization_id = v_org_id;
  
  -- Log the action
  PERFORM public.log_audit_event(
    'revoke_teacher_seat',
    'subscription_seats',
    p_subscription_id,
    json_build_object('user_id', p_user_id, 'subscription_id', p_subscription_id),
    NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_teacher_seat_secure TO authenticated;

-- ============================================================================
-- PERFORMANCE INDEXES FOR RLS QUERIES
-- ============================================================================

-- Indexes to optimize RLS policy queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_org 
ON public.profiles (role, preschool_id) 
WHERE role IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_org_status 
ON public.organization_members (user_id, organization_id, seat_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teachers_org_user 
ON public.teachers (preschool_id, user_id) 
WHERE preschool_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_org_parent 
ON public.students (preschool_id, parent_id) 
WHERE preschool_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_org_teacher 
ON public.classes (preschool_id, teacher_id) 
WHERE preschool_id IS NOT NULL;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION auth.is_super_admin() IS 
'Check if the current authenticated user has super admin role';

COMMENT ON FUNCTION auth.is_org_admin(UUID) IS 
'Check if the current authenticated user is an admin of the specified organization';

COMMENT ON FUNCTION auth.can_access_student_data(UUID) IS 
'Check if the current user can access student data for the specified organization';

COMMENT ON TABLE public.audit_logs IS 
'Audit log for tracking permission changes and sensitive actions';

COMMENT ON FUNCTION public.assign_teacher_seat_secure(UUID, UUID) IS 
'Securely assign a teacher seat with proper authorization and audit logging';

-- ============================================================================
-- VALIDATION QUERIES FOR TESTING RLS POLICIES
-- ============================================================================

-- These queries can be used to test RLS policies work correctly
-- (Run these after applying the migration to verify security)

/*
-- Test as super admin (should see everything)
SELECT 'Super Admin Test' AS test_name, COUNT(*) FROM public.profiles;

-- Test as org admin (should only see own org)
SELECT 'Org Admin Test' AS test_name, COUNT(*) FROM public.teachers;

-- Test as teacher (should only see own record and same-org colleagues)
SELECT 'Teacher Test' AS test_name, COUNT(*) FROM public.students;

-- Test as parent (should only see own children)
SELECT 'Parent Test' AS test_name, COUNT(*) FROM public.students;
*/
