# Step-by-Step RLS Implementation Plan

## Security Risk Assessment

Without RLS, we have these risks:
- ❌ Users can see data from other schools 
- ❌ Teachers can see admin data
- ❌ Parents might access teacher data
- ❌ No tenant isolation

## Implementation Strategy

We'll apply RLS policies **one table at a time**, testing after each step to ensure functionality remains intact.

### Current User Roles in System:
- `superadmin` - Can see everything
- `principal` - Can see their school's data  
- `teacher` - Can see their school's data (limited)
- `parent` - Can see their child's data only

### Step 1: subscription_plans (ALREADY WORKING ✅)
**Status**: Already has RLS with `USING (true)` - all authenticated users can read plans
**Risk Level**: Low (public data)
**Action**: Keep as-is

### Step 2: preschools (Low Risk)
**Why start here**: Simple table, low impact if broken
**Policy**: Users can see their own preschool only

### Step 3: profiles (Medium Risk) 
**Why next**: Core user data, but predictable access patterns
**Policy**: Users see own profile + school members for principals

### Step 4: users (Medium Risk)
**Why next**: Similar to profiles but more complex schema
**Policy**: Users see own record + school members for principals  

### Step 5: subscriptions (High Risk)
**Why later**: Financial data, complex ownership patterns
**Policy**: School members can see school subscriptions

### Step 6: subscription_seats (Highest Risk)
**Why last**: This was causing the seat management issues
**Policy**: Complex - seats visible to principals and seat holders

## Implementation Scripts

I'll create individual scripts for each step that you can apply one at a time.