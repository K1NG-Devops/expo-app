-- Fix RLS policies to enable proper seat management
-- This addresses the core issues preventing seat assignment from working

BEGIN;

-- 1. Fix subscription_seats RLS to allow principals to manage their school's seats
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
)
WITH CHECK (
  -- Same logic for inserts/updates
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR
  user_id = auth.uid() OR
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

-- 2. Ensure users table has proper RLS for principal access
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

-- 3. Create trigger to update seats_used when subscription_seats changes (if not exists)
-- First create the function
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

-- 4. Fix the "first_name does not exist" error by checking table structure
-- Add missing columns to users table if they don't exist
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

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.user_can_access_school_subscriptions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_subscription_seats_count() TO authenticated;

-- 6. Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_seats_subscription_id ON public.subscription_seats(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_seats_user_id ON public.subscription_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_users_preschool_role ON public.users(preschool_id, role);

COMMIT;

-- Verification: These queries should now work for authenticated principals
-- SELECT COUNT(*) FROM subscription_seats WHERE subscription_id = 'YOUR_SUBSCRIPTION_ID';
-- SELECT * FROM users WHERE role = 'teacher' AND preschool_id = 'YOUR_SCHOOL_ID';