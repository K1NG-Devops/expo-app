-- Clean legacy user-based platform subscriptions with hardcoded plan IDs
-- This does NOT affect the new school-based subscriptions table

-- Archive then purge, only if the table exists
DO $$
BEGIN
  IF to_regclass('public.platform_subscriptions') IS NOT NULL THEN
    -- Create archive table if it doesn't exist
    IF to_regclass('public._archive_platform_subscriptions') IS NULL THEN
      CREATE TABLE public._archive_platform_subscriptions AS
      SELECT * FROM public.platform_subscriptions WHERE 1=2;
    END IF;

    -- Archive existing rows (only once per run)
    INSERT INTO public._archive_platform_subscriptions
    SELECT * FROM public.platform_subscriptions;

    -- Purge all legacy rows
    DELETE FROM public.platform_subscriptions;
  END IF;
END
$$;

-- Optional hardening: restrict public reads if table still exists
DO $$
BEGIN
  IF to_regclass('public.platform_subscriptions') IS NOT NULL THEN
    -- Ensure RLS is enabled and lock down to superadmin only
    ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

    -- Drop permissive policies if any and add strict read policy
    -- Note: Use IF EXISTS to avoid errors if policies don't exist
    DROP POLICY IF EXISTS "Public read platform_subscriptions" ON public.platform_subscriptions;
    DROP POLICY IF EXISTS "Users manage their platform_subscriptions" ON public.platform_subscriptions;

    CREATE POLICY "Only superadmins can view platform_subscriptions" ON public.platform_subscriptions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'superadmin'
        )
      );
  END IF;
END
$$;

-- Verification notice
DO $$
DECLARE
  remaining INTEGER := 0;
BEGIN
  IF to_regclass('public.platform_subscriptions') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.platform_subscriptions' INTO remaining;
  END IF;
  RAISE NOTICE 'Legacy platform_subscriptions cleanup complete. Remaining rows: %', remaining;
END
$$;