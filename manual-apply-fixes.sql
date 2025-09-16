-- Manual fix application for Supabase SQL editor
-- Copy and paste these commands into the Supabase dashboard SQL editor

BEGIN;

-- Fix 1: Add missing language column to push_devices table
ALTER TABLE public.push_devices 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en','af','zu','st'));

-- Add timezone column as well
ALTER TABLE public.push_devices 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Johannesburg';

-- Update existing records to have default language
UPDATE public.push_devices 
SET language = 'en' 
WHERE language IS NULL;

UPDATE public.push_devices 
SET timezone = 'Africa/Johannesburg' 
WHERE timezone IS NULL;

-- Add an index for better performance on language queries
CREATE INDEX IF NOT EXISTS push_devices_language_idx ON public.push_devices(language);

-- Fix 2: RLS policies for subscriptions table to allow principals access
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS subscriptions_school_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_admin_read ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_modify_own ON public.subscriptions;

-- Helper function to check if user is principal/admin of a school
CREATE OR REPLACE FUNCTION public.user_can_access_school_subscriptions(target_school_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Check if user is super admin (can access all)
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    -- Check if user is principal/admin of the target school
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.preschool_id = target_school_id
    AND u.role IN ('principal', 'principal_admin', 'admin')
  ) OR EXISTS (
    -- Fallback: check profiles table if it exists
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND (
      p.role IN ('superadmin', 'super_admin') 
      OR (p.preschool_id = target_school_id AND p.role IN ('principal', 'principal_admin', 'admin'))
    )
  );
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_can_access_school_subscriptions(UUID) TO authenticated;

-- Create comprehensive RLS policy for subscriptions
CREATE POLICY subscriptions_school_access 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (
  -- School-owned subscriptions: accessible by school admins and super admins
  (owner_type = 'school' AND public.user_can_access_school_subscriptions(school_id))
  OR
  -- User-owned subscriptions: accessible by the user themselves
  (owner_type = 'user' AND user_id = auth.uid())
);

-- Fix 3: Subscription seats and user management RLS policies
-- Enable proper seat assignment and teacher management

-- Fix subscription_seats RLS
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS subscription_seats_select ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_modify ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_school_access ON public.subscription_seats;

-- Create policy for seat access
CREATE POLICY subscription_seats_school_access 
ON public.subscription_seats 
FOR ALL 
TO authenticated 
USING (
  -- Super admin can access all seats
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR
  -- User can access their own seat
  user_id = auth.uid() OR
  -- Principal can access seats for their school's subscriptions
  EXISTS (
    SELECT 1 
    FROM public.subscriptions s
    JOIN public.users u ON u.preschool_id = s.school_id
    WHERE s.id = subscription_seats.subscription_id
      AND u.auth_user_id = auth.uid()
      AND u.role IN ('principal', 'principal_admin', 'admin')
  ) OR EXISTS (
    SELECT 1 
    FROM public.subscriptions s
    JOIN public.profiles p ON p.preschool_id = s.school_id
    WHERE s.id = subscription_seats.subscription_id
      AND p.id = auth.uid()
      AND p.role IN ('principal', 'principal_admin', 'admin')
  )
);

-- Fix users table RLS for principal access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing user policies
DROP POLICY IF EXISTS users_self_or_principal_same_school ON public.users;
DROP POLICY IF EXISTS users_access ON public.users;

-- Create comprehensive user access policy
CREATE POLICY users_access 
ON public.users 
FOR SELECT 
TO authenticated 
USING (
  -- Super admin can see all users
  EXISTS (
    SELECT 1 FROM public.users u2 
    WHERE u2.auth_user_id = auth.uid() 
    AND u2.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR
  -- Self access
  auth_user_id = auth.uid() OR
  -- Principal can see users in their school
  EXISTS (
    SELECT 1 FROM public.users u2 
    WHERE u2.auth_user_id = auth.uid() 
      AND u2.preschool_id = users.preschool_id
      AND u2.role IN ('principal', 'principal_admin', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.preschool_id = users.preschool_id
      AND p.role IN ('principal', 'principal_admin', 'admin')
  )
);

-- Create trigger to update seats_used when subscription_seats changes
CREATE OR REPLACE FUNCTION public.update_subscription_seats_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the seats_used count for the affected subscription
  UPDATE public.subscriptions 
  SET seats_used = (
    SELECT COUNT(*) 
    FROM public.subscription_seats 
    WHERE subscription_id = COALESCE(NEW.subscription_id, OLD.subscription_id)
  )
  WHERE id = COALESCE(NEW.subscription_id, OLD.subscription_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS subscription_seats_update_count_insert ON public.subscription_seats;
DROP TRIGGER IF EXISTS subscription_seats_update_count_delete ON public.subscription_seats;

-- Create triggers
CREATE TRIGGER subscription_seats_update_count_insert
  AFTER INSERT ON public.subscription_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_seats_count();

CREATE TRIGGER subscription_seats_update_count_delete
  AFTER DELETE ON public.subscription_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_seats_count();

-- Fix the "first_name does not exist" error by adding missing columns
DO $$ 
BEGIN
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'first_name' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users ADD COLUMN first_name TEXT;
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'last_name' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_name TEXT;
  END IF;
END $$;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_seats_subscription_id ON public.subscription_seats(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_seats_user_id ON public.subscription_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_users_preschool_role ON public.users(preschool_id, role);

COMMIT;

-- Verification queries:
SELECT 'Applied fixes for:' as summary;
SELECT '1. push_devices language column' as fix;
SELECT '2. subscriptions RLS access for principals' as fix;
SELECT '3. subscription_seats RLS and triggers' as fix;
SELECT '4. users table first_name/last_name columns' as fix;
SELECT '5. proper seat counting triggers' as fix;
