-- Create missing RPC functions needed for teacher dashboard seat status checks
-- These functions are called by fetchEnhancedUserProfile in lib/rbac.ts

-- 1. Create get_my_org_member RPC function
-- This function returns organization membership details including seat_status
CREATE OR REPLACE FUNCTION get_my_org_member(p_org_id UUID)
RETURNS TABLE (
  organization_id UUID,
  seat_status TEXT,
  plan_tier TEXT,
  invited_by UUID,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Return organization membership info for the current user
  RETURN QUERY
  SELECT 
    u.preschool_id as organization_id,
    CASE 
      WHEN ss.user_id IS NOT NULL THEN 'active'::TEXT
      ELSE 'inactive'::TEXT
    END as seat_status,
    COALESCE(sp.name, 'free')::TEXT as plan_tier,
    ss.user_id as invited_by, -- placeholder, adjust as needed
    u.created_at
  FROM public.users u
  LEFT JOIN public.subscription_seats ss ON u.id = ss.user_id
  LEFT JOIN public.subscriptions s ON u.preschool_id = s.preschool_id
  LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE u.id = auth.uid() 
    AND u.preschool_id = p_org_id;
END;
$$;

-- 2. Create or ensure get_my_profile RPC function exists
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preschool_id UUID,
  created_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Return current user's profile bypassing RLS
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.preschool_id,
    u.created_at,
    u.last_login_at
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$;

-- 3. Create debug function for profile fetching (referenced in rbac.ts)
CREATE OR REPLACE FUNCTION debug_get_profile_direct(target_auth_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  preschool_id UUID,
  created_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Return user profile for debugging (should only be used by authenticated users for their own profile)
  IF target_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot access other user profiles';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    u.avatar_url,
    u.preschool_id,
    u.created_at,
    u.last_login_at
  FROM public.users u
  WHERE u.id = target_auth_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_my_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION debug_get_profile_direct(UUID) TO authenticated;

-- Test the functions with the teacher ID
SELECT 
  'Testing get_my_profile' as test_name,
  *
FROM get_my_profile();

SELECT 
  'Testing get_my_org_member' as test_name,
  *
FROM get_my_org_member(
  (SELECT preschool_id FROM public.users WHERE id = auth.uid())
);