-- Migration: Enforce single active seat per (subscription_id, user_id) and deduplicate
-- Created: 2025-09-30 21:43 UTC
-- Purpose:
--  - Replace ineffective unique constraint relying on NULL (revoked_at) with a partial unique index
--  - Deduplicate any existing active seat rows, keeping the most recent assignment
--  - Recalculate seats_used for subscriptions

BEGIN;

-- 1) Drop the old unique constraint if it exists (name used in a previous migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_seats_unique_active_user'
      AND conrelid = 'public.subscription_seats'::regclass
  ) THEN
    ALTER TABLE public.subscription_seats
      DROP CONSTRAINT subscription_seats_unique_active_user;
  END IF;
END $$;

-- 2) Create a proper partial unique index that treats NULLs correctly
--    Ensures there can be only one active seat (revoked_at IS NULL) per (subscription_id, user_id)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_subscription_user
ON public.subscription_seats (subscription_id, user_id)
WHERE revoked_at IS NULL;

-- 3) Deduplicate existing data: keep the newest active row per (subscription_id, user_id), revoke older ones
WITH ranked AS (
  SELECT
    id,
    subscription_id,
    user_id,
    assigned_at,
    ROW_NUMBER() OVER (
      PARTITION BY subscription_id, user_id
      ORDER BY assigned_at DESC NULLS LAST
    ) AS rn
  FROM public.subscription_seats
  WHERE revoked_at IS NULL
)

UPDATE public.subscription_seats AS s
SET
  revoked_at = NOW(),
  revoked_by = COALESCE(auth.uid(), s.assigned_by)
FROM ranked AS r
WHERE
  s.id = r.id
  AND r.rn > 1;

-- 4) Recalculate seats_used counts on subscriptions
UPDATE public.subscriptions AS sub
SET
  seats_used = x.active_count,
  updated_at = NOW()
FROM (
  SELECT
    subscription_id,
    COUNT(*) AS active_count
  FROM public.subscription_seats
  WHERE revoked_at IS NULL
  GROUP BY subscription_id
) AS x
WHERE x.subscription_id = sub.id;

COMMIT;
