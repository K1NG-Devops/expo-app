-- Quick check to see what data exists

-- 1. Check if teacher exists
SELECT 
  'Teacher Check' as section,
  id, email, role, preschool_id
FROM public.users 
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check subscriptions table with teacher's preschool_id
SELECT 
  'Subscription Check' as section,
  id, school_id, status, seats_used
FROM public.subscriptions 
WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid;

-- 3. Check if subscription_seats table has any data
SELECT 
  'Current Seats' as section,
  subscription_id, user_id, assigned_at
FROM public.subscription_seats;

-- 4. Manual assignment test (if needed)
-- Get the subscription ID first, then we can manually assign
SELECT 
  'Ready for Assignment' as section,
  'Teacher: 48f8086a-3c88-44a2-adcd-570d97d3a580' as teacher_id,
  'Principal: elsha@youngeagles.org.za (3bd86a31-7e78-4075-9d01-9e7606723dea)' as principal_info,
  'Preschool: ba79097c-1b93-4b48-bcbe-df73878ab4d1' as school_id;