-- Fix subscription plan reference issue
-- Apply this in Supabase SQL Editor

BEGIN;

-- Update Young Eagles subscription to use the existing Free plan UUID
-- instead of the invalid "free" string
UPDATE public.subscriptions 
SET plan_id = '11111111-1111-4111-8111-111111111111'  -- Existing "Free" plan UUID
WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1' 
AND plan_id = 'free';

COMMIT;

-- This should fix the 400 Bad Request error in the superadmin dashboard