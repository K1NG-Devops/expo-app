-- ============================================================================
-- Phase 6: Profiles Organization Alignment & RLS Compatibility
-- Adds organization_id to profiles, updates RPCs, and ensures dual-field RLS support
-- ============================================================================

-- ============================================================================
-- STEP 1: Add organization_id to profiles table
-- ============================================================================

-- Add organization_id column with foreign key to organizations
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations (id) ON DELETE SET NULL;

-- Add organization_type for cached access
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_type text;

-- Add organization_name for cached access
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_name text;

-- Create index for organization_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles (organization_id);

COMMENT ON COLUMN profiles.organization_id IS 'Organization membership (replaces preschool_id, with fallback support)';
COMMENT ON COLUMN profiles.organization_type IS 'Cached organization type for quick access';
COMMENT ON COLUMN profiles.organization_name IS 'Cached organization name for quick access';

-- ============================================================================
-- STEP 2: Backfill profiles.organization_id from preschool_id
-- ============================================================================

-- Update profiles.organization_id from preschool_id where not already set
UPDATE profiles
SET organization_id = preschool_id
WHERE
  preschool_id IS NOT NULL
  AND organization_id IS NULL;

-- Backfill organization_type and organization_name from organizations table
UPDATE profiles AS p
SET
  organization_type = o.type::text,
  organization_name = o.name
FROM organizations AS o
WHERE
  p.organization_id = o.id
  AND p.organization_id IS NOT NULL
  AND (p.organization_type IS NULL OR p.organization_name IS NULL);

-- Fallback: backfill from preschools table for legacy data
UPDATE profiles AS p
SET
  organization_type = 'preschool',
  organization_name = ps.name
FROM preschools AS ps
WHERE
  p.preschool_id = ps.id
  AND p.organization_id IS NULL
  AND (p.organization_type IS NULL OR p.organization_name IS NULL);

-- ============================================================================
-- STEP 3: Update or create get_my_profile RPC
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_my_profile();

-- Create enhanced get_my_profile that includes organization fields
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  avatar_url text,
  preschool_id uuid,
  organization_id uuid,
  organization_name text,
  organization_type text,
  seat_status text,
  capabilities text [],
  created_at timestamptz,
  last_login_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.avatar_url,
    p.preschool_id,
    COALESCE(p.organization_id, p.preschool_id) as organization_id,
    COALESCE(p.organization_name, o.name, ps.name) as organization_name,
    COALESCE(p.organization_type, o.type::text, 'preschool') as organization_type,
    COALESCE(p.seat_status, 'active') as seat_status,
    COALESCE(p.capabilities, ARRAY[]::text[]) as capabilities,
    p.created_at,
    p.last_login_at
  FROM profiles p
  LEFT JOIN organizations o ON p.organization_id = o.id
  LEFT JOIN preschools ps ON p.preschool_id = ps.id
  WHERE p.id = auth.uid()
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_my_profile() IS 'Get current user profile with organization context (Phase 6 compatible)';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated;

-- ============================================================================
-- STEP 4: Create or update compatibility RPC for organization access
-- ============================================================================

-- Function to check if user has access to organization (via either field)
CREATE OR REPLACE FUNCTION user_can_access_organization(target_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_org_id uuid;
  user_preschool_id uuid;
  user_role text;
BEGIN
  -- Get user's organization IDs and role
  SELECT 
    COALESCE(organization_id, preschool_id),
    preschool_id,
    role
  INTO user_org_id, user_preschool_id, user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Super admins can access any organization
  IF user_role = 'super_admin' OR user_role = 'superadmin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if target matches user's organization (either field)
  IF user_org_id = target_org_id OR user_preschool_id = target_org_id THEN
    RETURN TRUE;
  END IF;
  
  -- No access
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION user_can_access_organization(uuid) IS 'Check if current user can access target organization';

GRANT EXECUTE ON FUNCTION user_can_access_organization(uuid) TO authenticated;

-- ============================================================================
-- STEP 5: Update RLS policies to support both organization_id and preschool_id
-- ============================================================================

-- Update profiles table policies to check both fields
-- This ensures backward compatibility during migration

-- Drop existing profile policies that might conflict
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_select_organization ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

-- Allow users to select their own profile
CREATE POLICY profiles_select_own
ON profiles
FOR SELECT
USING (id = auth.uid());

-- Allow users to select profiles in their organization (both fields)
CREATE POLICY profiles_select_organization
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles AS my_profile
    WHERE
      my_profile.id = auth.uid()
      AND (
        -- Check via organization_id
        (
          profiles.organization_id IS NOT NULL
          AND profiles.organization_id = coalesce(
            my_profile.organization_id,
            my_profile.preschool_id
          )
        )
        OR
        -- Check via preschool_id (legacy)
        (
          profiles.preschool_id IS NOT NULL
          AND profiles.preschool_id = coalesce(
            my_profile.preschool_id,
            my_profile.organization_id
          )
        )
      )
  )
);

-- Allow users to update their own profile
CREATE POLICY profiles_update_own
ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 6: Add computed column helpers for gradual migration
-- ============================================================================

-- Create a view that exposes organization_id (with fallback)
CREATE OR REPLACE VIEW profiles_with_org AS
SELECT
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.avatar_url,
  p.preschool_id,
  p.organization_id,
  p.organization_type,
  p.organization_name,
  p.seat_status,
  p.capabilities,
  p.created_at,
  p.updated_at,
  p.last_login_at,
  coalesce(p.organization_id, p.preschool_id) AS computed_organization_id,
  coalesce(p.organization_type, o.type::text, 'preschool')
    AS computed_organization_type,
  coalesce(p.organization_name, o.name, ps.name) AS computed_organization_name
FROM profiles AS p
LEFT JOIN organizations AS o ON p.organization_id = o.id
LEFT JOIN preschools AS ps ON p.preschool_id = ps.id;

COMMENT ON VIEW profiles_with_org
IS 'Profiles with computed organization fields for backward compatibility';

-- Grant select on view to authenticated users (respects RLS on base table)
GRANT SELECT ON profiles_with_org TO authenticated;

-- ============================================================================
-- STEP 7: Update frequently-used tables RLS policies for dual-field support
-- ============================================================================

-- Helper function to check organization access via either field
CREATE OR REPLACE FUNCTION check_organization_access(target_preschool_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_org_id uuid;
  user_role text;
BEGIN
  SELECT 
    COALESCE(organization_id, preschool_id),
    role
  INTO user_org_id, user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Super admins have access to all
  IF user_role IN ('super_admin', 'superadmin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if target matches user's organization
  IF user_org_id = target_preschool_id THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION check_organization_access(uuid)
IS 'Helper for RLS - check organization access via either field';

GRANT EXECUTE ON FUNCTION check_organization_access(uuid) TO authenticated;

-- ============================================================================
-- STEP 8: Backfill organization types for existing organizations
-- ============================================================================

-- Update organizations.type for records linked to preschools
UPDATE organizations
SET type = 'preschool'::organization_type
WHERE
  preschool_id IS NOT NULL
  AND (type IS NULL OR type = 'preschool'::organization_type);

-- ============================================================================
-- STEP 9: Create trigger to sync organization fields in profiles
-- ============================================================================

-- Function to sync organization fields when profile is updated
CREATE OR REPLACE FUNCTION sync_profile_organization_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If organization_id changed, update cached fields
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id AND NEW.organization_id IS NOT NULL THEN
    SELECT type::text, name
    INTO NEW.organization_type, NEW.organization_name
    FROM organizations
    WHERE id = NEW.organization_id;
  END IF;
  
  -- If preschool_id changed and organization_id is null, backfill from preschool
  IF NEW.preschool_id IS DISTINCT FROM OLD.preschool_id 
     AND NEW.preschool_id IS NOT NULL 
     AND NEW.organization_id IS NULL THEN
    NEW.organization_id := NEW.preschool_id;
    NEW.organization_type := 'preschool';
    
    SELECT name
    INTO NEW.organization_name
    FROM preschools
    WHERE id = NEW.preschool_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_sync_profile_organization_fields ON profiles;
CREATE TRIGGER trigger_sync_profile_organization_fields
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_organization_fields();

COMMENT ON FUNCTION sync_profile_organization_fields() IS 'Automatically sync organization cached fields in profiles';

-- ============================================================================
-- STEP 10: Verification queries (commented out, run manually to verify)
-- ============================================================================

-- Verify backfill results
-- SELECT 
--   COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as profiles_with_org_id,
--   COUNT(*) FILTER (WHERE preschool_id IS NOT NULL) as profiles_with_preschool_id,
--   COUNT(*) FILTER (WHERE organization_id IS NULL AND preschool_id IS NULL) as profiles_without_org,
--   COUNT(*) as total_profiles
-- FROM profiles;

-- Verify organization types
-- SELECT type, COUNT(*) as count
-- FROM organizations
-- GROUP BY type;

-- Verify get_my_profile works (run as authenticated user)
-- SELECT * FROM get_my_profile();

-- Migration complete
