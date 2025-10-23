# Dash Orb Hidden on Registration Screens

**Feature**: Hide Dash AI floating button during registration  
**Date**: 2025-10-22  
**Component**: `app/_layout.tsx`

## Changes Made

The Dash Orb (floating AI assistant button) is now hidden on all registration and sign-up related screens.

### Screens Where Dash Orb is Hidden

1. **Registration Screens**:
   - `/screens/parent-registration`
   - `/screens/teacher-registration`
   - `/screens/school-registration`
   - `/screens/parent-child-registration`
   - Any route containing "registration" or "register"

2. **Sign-up Flows**:
   - Routes containing "sign-up" or "signup"
   
3. **Post-Registration Screens**:
   - `/screens/verify-your-email` - Email verification screen
   - `/profiles-gate` - Profile completion screen

### Why This Change?

**User Experience Reasons**:
- Registration is a focused task - users should complete it without distractions
- AI assistant is not helpful during form filling
- Reduces cognitive load during onboarding
- Prevents accidental activation during typing

**Technical Reasons**:
- Dash requires authenticated user context
- New users don't have profile data yet for personalization
- Avoids potential errors from missing user metadata

## Implementation

### Route Detection Logic

```typescript
// Registration routes (hide Dash Orb during sign-up)
if (pathname.includes('registration') ||
    pathname.includes('register') ||
    pathname.includes('sign-up') ||
    pathname.includes('signup') ||
    pathname.includes('verify-your-email') ||
    pathname.includes('profiles-gate')) {
  return true; // Hide FAB
}
```

### Complete List of Hidden Screens

The Dash Orb is now hidden on:

1. **Auth screens**: sign-in, auth callbacks
2. **Registration screens**: all registration flows ✨ NEW
3. **Landing pages**: welcome, landing, onboarding
4. **Dash Assistant screens**: when assistant is open
5. **Voice UI active**: when voice modal is open

## User Journey

### Before Fix
```
User starts registration → Dash Orb visible (floating) → Distracting
```

### After Fix
```
User starts registration → Dash Orb hidden → Focused experience ✓
User completes registration → Routes to dashboard → Dash Orb appears ✓
```

## Visual Impact

**Registration Flow (Parent Example)**:
1. **Click "Register as Parent"** → Orb disappears
2. **Fill in personal info** → No distractions
3. **Set password & accept terms** → Clean UI
4. **Verify email** → Orb still hidden
5. **Complete profile** → Orb still hidden
6. **Land on dashboard** → **Orb appears with welcome message!**

## Testing

### Manual Testing Steps

1. **Start any registration flow**:
   ```
   - Parent registration
   - Teacher registration
   - School registration
   ```

2. **Verify Dash Orb is hidden**:
   - No floating blue button visible
   - Clean, distraction-free form

3. **Complete registration**:
   - Email verification
   - Profile completion

4. **Reach dashboard**:
   - Dash Orb should appear
   - Welcome message should show

### Test All Registration Routes

- [ ] `/screens/parent-registration` - Orb hidden
- [ ] `/screens/teacher-registration` - Orb hidden
- [ ] `/screens/school-registration` - Orb hidden
- [ ] `/screens/parent-child-registration` - Orb hidden
- [ ] `/screens/verify-your-email` - Orb hidden
- [ ] `/profiles-gate` - Orb hidden
- [ ] Post-login dashboard - Orb visible ✓

## Edge Cases

✅ **Orb reappears correctly** after registration completes  
✅ **Works for all roles** (parent, teacher, principal, student)  
✅ **Wake word listener** (Hey Dash) is not affected  
✅ **Theme changes** don't affect hiding logic  
✅ **Back navigation** from registration maintains hidden state  

## Performance Impact

**Minimal** - Only adds route string checks to existing logic.

## Related Features

- Terms acceptance requirement (must accept terms before continuing)
- Email confirmation flow improvements
- Profile creation trigger fix

## Files Modified

- `app/_layout.tsx`
  - Updated `shouldHideFAB` logic
  - Added registration route detection

---

**Status**: ✅ IMPLEMENTED  
**Impact**: All registration flows  
**User Experience**: Cleaner, more focused registration
