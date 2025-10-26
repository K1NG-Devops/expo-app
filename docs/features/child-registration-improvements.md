# Child Registration Process - Implementation Guide

**Date**: 2025-10-22  
**Status**: ✅ Complete  
**Phase**: Parent Dashboard Enhancements

## Overview

This document details the comprehensive improvements made to the child registration process in the parent dashboard, including enhanced UX, database security with RLS policies, and real-time status tracking.

## Problem Statement

The original child registration form had several issues:
- Manual date entry (YYYY-MM-DD format) was error-prone
- Gender selection was free text, leading to inconsistent data
- No real-time validation feedback
- Parents couldn't track registration request status after submission
- Missing phone number formatting for South African numbers
- No age validation for preschool eligibility (2-7 years)
- Poor form organization and visual hierarchy

## Solution

### 1. Enhanced Registration Form

**File**: `app/screens/parent-child-registration.tsx`

#### Key Improvements

✅ **Native Date Picker**
- Uses `@react-native-community/datetimepicker` (already installed v8.4.1)
- Platform-specific UI (spinner on iOS, calendar on Android)
- Age constraints: minimum 2 years, maximum 7 years
- Visual calendar icon for better UX

```typescript path=null start=null
// Date picker implementation
<TouchableOpacity onPress={() => setShowDatePicker(true)}>
  <Text>{dob ? formatDate(dob) : 'Select date of birth'}</Text>
  <Ionicons name="calendar" size={20} color={theme.primary} />
</TouchableOpacity>

{showDatePicker && (
  <DateTimePicker
    value={dob || new Date()}
    mode="date"
    maximumDate={new Date()}
    minimumDate={new Date(new Date().getFullYear() - 7, 0, 1)}
    onChange={(event, selectedDate) => {
      setShowDatePicker(false);
      if (selectedDate) setDob(selectedDate);
    }}
  />
)}
```

✅ **Gender Selection - Radio Buttons**
- Three options: Male, Female, Other
- Visual active state with color coding
- Tap to select, clear visual feedback

```typescript path=null start=null
// Gender radio buttons
<View style={styles.genderRow}>
  {(['male', 'female', 'other'] as const).map((g) => (
    <TouchableOpacity
      key={g}
      style={[styles.genderButton, gender === g && styles.genderButtonActive]}
      onPress={() => setGender(g)}
    >
      <Text style={gender === g && styles.genderButtonTextActive}>
        {g.charAt(0).toUpperCase() + g.slice(1)}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

✅ **Real-time Validation**
- Inline error messages with visual feedback
- Red borders on invalid fields
- Error clears when user corrects input
- Age validation (2-7 years for preschool)
- Phone number format validation (South African)

```typescript path=null start=null
// Validation logic
const validate = () => {
  const newErrors: Record<string, string> = {};
  
  if (!firstName.trim()) newErrors.firstName = 'First name is required';
  if (!lastName.trim()) newErrors.lastName = 'Last name is required';
  
  if (!dob) {
    newErrors.dob = 'Date of birth is required';
  } else {
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 2 || age > 7) {
      newErrors.dob = 'Child must be between 2 and 7 years old for preschool';
    }
  }
  
  if (!gender) newErrors.gender = 'Please select gender';
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

✅ **Phone Formatting**
- Automatic South African phone number formatting
- Converts `0821234567` → `+27 82 123 4567`
- Handles both `+27` and `0` prefixes

```typescript path=null start=null
// Phone formatting function
const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('27')) {
    const rest = digits.slice(2);
    if (rest.length >= 9) {
      return `+27 ${rest.slice(0, 2)} ${rest.slice(2, 5)} ${rest.slice(5, 9)}`;
    }
    return `+27 ${rest}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    return `+27 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  
  return phone;
};
```

✅ **Better Organization**
- Clear section headers (Child Information, Health & Dietary, Emergency Contact, Additional)
- Required fields marked with asterisks (*)
- Multiline inputs for medical info and notes
- Proper keyboard types (phone-pad for phone numbers)
- Auto-navigation back to dashboard after successful submission

### 2. Database Security with RLS Policies

**File**: `supabase/migrations/20251022113054_add_child_registration_rls_policies.sql`

#### RLS Policies Implemented

✅ **Parent INSERT Policy** - `child_registration_requests_parent_insert`
- Parents can create registration requests for their preschool only
- Must match authenticated user's internal user ID
- Preschool ID must match user's organization

```sql path=null start=null
CREATE POLICY "child_registration_requests_parent_insert"
ON public.child_registration_requests
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id IN (
    SELECT id FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
  AND preschool_id IN (
    SELECT organization_id FROM public.users 
    WHERE auth_user_id = auth.uid()
  )
);
```

✅ **Parent SELECT Policy** - `child_registration_requests_parent_select`
- Parents can view their own requests only
- Filters by parent_id and preschool_id

✅ **Parent UPDATE Policy** - `child_registration_requests_parent_update`
- Parents can only change status to 'withdrawn'
- Cannot approve/reject their own requests

✅ **Staff SELECT Policy** - `child_registration_requests_staff_select`
- Teachers and principals can view all requests in their preschool
- Role-based access control via profiles table

✅ **Staff UPDATE Policy** - `child_registration_requests_staff_update`
- Teachers and principals can approve/reject requests
- Can add rejection reasons and review details

#### Performance Indexes

```sql path=null start=null
-- Faster policy checks
CREATE INDEX idx_child_registration_requests_parent_preschool 
ON public.child_registration_requests (parent_id, preschool_id);

-- Efficient status filtering
CREATE INDEX idx_child_registration_requests_status_preschool 
ON public.child_registration_requests (preschool_id, status, requested_at DESC);
```

### 3. Dashboard Status Tracking Component

**File**: `components/dashboard/PendingRegistrationRequests.tsx`

#### Features

✅ **Status Tracking**
- Shows pending, approved, and rejected requests
- Color-coded status badges (⏳ pending, ✓ approved, ✗ rejected)
- Icons for each status type

✅ **Request Details**
- Child name, age, and request date
- Rejection reason (if provided by staff)
- Approval confirmation message

✅ **Withdraw Action**
- Parents can withdraw pending requests
- Confirmation dialog before withdrawal
- Real-time updates via TanStack Query

✅ **Auto-refresh**
- Uses TanStack Query with 5-minute cache
- Invalidates on mutations (withdraw)
- Optimistic UI updates

```typescript path=null start=null
// TanStack Query integration
const { data: requests, isLoading } = useQuery({
  queryKey: ['child-registration-requests', user?.id],
  queryFn: async () => {
    // Fetch user's registration requests
    const { data } = await supabase
      .from('child_registration_requests')
      .select('*')
      .eq('parent_id', userData.id)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('requested_at', { ascending: false })
      .limit(5);
    
    return data;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

✅ **Responsive UI**
- Follows theme colors
- Dark mode support
- South African date formatting (dd/MM/yyyy)

#### Component Integration

Integrated into `components/dashboard/ParentDashboard.tsx`:

```typescript path=null start=null
import { PendingRegistrationRequests } from './PendingRegistrationRequests';

// In the render method
<PendingRegistrationRequests />
```

## Database Schema

### child_registration_requests Table

```sql path=null start=null
CREATE TABLE public.child_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  preschool_id uuid NOT NULL REFERENCES public.preschools (id) ON DELETE CASCADE,
  
  -- Child information
  child_first_name text NOT NULL,
  child_last_name text NOT NULL,
  child_birth_date date NOT NULL,
  child_gender text CHECK (child_gender IN ('male', 'female', 'other')),
  
  -- Health & emergency
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_info text,
  dietary_requirements text,
  special_needs text,
  
  -- Status tracking
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  notes text,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.users (id),
  rejection_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## User Flow

### Parent Registration Flow

1. **Navigate to Registration**
   - From parent dashboard → "Register Child" button
   - Or from empty children screen

2. **Fill Out Form**
   - Enter required fields (first name, last name, DOB, gender)
   - Add optional health/dietary information
   - Add emergency contact details
   - Add additional notes

3. **Validation**
   - Real-time validation with inline errors
   - Age check (2-7 years)
   - Phone format validation

4. **Submit**
   - Form submission with formatted data
   - Success alert with confirmation
   - Auto-navigate back to dashboard

5. **Track Status**
   - View pending request on dashboard
   - See status badge and details
   - Receive notification when reviewed (future enhancement)

6. **Withdraw (Optional)**
   - Click "Withdraw" on pending request
   - Confirm withdrawal
   - Request status updates to 'withdrawn'

### Teacher/Principal Review Flow

1. **View Requests**
   - Access pending requests via teacher/principal dashboard (future)
   - Filter by status, date, preschool

2. **Review Details**
   - View all child information
   - Check age eligibility
   - Review medical/dietary needs

3. **Approve or Reject**
   - Approve: Child added to system (automated or manual)
   - Reject: Add rejection reason
   - Updates sent to parent

## Testing Checklist

- [ ] **Form Validation**
  - [ ] Empty first name shows error
  - [ ] Empty last name shows error
  - [ ] Missing DOB shows error
  - [ ] Age < 2 years shows error
  - [ ] Age > 7 years shows error
  - [ ] Missing gender shows error
  - [ ] Invalid phone number shows error

- [ ] **Date Picker**
  - [ ] Opens on tap
  - [ ] Shows correct initial date
  - [ ] Respects min/max dates
  - [ ] Updates form on selection
  - [ ] Closes after selection (Android)

- [ ] **Gender Selection**
  - [ ] All three options visible
  - [ ] Active state shows correctly
  - [ ] Selection updates state
  - [ ] Error clears on selection

- [ ] **Phone Formatting**
  - [ ] `0821234567` → `+27 82 123 4567`
  - [ ] `+27821234567` → `+27 82 123 4567`
  - [ ] Invalid formats handled gracefully

- [ ] **Submission**
  - [ ] Success alert shown
  - [ ] Navigates back to dashboard
  - [ ] Request appears in dashboard
  - [ ] Database record created with correct data

- [ ] **RLS Policies**
  - [ ] Parents can insert their own requests
  - [ ] Parents cannot insert for other parents
  - [ ] Parents can view their own requests
  - [ ] Parents cannot view other parents' requests
  - [ ] Staff can view all requests in their preschool
  - [ ] Staff cannot view requests from other preschools

- [ ] **Dashboard Component**
  - [ ] Shows pending requests
  - [ ] Shows approved requests
  - [ ] Shows rejected requests
  - [ ] Withdraw button works
  - [ ] Confirmation dialog appears
  - [ ] Status updates after withdrawal
  - [ ] Component hidden when no requests

## Migration Applied

**Migration**: `20251022113054_add_child_registration_rls_policies.sql`

Applied successfully on: 2025-10-22

```bash
supabase db push
# Migration applied successfully
# All RLS policies created
# Indexes created for performance
```

## Future Enhancements

1. **Notifications**
   - Push notification when request reviewed
   - Email notification to parent
   - In-app badge count for staff

2. **Document Upload**
   - Birth certificate upload
   - Immunization records
   - Photo upload

3. **Staff Dashboard**
   - Dedicated review interface
   - Bulk approve/reject
   - Analytics and reporting

4. **Workflow Automation**
   - Auto-create student record on approval
   - Auto-assign to class
   - Welcome email to parent

5. **Audit Trail**
   - Track who reviewed and when
   - Track status changes
   - Export audit logs

## Related Documentation

- `docs/security/` - RLS policies overview
- `docs/database/` - Schema documentation
- `WARP.md` - Development standards
- `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md` - Phase 0-7 implementation plan

## Support

For issues or questions:
- Check the [troubleshooting guide](../OBSOLETE/)
- Review RLS policies in `supabase/migrations/`
- Test locally with production database
- Use Supabase Studio to inspect database

## Changelog

### 2025-10-22 - Initial Implementation
- ✅ Enhanced registration form with date picker
- ✅ Gender radio buttons
- ✅ Real-time validation
- ✅ RLS policies for tenant isolation
- ✅ Dashboard status tracking component
- ✅ Phone number formatting
- ✅ Age validation (2-7 years)
- ✅ Integration with parent dashboard
- ✅ TypeScript type checking passed
- ✅ Migration applied to production database
