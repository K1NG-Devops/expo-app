# RLS Step-by-Step Testing Checklist

## Pre-Implementation Status ✅
- App should be working after `complete-cleanup.sql`
- No 500 errors
- Seat management shows both teachers
- Superadmin dashboard functional

## Step 1: subscription_plans ✅ 
**Already Applied** - Should be working
- [ ] Superadmin can see subscription plans
- [ ] No 400 errors on plan queries

## Step 2: Apply `step2-preschools-rls.sql`

### Test After Step 2:
- [ ] Superadmin dashboard loads preschools list
- [ ] Principal can see their school name/data
- [ ] No new 500 errors on preschools queries
- [ ] Seat management page still works

**If any test fails**: Run `ALTER TABLE public.preschools DISABLE ROW LEVEL SECURITY;`

## Step 3: Apply `step3-profiles-rls.sql` 

### Test After Step 3:
- [ ] 🎯 **CRITICAL**: Seat management page shows "All Teachers (2)" 
- [ ] Principal dashboard shows user profile data
- [ ] Teacher dashboard loads without errors
- [ ] Superadmin can see all user profiles
- [ ] No 500 errors on profiles queries

**If any test fails**: Run `ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;`

## Step 4: Apply `step4-users-rls.sql`

### Test After Step 4:
- [ ] 🚨 **ULTRA-CRITICAL**: No 500 errors on users queries (this was the main problem)
- [ ] Superadmin dashboard users count loads
- [ ] Seat management still shows teachers  
- [ ] All user dashboards load properly
- [ ] User authentication/profile loading works

**If any test fails**: Run `ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;`

## Step 5: Apply `step5-subscriptions-rls.sql`

### Test After Step 5:
- [ ] Seat management shows "Seats: 1/3" correctly
- [ ] Principal dashboard shows subscription status
- [ ] Superadmin can see all subscriptions
- [ ] Subscription context works in app
- [ ] No 500 errors on subscription queries

**If any test fails**: Run `ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;`

## Step 6: Apply `step6-seats-rls.sql` (FINAL)

### Test After Step 6:
- [ ] 🏆 **ULTIMATE TEST**: Seat management page shows:
  - "All Teachers (2)" 
  - katso@youngeagles.org.za ✅ "Has seat [Revoke]"
  - king@youngeagles.org.za ❌ "No seat [Assign Seat]"
  - "Seats: 1/3"
- [ ] Assign seat functionality works
- [ ] Revoke seat functionality works  
- [ ] Teachers can see their seat status
- [ ] No 500 errors anywhere

**If any test fails**: Run `ALTER TABLE public.subscription_seats DISABLE ROW LEVEL SECURITY;`

## Success Criteria 🎉

If all 6 steps pass, you'll have:
- ✅ Full RLS security (proper tenant isolation)
- ✅ Working seat management 
- ✅ No 500 errors
- ✅ All dashboards functional
- ✅ Your superadmin improvements preserved

## Emergency Revert Commands

If at any point you want to revert ALL progress and go back to no RLS:

```sql
ALTER TABLE public.preschools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_seats DISABLE ROW LEVEL SECURITY;
```

This approach gives us **controlled, testable security** instead of breaking everything at once!