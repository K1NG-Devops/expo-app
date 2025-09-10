-- Critical Schema Fix: Establish proper relationships between core tables
-- This migration fixes the missing foreign key relationships causing RBAC failures

-- ============================================================================
-- CORE TABLE CREATION & RELATIONSHIPS
-- ============================================================================

-- Organizations/Preschools table (if not exists)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'premium', 'enterprise')),
  country TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Ensure preschools table exists with proper structure
CREATE TABLE IF NOT EXISTS public.preschools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  country TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Organization members table (crucial for RBAC)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  seat_status TEXT NOT NULL DEFAULT 'inactive' CHECK (seat_status IN ('active', 'inactive', 'pending', 'revoked')),
  invited_by UUID REFERENCES auth.users(id),
  role TEXT,
  UNIQUE(user_id, organization_id)
);

-- Profiles table with proper organization reference
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('super_admin', 'principal_admin', 'teacher', 'parent')),
  preschool_id UUID REFERENCES public.preschools(id),
  phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Teachers table with organization reference
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  subject_specialization TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Students table with organization and parent references
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  parent_id UUID REFERENCES auth.users(id),
  guardian_id UUID REFERENCES auth.users(id),
  parent_email TEXT,
  class_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Classes table with organization and teacher references
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES auth.users(id),
  grade_level TEXT,
  max_students INTEGER DEFAULT 25,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================================
-- ADD MISSING FOREIGN KEY CONSTRAINTS (IF TABLES ALREADY EXIST)
-- ============================================================================

-- Add foreign key from students to classes if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'students_class_id_fkey' 
    AND table_name = 'students'
  ) THEN
    ALTER TABLE public.students 
    ADD CONSTRAINT students_class_id_fkey 
    FOREIGN KEY (class_id) REFERENCES public.classes(id);
  END IF;
END $$;

-- Ensure organization_members has proper indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_id 
ON public.organization_members (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_org_id 
ON public.organization_members (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_seat_status 
ON public.organization_members (seat_status);

-- Ensure profiles has proper indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_preschool_id 
ON public.profiles (preschool_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role 
ON public.profiles (role);

-- ============================================================================
-- DATA MIGRATION: SYNC ORGANIZATIONS WITH PRESCHOOLS
-- ============================================================================

-- Insert preschools into organizations table if not already there
INSERT INTO public.organizations (id, name, country, created_at, updated_at, plan_tier)
SELECT 
  p.id,
  p.name,
  p.country,
  p.created_at,
  COALESCE(p.updated_at, p.created_at),
  'free'::TEXT -- Default plan tier
FROM public.preschools p
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations o WHERE o.id = p.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORGANIZATION MEMBERSHIP DATA MIGRATION
-- ============================================================================

-- Create organization memberships for existing profiles
INSERT INTO public.organization_members (user_id, organization_id, seat_status, role, created_at)
SELECT 
  p.id as user_id,
  p.preschool_id as organization_id,
  CASE 
    WHEN p.role = 'teacher' THEN 'active'::TEXT
    WHEN p.role IN ('principal_admin', 'principal', 'admin') THEN 'active'::TEXT
    ELSE 'inactive'::TEXT
  END as seat_status,
  p.role,
  p.created_at
FROM public.profiles p
WHERE p.preschool_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.user_id = p.id AND om.organization_id = p.preschool_id
  )
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ============================================================================
-- UPDATED TRIGGERS FOR MAINTAINING DATA CONSISTENCY
-- ============================================================================

-- Function to automatically create organization membership when profile is created/updated
CREATE OR REPLACE FUNCTION public.sync_organization_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile has preschool_id, ensure organization membership exists
  IF NEW.preschool_id IS NOT NULL THEN
    INSERT INTO public.organization_members (
      user_id, 
      organization_id, 
      seat_status, 
      role,
      created_at
    ) VALUES (
      NEW.id,
      NEW.preschool_id,
      CASE 
        WHEN NEW.role = 'teacher' THEN 'pending'
        WHEN NEW.role IN ('principal_admin', 'principal', 'admin') THEN 'active'
        ELSE 'inactive'
      END,
      NEW.role,
      NOW()
    )
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles
DROP TRIGGER IF EXISTS sync_org_membership_on_profile_change ON public.profiles;
CREATE TRIGGER sync_org_membership_on_profile_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.preschool_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_organization_membership();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_organization_members
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_teachers
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_students
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_classes
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preschools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant access to tables
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.preschools TO authenticated;
GRANT ALL ON public.teachers TO authenticated;
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.classes TO authenticated;

-- Grant access to functions
GRANT EXECUTE ON FUNCTION public.sync_organization_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify relationships exist
DO $$
BEGIN
  -- Check if organization_members table has proper foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%organization_members%' 
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE NOTICE 'WARNING: organization_members foreign key constraints may be missing';
  ELSE
    RAISE NOTICE 'SUCCESS: organization_members foreign key constraints verified';
  END IF;

  -- Check if we have organization memberships
  RAISE NOTICE 'Organization memberships count: %', (SELECT COUNT(*) FROM public.organization_members);
  RAISE NOTICE 'Organizations count: %', (SELECT COUNT(*) FROM public.organizations);
  RAISE NOTICE 'Profiles with preschool_id: %', (SELECT COUNT(*) FROM public.profiles WHERE preschool_id IS NOT NULL);
END $$;
