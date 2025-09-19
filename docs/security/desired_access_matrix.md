# EduDash Pro Access Matrix
**Date:** 2025-09-19  
**Status:** Approved for Implementation

## Overview

This document defines the target access patterns for EduDash Pro's database tables based on role, organizational boundaries, and relationship-based permissions. It aligns with the RBAC system defined in `/lib/rbac.ts` while ensuring proper Row Level Security (RLS) implementation.

## Fundamental Principles

1. **Row Level Security Always Enabled**
   - RLS must be enabled for all tables
   - No tables should have RLS disabled, even for superadmin access

2. **Role-Based Access Pattern**
   - Super Admin: Cross-organizational, unrestricted access
   - Principal: Organization-wide access within their school
   - Teacher: Class-based scoping within their organization  
   - Parent: Child-specific scoping within their organization

3. **Organization as Primary Boundary**
   - All data must be scoped to organization
   - Cross-organizational access only allowed for Super Admin

4. **Capability-Based Writes**
   - Read access determined by role and scope
   - Write access requires both scope AND specific capabilities

## Access Patterns By Resource Type

### Users & Profiles

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All users/profiles | All users/profiles | None (implicit in role) |
| Principal | Users in their organization | Users in their organization | `manage_users` |
| Teacher | Self + students/parents in their classes | Self only | N/A |
| Parent | Self only | Self only | N/A |

### Organizations (Preschools)

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All organizations | All organizations | None (implicit in role) |
| Principal | Own organization | Own organization | `manage_organization` |
| Teacher | Own organization (read-only) | None | N/A |
| Parent | Own organization (read-only) | None | N/A |

### Classes

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All classes | All classes | None (implicit in role) |
| Principal | Classes in their organization | Classes in their organization | `manage_classes` |
| Teacher | Classes they teach | None (unless assigned capability) | `manage_classes` |
| Parent | Classes their children attend | None | N/A |

### Students

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All students | All students | None (implicit in role) |
| Principal | Students in their organization | Students in their organization | `manage_students` |
| Teacher | Students in their classes | Student records for their classes | `manage_students` |
| Parent | Their own children | Limited child information | N/A |

### Assignments & Homework

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All assignments | All assignments | None (implicit in role) |
| Principal | Assignments in their organization | Assignments in their organization | `create_assignments` |
| Teacher | Assignments for their classes | Assignments for their classes | `create_assignments` |
| Parent | Assignments for their children | None | N/A |

### Submissions & Grades

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All submissions | All submissions | None (implicit in role) |
| Principal | Submissions in their organization | None (unless explicit capability) | `grade_assignments` |
| Teacher | Submissions for their classes | Grades for their classes | `grade_assignments` |
| Parent | Submissions from their children | None | N/A |

### AI Usage & Quotas

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All AI usage | All allocations | `ai_quota_management` |
| Principal | AI usage in their organization | Allocations in their organization | `ai_quota_management` |
| Teacher | Their own AI usage | None | N/A |
| Parent | Their own AI usage | None | N/A |

### Subscriptions & Billing

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All subscriptions | All subscriptions | `manage_subscriptions` |
| Principal | Subscriptions for their organization | Limited subscription management | `manage_billing` |
| Teacher | None | None | N/A |
| Parent | None | None | N/A |

### Announcements & Communications

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All announcements | All announcements | None (implicit in role) |
| Principal | Announcements in their organization | Announcements in their organization | None (implicit in role) |
| Teacher | Announcements in their organization | Announcements to their classes | None (implicit in role) |
| Parent | Announcements for their organization | None | N/A |

### Messages & Conversations

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All messages | None (privacy boundary) | N/A |
| Principal | Messages in their organization | None (privacy boundary) | N/A |
| Teacher | Messages they sent/received | Messages to parents/students in their classes | `communicate_with_parents` |
| Parent | Messages they sent/received | Messages to teachers of their children | `communicate_with_teachers` |

### System Configuration & Metrics

| Role | Read Access | Write Access | Capabilities Required |
|------|-------------|--------------|------------------------|
| Super Admin | All system configuration | All system configuration | `manage_feature_flags` |
| Principal | Organization-specific settings | Organization-specific settings | None (implicit in role) |
| Teacher | None | None | N/A |
| Parent | None | None | N/A |

## Relationship-Based Access Examples

### Teacher → Student Access
```sql
-- Teacher can access students in their classes
EXISTS (
  SELECT 1 FROM class_teachers ct
  JOIN classes c ON c.id = ct.class_id
  JOIN class_students cs ON cs.class_id = c.id
  WHERE ct.teacher_id = auth.uid()
  AND cs.student_id = students.id
  AND c.organization_id = students.organization_id
)
```

### Parent → Student Access
```sql
-- Parent can access their children
EXISTS (
  SELECT 1 FROM parent_child_links pcl
  WHERE pcl.parent_id = auth.uid()
  AND pcl.child_id = students.id
)
```

### Teacher → Assignment Access
```sql
-- Teacher can access assignments for their classes
EXISTS (
  SELECT 1 FROM class_teachers ct
  WHERE ct.teacher_id = auth.uid()
  AND ct.class_id = assignments.class_id
  AND EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = ct.class_id
    AND c.organization_id = assignments.organization_id
  )
)
```

## Super Admin Access Strategy

Super admins must retain cross-organizational access through properly constructed RLS policies, not by disabling RLS. Each policy should include a super admin condition:

```sql
-- Example policy pattern
CREATE POLICY table_name_super_admin_access ON table_name
FOR ALL
USING (
  -- Super admin can access any row
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'super_admin'
  )
  OR
  -- Other role-specific conditions...
  (other_role_conditions)
);
```

## Organization Isolation Requirements

For tables storing organization-specific data, policies must include organization boundary checks:

```sql
-- Basic organization isolation
(table.organization_id = auth.org_id())
OR
(table.preschool_id = auth.org_id())
```

## Database Row Level Security Requirements

1. **All tables must have RLS enabled**
2. **Each table needs at least:**
   - Super admin access policy
   - Organization isolation policy (if organization-scoped)
   - Role-specific policies (as needed)
   - Capability checks for write operations

3. **Required helper functions:**
   - `auth.org_id()`: Get current user's organization ID
   - `auth.role()`: Get current user's role
   - `auth.is_super_admin()`: Check if current user is a super admin
   - `auth.has_capability(text)`: Check if user has specific capability

## Performance Considerations

1. **Indexing Requirements:**
   - All tenant isolation columns (`organization_id`, `preschool_id`) must be indexed
   - Relationship columns (`teacher_id`, `student_id`, `parent_id`, etc.) must be indexed
   - Policy predicates that use EXISTS must have indexes on join columns

2. **Optimization Approach:**
   - Prefer simple tenant isolation when possible
   - Use helper functions for complex relationship checks
   - Implement view materialization for complex reports

## Implementation Priorities

1. **First Phase:**
   - Implement organization isolation across all tables
   - Ensure super admin access pattern works without disabling RLS
   - Implement principal organization-wide access

2. **Second Phase:**
   - Implement teacher relationship-based access
   - Implement parent-child relationship access
   - Add capability checks for write operations

3. **Third Phase:**
   - Optimize performance with proper indexing
   - Add specialized views for complex reports
   - Implement real-time notification security

## Sign-off

- **Prepared by:** Security Team
- **Approved by:** Engineering Lead
- **Date:** 2025-09-19
- **Effective:** Immediate implementation