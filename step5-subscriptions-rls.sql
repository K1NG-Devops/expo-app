-- STEP 5: Apply RLS to subscriptions table
-- Apply this AFTER confirming Step 4 (users) is working
-- This controls access to financial/billing data

BEGIN;

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: School members can see school subscriptions, users can see their own
CREATE POLICY subscriptions_access ON public.subscriptions 
FOR SELECT TO authenticated USING (
  -- Superadmin sees all subscriptions  
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- User-owned subscriptions (legacy)
  (owner_type = 'user' AND user_id = auth.uid()) OR
  -- School-owned subscriptions - accessible by school members
  (owner_type = 'school' AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.preschool_id = subscriptions.school_id
  ))
);

COMMIT;

-- TEST POINTS after applying:
-- 1. ✅ Superadmin dashboard - can see all subscriptions?
-- 2. ✅ Principal dashboard - shows subscription status/seat counts? 
-- 3. ✅ Seat management page - shows "Seats: 1/3" correctly?
-- 4. ✅ No 500 errors on subscription queries?
-- 5. ✅ Subscription context still works in app?

-- If subscriptions break (like seat counts not showing), revert with:
-- ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- If this works, we're almost done - just subscription_seats left!