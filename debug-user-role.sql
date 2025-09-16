-- Final debug: Check user's role and preschool_id
-- User ID: 136cf31c-b37c-45c0-9cf7-755bd1b9afbf

-- Check user details in profiles table
SELECT 'user profile details' as check_type,
       id, 
       role,
       preschool_id,
       email,
       CASE 
         WHEN role IN ('principal', 'principal_admin', 'super_admin') THEN 'HAS_ADMIN_ROLE'
         ELSE 'NO_ADMIN_ROLE'
       END as role_status,
       CASE 
         WHEN preschool_id IS NOT NULL THEN 'HAS_PRESCHOOL'
         ELSE 'NO_PRESCHOOL'
       END as preschool_status
FROM public.profiles 
WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Check user details in users table
SELECT 'user details in users' as check_type,
       auth_user_id,
       role,
       preschool_id,
       email,
       CASE 
         WHEN role IN ('principal', 'principal_admin', 'super_admin') THEN 'HAS_ADMIN_ROLE'
         ELSE 'NO_ADMIN_ROLE'
       END as role_status
FROM public.users 
WHERE auth_user_id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Check available preschools
SELECT 'available preschools' as check_type,
       id as preschool_id, 
       name as preschool_name
FROM public.preschools 
ORDER BY name
LIMIT 5;