# UI Terminology Migration Guide

This guide helps you update UI components to use the organization-aware terminology system introduced in Phase 6.

## Overview

The terminology system allows EduDash Pro to adapt labels based on organization type:
- **Preschool**: Student, Teacher, Parent, Classroom
- **Sports Club**: Athlete, Coach, Parent/Guardian, Team
- **Corporate**: Employee, Trainer, Manager, Department
- **And more...**

## Quick Start

### 1. Import the Hooks

```tsx
import { 
  useOrganizationTerminology, 
  useTermLabel, 
  useRoleLabel,
  useOrgType 
} from '@/lib/hooks/useOrganizationTerminology';
```

### 2. Use in Your Component

#### Simple Label Replacement

**Before:**
```tsx
<Text>Add Student</Text>
```

**After:**
```tsx
const memberLabel = useTermLabel('member');
<Text>Add {memberLabel}</Text>
```

#### Role-Specific Labels

**Before:**
```tsx
<Text>Teacher Dashboard</Text>
```

**After:**
```tsx
const teacherLabel = useRoleLabel('teacher');
<Text>{teacherLabel} Dashboard</Text>
```

#### Full Terminology Object

**Before:**
```tsx
<Text>Manage students in your classroom</Text>
```

**After:**
```tsx
const { terminology } = useOrganizationTerminology();
<Text>Manage {terminology.members} in your {terminology.group}</Text>
```

## Available Hooks

### `useOrganizationTerminology()`

Returns the full terminology object with helper methods.

```tsx
const { terminology } = useOrganizationTerminology();

// Access terminology
terminology.member        // "Student" | "Athlete" | "Employee"
terminology.members       // "Students" | "Athletes" | "Employees"
terminology.instructor    // "Teacher" | "Coach" | "Trainer"
terminology.guardian      // "Parent" | "Parent/Guardian" | "Manager"
terminology.group         // "Classroom" | "Team" | "Department"
terminology.institution   // "Preschool" | "Club" | "Organization"

// Helper methods
terminology.getRoleLabel('teacher')       // Org-aware role name
terminology.getRoleLabelPlural('teacher') // Plural form
terminology.orgType                        // Current org type
```

### `useTermLabel(key)`

Returns a single terminology label.

```tsx
const memberLabel = useTermLabel('member');
const groupLabel = useTermLabel('group');
```

### `useRoleLabel(role)`

Returns role-specific display name.

```tsx
const teacherLabel = useRoleLabel('teacher');
const principalLabel = useRoleLabel('principal');
```

### `useOrgType()`

Returns organization type checks.

```tsx
const { isPreschool, isSportsClub, isCorporate } = useOrgType();

if (isPreschool) {
  // Render preschool-specific UI
}
```

## Terminology Map Reference

| Key | Preschool | Sports Club | Corporate | K-12 |
|-----|-----------|-------------|-----------|------|
| `member` | Student | Athlete | Employee | Student |
| `members` | Students | Athletes | Employees | Students |
| `instructor` | Teacher | Coach | Trainer | Teacher |
| `instructors` | Teachers | Coaches | Trainers | Teachers |
| `guardian` | Parent | Parent/Guardian | Manager | Parent |
| `guardians` | Parents | Parents/Guardians | Managers | Parents |
| `group` | Classroom | Team | Department | Class |
| `groups` | Classrooms | Teams | Departments | Classes |
| `institution` | Preschool | Club | Organization | School |
| `level` | Grade | Level | Level | Grade |

## Migration Examples

### Example 1: Dashboard Header

**Before:**
```tsx
function DashboardHeader() {
  return (
    <View>
      <Text>Welcome to your Classroom</Text>
      <Text>You have 15 Students</Text>
    </View>
  );
}
```

**After:**
```tsx
function DashboardHeader() {
  const { terminology } = useOrganizationTerminology();
  
  return (
    <View>
      <Text>Welcome to your {terminology.group}</Text>
      <Text>You have 15 {terminology.members}</Text>
    </View>
  );
}
```

### Example 2: Role Selection

**Before:**
```tsx
function RoleCard() {
  return (
    <View>
      <Text>Teacher</Text>
      <Text>Manage your classroom and students</Text>
    </View>
  );
}
```

**After:**
```tsx
function RoleCard() {
  const teacherLabel = useRoleLabel('teacher');
  const { terminology } = useOrganizationTerminology();
  
  return (
    <View>
      <Text>{teacherLabel}</Text>
      <Text>Manage your {terminology.group} and {terminology.members}</Text>
    </View>
  );
}
```

### Example 3: Conditional Rendering by Org Type

**Before:**
```tsx
function FeatureSection() {
  return (
    <View>
      <Text>Grade Management</Text>
      <Text>Track student performance</Text>
    </View>
  );
}
```

**After:**
```tsx
function FeatureSection() {
  const { isPreschool, isCorporate } = useOrgType();
  const { terminology } = useOrganizationTerminology();
  
  return (
    <View>
      {isPreschool && <Text>Grade Management</Text>}
      {isCorporate && <Text>Performance Tracking</Text>}
      <Text>Track {terminology.member} performance</Text>
    </View>
  );
}
```

## UI Components

### RoleDisplay Component

For simple role label display:

```tsx
import RoleDisplay from '@/components/ui/RoleDisplay';

<RoleDisplay role="teacher" style={{ fontWeight: 'bold' }} />
```

## Best Practices

1. **Always use hooks at component top-level** - Don't call hooks conditionally
2. **Cache terminology object** - The hook uses `useMemo` for performance
3. **Use specific hooks when possible** - `useTermLabel()` is lighter than full object
4. **Fallback gracefully** - System defaults to "preschool" if org type is unknown
5. **Test across org types** - Verify UI works for all supported organization types

## Migration Checklist

- [ ] Replace hardcoded "Student" → `terminology.member`
- [ ] Replace hardcoded "Teacher" → `useRoleLabel('teacher')`
- [ ] Replace hardcoded "Classroom" → `terminology.group`
- [ ] Replace hardcoded "Parent" → `terminology.guardian`
- [ ] Update role-based conditionals to use `useOrgType()`
- [ ] Test UI with different organization types
- [ ] Update tests to cover terminology variations

## Testing

Update your tests to verify terminology works correctly:

```tsx
import { render } from '@testing-library/react-native';

describe('MyComponent', () => {
  it('adapts labels for sports club', () => {
    // Mock org type
    mockOrgType('sports_club');
    
    const { getByText } = render(<MyComponent />);
    
    // Should show "Athletes" not "Students"
    expect(getByText(/Athletes/)).toBeTruthy();
  });
});
```

## Need Help?

- See full terminology mappings in `lib/tenant/terminology.ts`
- Review role mapping logic in `lib/tenant/types.ts`
- Check examples in updated components like `RoleBasedHeader.tsx`
- Refer to Phase 6 documentation: `docs/summaries/PHASE_6_ORG_GENERALIZATION.md`
