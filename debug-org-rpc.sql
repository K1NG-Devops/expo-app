-- Debug Organization Creation RPC
-- Check user profile and test RPC execution

-- 1. Check if user exists and their role
SELECT 
  id,
  email,
  role,
  preschool_id,
  organization_id,
  first_name,
  last_name
FROM profiles
WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- 2. Check if organizations table has the required columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- 3. Check if the RPC function exists and its definition
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'create_organization';

-- 4. Test calling the RPC with proper authentication context
-- Note: This needs to be run as the authenticated user
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claim.sub TO '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- SELECT * FROM create_organization(
--   'Test Organization',
--   'skills',
--   '+27123456789',
--   'pending'
-- );
