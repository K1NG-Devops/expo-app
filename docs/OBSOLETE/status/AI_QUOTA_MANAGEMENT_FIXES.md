# AI Quota Management Fixes

## Issues Identified and Fixed

### 1. **AI Quota Management Showing Wrong Tier (ENTERPRISE instead of STARTER)**

**Problem**: The AI Quota Management screen was defaulting to "ENTERPRISE" tier instead of showing the actual subscription tier (STARTER).

**Root Cause**: In `lib/ai/allocation-direct.ts`, line 34 was defaulting to `'enterprise'` when no subscription tier was found:
```typescript
const tier = school.subscription_tier || 'enterprise'; // ❌ Wrong default
```

**Fixes Applied**:

1. **Enhanced Database Query**: Updated the query to properly join with `subscriptions` and `subscription_plans` tables to get the actual active subscription tier:
```typescript
.select(`
  id, 
  name, 
  subscription_tier,
  subscriptions!inner(
    status,
    subscription_plans!inner(
      name,
      tier,
      price_monthly
    )
  )
`)
.eq('subscriptions.status', 'active')
```

2. **Fixed Default Tier**: Changed the fallback logic to use `'free'` instead of `'enterprise'`:
```typescript
const tier = subscriptionPlan?.tier || school.subscription_tier || 'free'; // ✅ Correct default
```

3. **Enhanced Tier Mapping**: Updated `getBaseQuotasByTier()` function to include all tier types:
```typescript
const quotaMap = {
  'free': { chat_completions: 100, ... },
  'starter': { chat_completions: 500, ... },
  'basic': { chat_completions: 1000, ... },    // ✅ Added
  'premium': { chat_completions: 2000, ... },
  'pro': { chat_completions: 5000, ... },      // ✅ Added
  'enterprise': { chat_completions: 10000, ... },
};
```

4. **Added Debug Logging**: Temporary console logs to track tier detection:
```typescript
console.log(`AI Allocation Debug - School ${preschoolId}:`);
console.log(`  - Final tier used: ${tier}`);
console.log(`  - Base quotas for ${tier}:`, baseQuotas);
```

### 2. **Missing Back Buttons on Specific Pages**

**Problem**: Two pages were missing back button functionality:
- "Create a School-wide Invite" page (`principal-parent-invite-code.tsx`)
- "Parent Request" page (`principal-parent-requests.tsx`)

**Fixes Applied**:

#### A. Parent Invite Code Screen (`app/screens/principal-parent-invite-code.tsx`)

1. **Added Router Import**:
```typescript
import { Stack, router } from 'expo-router';
```

2. **Enhanced Stack.Screen Options**:
```typescript
<Stack.Screen 
  options={{ 
    title: 'Create School-wide Invite',
    headerShown: true,
    headerBackVisible: true,
  }} 
/>
```

3. **Fixed Missing Style**: Added the missing `fieldRow` style that was causing runtime errors:
```typescript
fieldRow: { marginBottom: 12 },
```

#### B. Parent Requests Screen (`app/screens/principal-parent-requests.tsx`)

1. **Added Router Import**:
```typescript
import { Stack, router } from 'expo-router';
```

2. **Enhanced Stack.Screen Options**:
```typescript
<Stack.Screen 
  options={{ 
    title: 'Parent Requests',
    headerShown: true,
    headerBackVisible: true,
  }} 
/>
```

### 3. **Enhanced Navigation Logic**

**Updated Navigation Rules**: Enhanced `lib/navigation.ts` to automatically show back buttons for these types of screens:

```typescript
function shouldAlwaysShowBackButton(routeName: string): boolean {
  const n = (routeName || '').toLowerCase();
  
  // ... existing rules ...
  
  // Invite and request management screens
  if (n.includes('invite') || n.includes('request') || 
      n.includes('parent-invite') || n.includes('parent-request')) {
    return true;
  }
  
  // Principal management screens
  if (n.includes('principal-parent') || n.includes('school-wide')) {
    return true;
  }
  
  return false;
}
```

## Debug Tools Created

### Database Debug Script (`debug-subscription-tier.sql`)
Created a comprehensive SQL script to debug subscription tier issues:
- Checks preschools table data
- Verifies active subscriptions
- Lists available subscription plans
- Shows the effective tier calculation logic

## Expected Results

After these fixes:

1. **AI Quota Management** should now display the correct subscription tier (STARTER, FREE, etc.) instead of always showing ENTERPRISE
2. **Back button navigation** should work properly on:
   - Create School-wide Invite page
   - Parent Requests page
3. **Navigation consistency** across all screens with proper back button detection
4. **Debug logging** in console to help identify any remaining tier detection issues

## Testing Steps

1. **Verify AI Quota Management Tier Display**:
   - Navigate to AI Quota Management screen
   - Check that the tier shows "STARTER" (or actual tier) instead of "ENTERPRISE"
   - Look in browser console for debug logs showing tier detection

2. **Verify Back Button Functionality**:
   - Navigate to "Create School-wide Invite" page
   - Verify back button appears and works
   - Navigate to "Parent Requests" page
   - Verify back button appears and works

3. **Clean Up Debug Logs**:
   - Once tier detection is confirmed working, remove console.log statements from allocation-direct.ts

## Files Modified

- `lib/ai/allocation-direct.ts` - Fixed tier detection and added debug logging
- `app/screens/principal-parent-invite-code.tsx` - Added back button support and fixed styles
- `app/screens/principal-parent-requests.tsx` - Added back button support
- `lib/navigation.ts` - Enhanced navigation rules for invite/request screens

## Files Created

- `debug-subscription-tier.sql` - Database debugging script
- `AI_QUOTA_MANAGEMENT_FIXES.md` - This documentation file