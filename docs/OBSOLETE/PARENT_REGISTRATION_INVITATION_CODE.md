# Parent Registration with Invitation Code

## Overview

This document describes the implementation of parent registration with invitation code support, allowing schools to invite parents using unique codes that link them to the school automatically.

## Changes Made

### 1. Created Parent Registration Screen
**File**: `app/screens/parent-registration.tsx`

- New screen that handles parent account creation
- Supports invitation codes passed via URL parameters or entered manually in the form
- Validates invitation codes against the database before registration
- Automatically links parent to school when invitation code is provided
- Redirects to appropriate screen after successful registration:
  - With code: `/screens/parent-children` (to register children)
  - Without code: `/screens/parent-dashboard`

**Key Features**:
- URL parameter support: `/screens/parent-registration?invitationCode=ABC12345`
- Code validation checks:
  - Code exists and is active
  - Code hasn't expired
  - Code hasn't reached maximum uses
  - Code is of type 'parent'
- Automatic school linking via `use_invitation_code` RPC

### 2. Created Teacher Registration Screen
**File**: `app/screens/teacher-registration.tsx`

- New screen for teacher account creation
- Uses the same `EnhancedRegistrationForm` component
- Supports invitation tokens for school-specific teacher registration

### 3. Updated EnhancedRegistrationForm Component
**File**: `components/auth/EnhancedRegistrationForm.tsx`

**Changes**:
- Added `invitationCode` field to `FormState` interface
- Added invitation code input field for parent registration (optional)
- Field appears for parents who don't have an invitation token passed via props
- Updated parent registration logic to use invitation code from form or props
- Added label and helper text styles for better UX

**UI Enhancement**:
```typescript
{role === 'parent' && !invitationToken && (
  <View style={{ marginTop: 8 }}>
    <Text>School Invitation Code (Optional)</Text>
    <Text>
      If your school provided an invitation code, enter it here to link your account
    </Text>
    {renderTextField('invitationCode', 'Invitation Code', 'ABC12345', false, 'default')}
  </View>
)}
```

### 4. Updated Sign-In Page
**File**: `app/(auth)/sign-in.tsx`

- Already had "Sign up as Parent" and "Sign up as Teacher" buttons
- These buttons now link to the newly created registration screens
- No changes needed - existing implementation works correctly

## Database Integration

### Invitation Code System

The system uses the existing `school_invitation_codes` table and RPC functions:

**Table**: `school_invitation_codes`
- `code`: Unique invitation code (8 characters, readable format)
- `invitation_type`: 'parent' | 'teacher' | 'student'
- `preschool_id` / `school_id`: School reference
- `is_active`: Boolean flag
- `expires_at`: Optional expiration timestamp
- `max_uses` / `current_uses`: Usage limits

**RPC Functions**:
1. `validate_invitation_code(p_code, p_email)` - Validates code before use
2. `use_invitation_code(p_auth_user_id, p_code, p_name, p_phone)` - Redeems code and links user

## User Flow

### Parent Registration Flow

1. **Without Invitation Code**:
   - Parent clicks "Sign up as Parent" on sign-in page
   - Fills out registration form
   - Optionally enters invitation code in the form
   - Creates account
   - If code was provided, automatically linked to school
   - Redirects to appropriate dashboard

2. **With Invitation Code (URL)**:
   - School shares link: `app://parent-registration?invitationCode=ABC12345`
   - Code is validated on screen load
   - Parent fills out registration form (code field hidden)
   - Creates account
   - Automatically linked to school
   - Redirects to child registration

3. **With Invitation Code (Manual Entry)**:
   - Parent clicks "Sign up as Parent"
   - Fills out registration form
   - Enters invitation code in the optional field
   - Code is validated during registration
   - Creates account and links to school
   - Redirects to child registration

## How Schools Generate Invitation Codes

Schools can generate invitation codes through:

1. **Principal Dashboard**: 
   - Invitation management section
   - Generate codes with custom settings (expiry, max uses, description)

2. **Programmatic Creation**:
   ```typescript
   import { InviteCodeService } from '@/lib/services/inviteCodeService';
   
   const code = await InviteCodeService.createParentCode({
     preschoolId: 'school-uuid',
     invitedBy: principalUserId,
     description: 'General parent invitation',
     maxUses: 50, // null for unlimited
     expiresAt: '2025-12-31T23:59:59Z', // null for no expiry
     codeLength: 8
   });
   
   // Share code: code.code (e.g., "ABC12345")
   ```

## Testing

### Manual Testing Checklist

- [ ] Parent registration without code
- [ ] Parent registration with code in URL
- [ ] Parent registration with code in form
- [ ] Code validation (invalid code)
- [ ] Code validation (expired code)
- [ ] Code validation (max uses reached)
- [ ] Code validation (inactive code)
- [ ] Successful registration and school linking
- [ ] Navigation after registration (with/without code)
- [ ] Teacher registration flow
- [ ] Sign-in page UI and links

### Test Invitation Code

To create a test invitation code:

```sql
-- Run in Supabase SQL editor
INSERT INTO school_invitation_codes (
  code,
  invitation_type,
  preschool_id,
  is_active,
  description,
  max_uses,
  expires_at
) VALUES (
  'TEST1234',
  'parent',
  'your-school-id',
  true,
  'Test invitation code',
  100,
  '2026-12-31 23:59:59'
);
```

## Error Handling

The system handles various error scenarios:

1. **Invalid Code**: Alert shown, code cleared
2. **Expired Code**: Alert shown, code cleared
3. **Max Uses Reached**: Alert shown, code cleared
4. **Inactive Code**: Alert shown, code cleared
5. **Registration Failure**: Error message displayed, user can retry
6. **Code Redemption Failure**: Account still created, alert shown that manual linking needed

## Security Considerations

- Codes are stored in uppercase for consistency
- Validation performed server-side via RPC
- Row Level Security (RLS) policies enforce access control
- Invitation codes can be deactivated by school admins
- Usage tracking prevents code sharing abuse

## Future Enhancements

1. **QR Code Support**: Generate QR codes for invitation links
2. **Bulk Code Generation**: Generate multiple codes at once
3. **Email Invitations**: Send invitation codes via email
4. **SMS Invitations**: Send invitation codes via SMS
5. **Code Analytics**: Track which codes are most effective
6. **Role-based Codes**: Different codes for different parent roles
7. **Custom Welcome Messages**: School-specific welcome messages for invited parents

## Related Files

- `app/screens/parent-registration.tsx` - Parent registration screen
- `app/screens/teacher-registration.tsx` - Teacher registration screen
- `app/screens/parent-join-by-code.tsx` - Alternative join-by-code flow for existing users
- `components/auth/EnhancedRegistrationForm.tsx` - Shared registration form component
- `lib/services/inviteCodeService.ts` - Invitation code service
- `app/(auth)/sign-in.tsx` - Sign-in page with registration links
- `types/auth-enhanced.ts` - TypeScript type definitions
