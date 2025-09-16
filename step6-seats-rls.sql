-- STEP 6: Apply RLS to subscription_seats table (FINAL STEP)
-- Apply this AFTER confirming Step 5 (subscriptions) is working  
-- This was the original cause of the seat management issues

BEGIN;

-- Enable RLS on subscription_seats table
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;

-- Policy: Principals can manage seats, users can see their own seats
CREATE POLICY subscription_seats_access ON public.subscription_seats 
FOR ALL TO authenticated USING (
  -- Superadmin sees/manages all seats
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- Users can see their own seat
  user_id = auth.uid() OR
  -- Principals can see/manage seats for their school's subscriptions
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.preschool_id = s.school_id
    WHERE s.id = subscription_seats.subscription_id
      AND p.id = auth.uid()
      AND p.role = 'principal'
  )
);

COMMIT;

-- FINAL TEST POINTS after applying:
-- 1. ✅ SEAT MANAGEMENT PAGE - This is the big test!
--    - Should show "All Teachers (2)" 
--    - katso@youngeagles.org.za should show "Has seat [Revoke]"
--    - king@youngeagles.org.za should show "No seat [Assign Seat]"
--    - Should show "Seats: 1/3"
--
-- 2. ✅ Assign/revoke seat functionality works?
-- 3. ✅ Principal can see seat assignments?  
-- 4. ✅ Teachers can see their own seat status?
-- 5. ✅ No 500 errors anywhere in the app?

-- If the seat management page breaks or shows "All Teachers (0)" again:
-- ALTER TABLE public.subscription_seats DISABLE ROW LEVEL SECURITY;

-- If everything works perfectly, congratulations! 
-- You now have full RLS security with working functionality! 🎉