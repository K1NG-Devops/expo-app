# Multi-Tenant Strategy: Organization-Agnostic Architecture

**Date**: 2025-10-30  
**Status**: ✅ Active Architecture  
**Critical**: This supersedes all preschool-centric assumptions

---

## 🎯 Overview

EduDash Pro supports **three user archetypes**:

1. **Affiliated Users** - Connected to organizations (schools, preschools, districts)
2. **Independent Users** - Parents/students without school affiliation (exam prep, self-study)
3. **Guest Users** - Temporary access before signup

**Core Principle**: The platform must work **with or without** organization affiliation.

---

## 🏢 Organization Types

### Supported Organization Types

| Type | Description | Use Case | RLS Field |
|------|-------------|----------|-----------|
| **Preschool** | Early childhood education (Grade R-3) | Legacy support, existing customers | `preschool_id` |
| **School** | Primary/Secondary schools (Grade 1-12) | Main target market | `organization_id` |
| **District** | School districts/regional education offices | Multi-school management | `organization_id` |
| **Tutoring Center** | Private tutoring/learning centers | Small educational businesses | `organization_id` |
| **Independent** | No organization | Parents using app for exam prep | `NULL` |

### Organization Hierarchy

```
District (organization_id: district_123)
  ├── School A (organization_id: school_a, parent_org: district_123)
  ├── School B (organization_id: school_b, parent_org: district_123)
  └── School C (organization_id: school_c, parent_org: district_123)

Independent Parent (organization_id: NULL, user_id: parent_456)
  └── Child 1 (student_id: student_789, organization_id: NULL)
```

---

## 🔒 Tenant Isolation Strategy

### RLS Policy Design

#### 1. Affiliated Users (Has Organization)

```sql
-- Example: Students table RLS policy
CREATE POLICY "users_own_org_students" ON students
FOR SELECT USING (
  organization_id = auth.jwt() ->> 'organization_id'
  OR organization_id IN (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);
```

**Filter Strategy**:
```typescript
// Always filter by organization
.eq('organization_id', userOrganizationId)
```

#### 2. Independent Users (No Organization)

```sql
-- Example: Personal data RLS policy
CREATE POLICY "users_own_data" ON user_progress
FOR SELECT USING (
  user_id = auth.uid()
  AND organization_id IS NULL
);
```

**Filter Strategy**:
```typescript
// Filter by user_id only
.eq('user_id', userId)
.is('organization_id', null)
```

#### 3. Guest Users (Temporary Access)

```sql
-- Example: Public/demo content access
CREATE POLICY "guest_public_content" ON exam_templates
FOR SELECT USING (
  is_public = true
  AND organization_id IS NULL
);
```

**Filter Strategy**:
```typescript
// Access public data only
.eq('is_public', true)
.is('organization_id', null)
```

---

## 🗄️ Database Schema Guidelines

### Core Tables with Multi-Tenant Support

#### `profiles` (User Accounts)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  organization_id UUID REFERENCES organizations(id),  -- NULL for independent users
  role TEXT NOT NULL,  -- 'parent', 'teacher', 'principal', 'independent_user'
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  preschool_id UUID REFERENCES preschools(id)  -- DEPRECATED: Use organization_id
);
```

#### `students` (Student Records)
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),  -- NULL for independent
  parent_id UUID REFERENCES profiles(id),  -- Always required
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  -- Independent students: managed by parent only
  -- Affiliated students: visible to school staff
);
```

#### `user_progress` (Learning Progress)
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  organization_id UUID REFERENCES organizations(id),  -- NULL for independent
  subject TEXT NOT NULL,
  progress_data JSONB,
  -- Progress can be tracked with or without school
);
```

---

## 🔧 Code Patterns

### Pattern 1: Flexible Organization Filtering

```typescript
// ✅ CORRECT: Support both affiliated and independent users
async function fetchStudents(userId: string, organizationId: string | null) {
  let query = supabase
    .from('students')
    .select('*');
  
  if (organizationId) {
    // Affiliated user: filter by organization
    query = query.eq('organization_id', organizationId);
  } else {
    // Independent user: filter by parent only
    query = query
      .eq('parent_id', userId)
      .is('organization_id', null);
  }
  
  return query;
}
```

```typescript
// ❌ WRONG: Assumes organization always exists
async function fetchStudents(userId: string, organizationId: string) {
  return supabase
    .from('students')
    .select('*')
    .eq('organization_id', organizationId);  // Fails for independent users!
}
```

### Pattern 2: Context-Aware Tool Execution

```typescript
// Tool execution context
interface ToolExecutionContext {
  userId: string;
  organizationId: string | null;  // ← Nullable!
  role: string;  // 'parent', 'independent_user', etc.
  tier: string;
  
  // For affiliated users
  hasOrganization: boolean;
  
  // For guest users
  isGuest: boolean;
}

// Query construction
function buildQuery(table: string, context: ToolExecutionContext) {
  let query = supabase.from(table).select('*');
  
  if (context.isGuest) {
    // Guest: public data only
    return query.eq('is_public', true);
  }
  
  if (context.hasOrganization && context.organizationId) {
    // Affiliated: organization data
    query = query.eq('organization_id', context.organizationId);
  } else {
    // Independent: personal data only
    query = query.eq('user_id', context.userId).is('organization_id', null);
  }
  
  return query;
}
```

### Pattern 3: Feature Availability by User Type

```typescript
const FEATURES_BY_USER_TYPE = {
  affiliated: {
    canAccessSchoolData: true,
    canViewClassmates: true,
    canMessageTeachers: true,
    canAccessExamPrep: true,
    canAccessAI: true
  },
  independent: {
    canAccessSchoolData: false,
    canViewClassmates: false,
    canMessageTeachers: false,
    canAccessExamPrep: true,  // ← Key feature!
    canAccessAI: true
  },
  guest: {
    canAccessSchoolData: false,
    canViewClassmates: false,
    canMessageTeachers: false,
    canAccessExamPrep: true,  // Limited
    canAccessAI: false  // Quota-protected
  }
};
```

---

## 🚀 Use Cases

### Use Case 1: Independent Parent (Exam Prep)

**Scenario**: Parent downloads app 1 week before school exams. No school affiliation.

**User Journey**:
1. Sign up as "Independent User"
2. Add child manually (no school selection)
3. Select grade and subjects
4. Access Exam Prep widget
5. Generate CAPS-aligned practice papers
6. Track progress locally

**Data Model**:
```typescript
{
  userId: 'parent_123',
  organizationId: null,  // ← No school
  role: 'independent_user',
  children: [
    {
      id: 'student_456',
      parentId: 'parent_123',
      organizationId: null,  // ← No school
      grade: 'Grade 9',
      subjects: ['Math', 'Science', 'English']
    }
  ]
}
```

**AI Tools Available**:
- ✅ Exam Prep Generator
- ✅ Study Plans
- ✅ Progress Tracking (personal)
- ❌ School assignments (no school)
- ❌ Class data (no school)

### Use Case 2: Affiliated Teacher

**Scenario**: Teacher at a school using EduDash Pro.

**User Journey**:
1. Sign up via school invitation link
2. Automatically associated with `organization_id: school_abc`
3. Access all classes at their school
4. View student data (RLS enforced by organization)

**Data Model**:
```typescript
{
  userId: 'teacher_789',
  organizationId: 'school_abc',
  role: 'teacher',
  canAccessStudents: true,  // Within their organization
  canAccessClasses: true
}
```

### Use Case 3: Guest User (Demo Mode)

**Scenario**: Visitor wants to try the app before signing up.

**User Journey**:
1. Open app (no signup)
2. "Try as Guest" button
3. Access public exam templates
4. Limited AI queries (3 free per day)
5. Prompt to sign up for full access

**Data Model**:
```typescript
{
  userId: null,  // No account yet
  organizationId: null,
  role: 'guest',
  accessLevel: 'public_only',
  quotaLimit: 3  // AI queries per day
}
```

---

## 🛠️ Migration Path (From Preschool-Centric)

### Phase 1: Dual Support (Current)
- Support both `preschool_id` (legacy) and `organization_id` (new)
- Code checks both fields
- New users get `organization_id`, old users keep `preschool_id`

### Phase 2: Data Migration (Future)
- Copy `preschool_id` → `organization_id`
- Set `organization_type = 'preschool'`
- Maintain `preschool_id` for backwards compatibility

### Phase 3: Full Transition (Long-term)
- Deprecate `preschool_id` column
- All code uses `organization_id`
- Update RLS policies

---

## ✅ Checklist: Organization-Agnostic Code

When writing new features, ensure:

- [ ] Supports `organization_id: null` (independent users)
- [ ] Handles guest users (`userId: null`)
- [ ] RLS policies work for all three user types
- [ ] No hardcoded assumptions about organization presence
- [ ] Features gracefully degrade for independent users
- [ ] Exam prep works without school affiliation
- [ ] AI tools accessible to all user types (quota-enforced)

---

## 📊 Decision Matrix

| Feature | Affiliated | Independent | Guest |
|---------|------------|-------------|-------|
| School Dashboard | ✅ Yes | ❌ No | ❌ No |
| View Classes | ✅ Yes | ❌ No | ❌ No |
| Message Teachers | ✅ Yes | ❌ No | ❌ No |
| **Exam Prep** | ✅ Yes | ✅ **Yes** | ⚠️ Limited |
| **AI Assistant** | ✅ Yes | ✅ **Yes** | ⚠️ Limited (3/day) |
| Progress Tracking | ✅ Org + Personal | ✅ Personal Only | ❌ No |
| Calendar | ✅ School Events | ⚠️ Personal Only | ❌ No |
| Attendance | ✅ Yes | ❌ No | ❌ No |

---

## 🔗 Related Documentation

- **WARP.md**: Updated to reflect organization-agnostic architecture
- **RLS Policies**: `docs/security/RLS_POLICIES.md`
- **Database Schema**: `supabase/migrations/`
- **Tool Registry**: `services/dash-ai/DashToolRegistry.ts`

---

**Version**: 1.0  
**Last Updated**: 2025-10-30  
**Critical for**: School exam season support + independent user onboarding
