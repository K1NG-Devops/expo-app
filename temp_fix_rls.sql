-- Temporarily disable RLS on profiles table to test if that's the issue
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Or alternatively, create a very permissive policy
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
-- CREATE POLICY profiles_read_all ON public.profiles FOR SELECT USING (true);
