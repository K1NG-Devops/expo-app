-- Principal Allocation Access - DB Sanity Check Script
-- Run this in Supabase SQL Editor to verify and fix principal access
-- Replace 'your-email@example.com' with your actual principal email

-- =========================================================================
-- 1. CHECK CURRENT USER STATE
-- =========================================================================

-- Check if your auth user exists and get the ID
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  au.user_metadata
FROM auth.users au
WHERE au.email = 'your-email@example.com'; -- REPLACE WITH YOUR EMAIL

-- Check if public.users record exists for your auth user
SELECT 
  u.id as public_user_id,
  u.auth_user_id,
  u.email,
  u.role,
  u.preschool_id,
  u.organization_id,
  u.created_at as profile_created_at,
  p.name as preschool_name
FROM public.users u
LEFT JOIN preschools p ON p.id = COALESCE(u.preschool_id, u.organization_id)
JOIN auth.users au ON au.id = u.auth_user_id
WHERE au.email = 'your-email@example.com'; -- REPLACE WITH YOUR EMAIL

-- =========================================================================
-- 2. VERIFY PRESCHOOL EXISTS
-- =========================================================================

-- Check available preschools (choose one for your principal)
SELECT 
  id,
  name,
  email,
  is_active,
  created_at
FROM preschools
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- =========================================================================
-- 3. UPSERT PRINCIPAL USER (IF MISSING OR INCORRECT)
-- =========================================================================

-- Get your auth_user_id first (replace the email)
DO $$
DECLARE
  target_auth_user_id uuid;
  target_preschool_id uuid;
BEGIN
  -- Get the auth user ID
  SELECT id INTO target_auth_user_id 
  FROM auth.users 
  WHERE email = 'your-email@example.com'; -- REPLACE WITH YOUR EMAIL
  
  -- Get or create a preschool (using first active one, or create a test one)
  SELECT id INTO target_preschool_id 
  FROM preschools 
  WHERE is_active = true 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- If no preschool exists, create a test one
  IF target_preschool_id IS NULL THEN
    INSERT INTO preschools (id, name, email, is_active)
    VALUES (
      gen_random_uuid(),
      'Test Preschool',
      'admin@testpreschool.com',
      true
    ) RETURNING id INTO target_preschool_id;
    
    RAISE NOTICE 'Created test preschool with ID: %', target_preschool_id;
  END IF;
  
  -- Upsert the principal user
  IF target_auth_user_id IS NOT NULL AND target_preschool_id IS NOT NULL THEN
    INSERT INTO public.users (
      id,
      auth_user_id,
      email,
      role,
      preschool_id,
      first_name,
      last_name,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      target_auth_user_id,
      'your-email@example.com', -- REPLACE WITH YOUR EMAIL
      'principal',
      target_preschool_id,
      'Test',
      'Principal',
      true,
      now(),
      now()
    )
    ON CONFLICT (auth_user_id) 
    DO UPDATE SET
      role = EXCLUDED.role,
      preschool_id = EXCLUDED.preschool_id,
      updated_at = now();
    
    RAISE NOTICE 'Principal user upserted for auth_user_id: %', target_auth_user_id;
    RAISE NOTICE 'Assigned to preschool_id: %', target_preschool_id;
  ELSE
    RAISE NOTICE 'Could not find auth user or preschool';
  END IF;
END $$;

-- =========================================================================
-- 4. ADD A TEST TEACHER (OPTIONAL)
-- =========================================================================

-- Create a test teacher in the same preschool for allocation testing
DO $$
DECLARE
  principal_preschool_id uuid;
BEGIN
  -- Get the principal's preschool
  SELECT COALESCE(u.preschool_id, u.organization_id) INTO principal_preschool_id
  FROM public.users u
  JOIN auth.users au ON au.id = u.auth_user_id
  WHERE au.email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
    AND u.role = 'principal';
  
  -- Insert test teacher if preschool found
  IF principal_preschool_id IS NOT NULL THEN
    INSERT INTO public.users (
      id,
      auth_user_id,
      email,
      role,
      preschool_id,
      first_name,
      last_name,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      gen_random_uuid(), -- Fake auth_user_id for testing
      'teacher@testpreschool.com',
      'teacher',
      principal_preschool_id,
      'Test',
      'Teacher',
      true,
      now(),
      now()
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    
    RAISE NOTICE 'Test teacher added to preschool: %', principal_preschool_id;
  END IF;
END $$;

-- =========================================================================
-- 5. VERIFY FINAL STATE
-- =========================================================================

-- Check final principal state
SELECT 
  'PRINCIPAL CHECK' as check_type,
  u.id as public_user_id,
  u.auth_user_id,
  u.email,
  u.role,
  u.preschool_id,
  u.organization_id,
  p.name as school_name,
  u.is_active
FROM public.users u
LEFT JOIN preschools p ON p.id = COALESCE(u.preschool_id, u.organization_id)
JOIN auth.users au ON au.id = u.auth_user_id
WHERE au.email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
  AND u.role IN ('principal', 'principal_admin', 'super_admin');

-- Check teachers in the same preschool
SELECT 
  'TEACHERS IN SCHOOL' as check_type,
  COUNT(*) as teacher_count,
  u.preschool_id
FROM public.users u
JOIN auth.users au_principal ON au_principal.email = 'your-email@example.com' -- REPLACE
JOIN public.users u_principal ON u_principal.auth_user_id = au_principal.id
WHERE u.role = 'teacher'
  AND u.preschool_id = COALESCE(u_principal.preschool_id, u_principal.organization_id)
GROUP BY u.preschool_id;

-- =========================================================================
-- 6. TEST ALLOCATION PERMISSION FUNCTION
-- =========================================================================

-- Test the canManageAllocations logic
DO $$
DECLARE
  test_auth_user_id uuid;
  test_preschool_id uuid;
  can_manage boolean := false;
BEGIN
  -- Get test data
  SELECT u.auth_user_id, COALESCE(u.preschool_id, u.organization_id)
  INTO test_auth_user_id, test_preschool_id
  FROM public.users u
  JOIN auth.users au ON au.id = u.auth_user_id
  WHERE au.email = 'your-email@example.com' -- REPLACE WITH YOUR EMAIL
    AND u.role IN ('principal', 'principal_admin', 'super_admin');
  
  -- Test role-based permission
  SELECT EXISTS(
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = test_auth_user_id
      AND lower(u.role) IN ('principal', 'principal_admin', 'super_admin')
      AND COALESCE(u.preschool_id, u.organization_id) = test_preschool_id
  ) INTO can_manage;
  
  RAISE NOTICE 'Allocation permission test:';
  RAISE NOTICE '  Auth User ID: %', test_auth_user_id;
  RAISE NOTICE '  Preschool ID: %', test_preschool_id;
  RAISE NOTICE '  Can Manage Allocations: %', can_manage;
END $$;

-- Done! If can_manage is true, your principal should have access.