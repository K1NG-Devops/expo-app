-- Fix the null role for the testing user
UPDATE public.profiles 
SET role = 'teacher', 
    updated_at = NOW()
WHERE id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'
  AND role IS NULL;

-- Also update any other users with null roles to have a default role
UPDATE public.profiles 
SET role = 'parent', 
    updated_at = NOW()
WHERE role IS NULL;
