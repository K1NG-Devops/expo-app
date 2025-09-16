-- Activate teacher seat by updating seat_status from "pending" to "active"
-- Teacher: katso@youngeagles.org.za (a1fd12d2-5f09-4a23-822d-f3071bfc544b)

-- 1. Check current seat status
SELECT 
  'Current Status' as section,
  id,
  user_id,
  organization_id,
  seat_status,
  role,
  updated_at
FROM public.organization_members  -- or whatever this table is called
WHERE user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;

-- 2. Update seat_status from "pending" to "active"
UPDATE public.organization_members
SET 
  seat_status = 'active',
  updated_at = NOW()
WHERE user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid
  AND organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid;

-- 3. Verify the update worked
SELECT 
  'Updated Status' as section,
  id,
  user_id,
  organization_id,
  seat_status,
  role,
  updated_at
FROM public.organization_members
WHERE user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;

-- EXPECTED RESULT:
-- seat_status should now be "active" instead of "pending"
-- This should immediately unlock the teacher dashboard