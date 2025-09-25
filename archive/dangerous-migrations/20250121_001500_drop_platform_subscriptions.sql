-- Drop legacy user-based subscription table and related artifacts
-- Safe to run multiple times

-- Drop dependent view if exists
DROP VIEW IF EXISTS public.users_with_subscription CASCADE;

-- Drop the legacy table itself
DROP TABLE IF EXISTS public.platform_subscriptions CASCADE;

-- Verification: emit notices
DO $$
BEGIN
  IF to_regclass('public.platform_subscriptions') IS NULL THEN
    RAISE NOTICE 'Dropped platform_subscriptions successfully (or it did not exist).';
  END IF;
END
$$;