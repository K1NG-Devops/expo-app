-- Deploy get_my_profile RPC function
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_my_profile();

-- Create the get_my_profile function
-- This returns the current authenticated user's profile
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
    id uuid,
    email text,
    role text,
    first_name text,
    last_name text,
    avatar_url text,
    preschool_id uuid,
    created_at timestamptz,
    last_login_at timestamptz,
    is_active boolean,
    auth_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Return empty if no authenticated user
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Return the user's profile from users table
    -- Try matching by auth_user_id first (recommended field)
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
        u.last_login_at,
        u.is_active,
        u.auth_user_id
    FROM users u
    WHERE u.auth_user_id = current_user_id
    LIMIT 1;
    
    -- If no result, try matching by id field (fallback)
    IF NOT FOUND THEN
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
            u.last_login_at,
            u.is_active,
            u.auth_user_id
        FROM users u
        WHERE u.id = current_user_id
        LIMIT 1;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_my_profile() IS 'Returns the profile of the currently authenticated user. Security definer function that bypasses RLS safely.';

-- Verify the function was created
SELECT 
    routine_name,
    routine_type,
    security_type,
    specific_name
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_my_profile';
