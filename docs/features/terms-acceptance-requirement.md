# Terms and Conditions Acceptance Requirement

**Feature**: Terms acceptance required before registration  
**Date**: 2025-10-22  
**Component**: `EnhancedRegistrationForm`

## Changes Made

### 1. Continue Button Disabled State

The "Continue" / "Complete Registration" button on the security setup step is now disabled until the user accepts the Terms and Conditions.

**Before**:
- Button was always enabled (only disabled during loading)
- Users could skip terms acceptance

**After**:
- Button disabled when on security_setup step AND acceptTerms is false
- Visual feedback: gray background + 50% opacity when disabled

### 2. Visual Indicator Added

Added a warning message that appears when terms are not accepted:

```
⚠️ Please accept the Terms and Conditions to continue
```

- Shows in an error-colored container below the checkboxes
- Only visible when `acceptTerms` is `false`
- Automatically disappears when user checks the box

## Technical Implementation

### Button Disabled Logic

```typescript
disabled={loading || (currentStep === 'security_setup' && !formState.acceptTerms)}
```

### Visual Feedback

```typescript
backgroundColor: (loading || (currentStep === 'security_setup' && !formState.acceptTerms))
  ? theme.colors.surfaceVariant 
  : theme.colors.primary,
opacity: (loading || (currentStep === 'security_setup' && !formState.acceptTerms)) ? 0.5 : 1
```

### Warning Message

```tsx
{!formState.acceptTerms && (
  <View style={{ marginTop: 16, padding: 12, backgroundColor: theme.colors.errorContainer || theme.colors.surfaceVariant, borderRadius: 8 }}>
    <Text style={{ color: theme.colors.error, fontSize: 13, textAlign: 'center' }}>
      ⚠️ Please accept the Terms and Conditions to continue
    </Text>
  </View>
)}
```

## User Experience

### Registration Flow

1. **Personal Info Step** → User fills in name, email, phone
2. **Security Setup Step** → User creates password
3. **Terms Checkbox** → Initially unchecked
4. **Continue Button** → **DISABLED** (grayed out, 50% opacity)
5. **Warning Message** → Displays: "⚠️ Please accept the Terms and Conditions to continue"
6. **User Checks Terms** → Button becomes enabled (blue, full opacity)
7. **Warning Disappears** → User can now continue
8. **Complete Registration** → Submit successful

### Visual States

**Terms Not Accepted**:
- ❌ Continue button: Gray background, 50% opacity, not clickable
- ⚠️ Warning message visible below checkboxes

**Terms Accepted**:
- ✅ Continue button: Primary color (blue), 100% opacity, clickable
- ✓ Warning message hidden
- Ready to submit

## Testing

### Manual Testing Steps

1. **Start parent registration**
   - Navigate through personal info step
   - Reach security setup step

2. **Verify button is disabled**
   - Try clicking Continue → Should not work
   - Button should be grayed out
   - Warning message should be visible

3. **Accept terms**
   - Check "I accept the Terms and Conditions" checkbox
   - Button should turn blue and become clickable
   - Warning message should disappear

4. **Uncheck terms**
   - Uncheck the checkbox
   - Button should immediately become disabled again
   - Warning should reappear

5. **Complete registration**
   - Check terms again
   - Fill in valid password
   - Click Continue → Should submit successfully

### Edge Cases

- ✅ Marketing consent checkbox is optional (doesn't affect button state)
- ✅ Button also disabled during loading (shows spinner)
- ✅ Works for all roles (parent, teacher, principal, student)
- ✅ Warning message adapts to theme colors

## Compliance

This change helps ensure compliance with:
- **GDPR**: Explicit consent before data processing
- **POPIA** (South Africa): Lawful processing requirements
- **COPPA**: Parental consent for children's data
- **Best Practices**: Clear user acceptance of legal agreements

## Files Modified

- `components/auth/EnhancedRegistrationForm.tsx`
  - Updated Continue button disabled logic
  - Added warning message component
  - Updated visual feedback (opacity, background color)

## Related

- Terms and Conditions document: [To be added]
- Privacy Policy: [To be added]
- WARP.md: Multi-tenant security requirements

---

**Status**: ✅ IMPLEMENTED  
**Impact**: All registration flows (parent, teacher, principal, student)  
**Tested**: Manual testing required
