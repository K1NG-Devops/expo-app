# RLS Policy Templates for EduDash Pro
**Date:** 2025-09-19  
**Status:** Ready for Implementation  
**Dependencies:** `001_auth_helpers.sql`, `002_access_helpers.sql`

## Overview

This document defines the standardized RLS policy templates for EduDash Pro. Each template is designed to work with the auth helper functions and provides consistent security patterns across the application.

## Template Categories

### 1. Organization-Scoped Tables
**Use Case:** Tables that contain organization-specific data  
**Examples:** `preschools`, `subscriptions`, `announcements`

```sql
-- Read Policy: Organization Scoped
CREATE POLICY "{table}_org_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.is_super_admin()
  OR app_auth.can_access_org({table}.{org_column})
);

-- Write Policy: Organization Scoped with Capability Guard
CREATE POLICY "{table}_org_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR app_auth.can_access_org({table}.{org_column})
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    app_auth.can_access_org({table}.{org_column})
    AND app_auth.has_cap('{required_capability}')
  )
);
```

### 2. Class-Scoped Tables
**Use Case:** Tables tied to specific classes within an organization  
**Examples:** `class_assignments`, `class_schedules`

```sql
-- Read Policy: Class Scoped
CREATE POLICY "{table}_class_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      app_auth.is_principal()
      OR (
        app_auth.is_teacher() 
        AND app_auth.teacher_can_access_class({table}.{class_column})
      )
      OR (
        app_auth.is_parent()
        AND EXISTS (
          SELECT 1 FROM students s
          JOIN parent_child_links pcl ON pcl.student_id = s.id
          WHERE s.class_id = {table}.{class_column}
          AND pcl.parent_id = app_auth.parent_id()
          AND pcl.is_active = true
        )
      )
    )
  )
);

-- Write Policy: Class Scoped with Role and Capability Guards
CREATE POLICY "{table}_class_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      app_auth.is_principal()
      OR (
        app_auth.is_teacher() 
        AND app_auth.teacher_can_access_class({table}.{class_column})
      )
    )
  )
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      (app_auth.is_principal() AND app_auth.has_cap('{principal_capability}'))
      OR (
        app_auth.is_teacher() 
        AND app_auth.teacher_can_access_class({table}.{class_column})
        AND app_auth.has_cap('{teacher_capability}')
      )
    )
  )
);
```

### 3. Student-Scoped Tables
**Use Case:** Tables containing student-specific data  
**Examples:** `homework_submissions`, `student_progress`, `attendance`

```sql
-- Read Policy: Student Scoped
CREATE POLICY "{table}_student_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      app_auth.is_principal()
      OR (
        app_auth.is_teacher() 
        AND app_auth.teacher_can_access_student({table}.{student_column})
      )
      OR (
        app_auth.is_parent()
        AND app_auth.parent_can_access_student({table}.{student_column})
      )
    )
  )
);

-- Write Policy: Student Scoped with Role-Based Capability Guards
CREATE POLICY "{table}_student_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      app_auth.is_principal()
      OR (
        app_auth.is_teacher() 
        AND app_auth.teacher_can_access_student({table}.{student_column})
      )
      OR (
        app_auth.is_parent()
        AND app_auth.parent_can_access_student({table}.{student_column})
      )
    )
  )
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      (app_auth.is_principal() AND app_auth.has_cap('{principal_write_capability}'))
      OR (
        app_auth.is_teacher() 
        AND app_auth.teacher_can_access_student({table}.{student_column})
        AND app_auth.has_cap('{teacher_write_capability}')
      )
      OR (
        app_auth.is_parent()
        AND app_auth.parent_can_access_student({table}.{student_column})
        AND app_auth.has_cap('{parent_write_capability}')
      )
    )
  )
);
```

### 4. User-Scoped Tables
**Use Case:** User profiles and personal data  
**Examples:** `users`, `user_preferences`, `push_devices`

```sql
-- Read Policy: Users with Selective Exposure
CREATE POLICY "{table}_user_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      -- Principal can see all users in org
      app_auth.is_principal()
      OR 
      -- Users can see their own data
      {table}.{user_column} = app_auth.user_id()
      OR
      -- Teachers can see students/parents in their classes
      (
        app_auth.is_teacher()
        AND (
          -- Student users in teacher's classes
          (
            {table}.role = 'student'
            AND app_auth.teacher_can_access_student({table}.{user_column})
          )
          OR
          -- Parent users of students in teacher's classes
          (
            {table}.role = 'parent'
            AND EXISTS (
              SELECT 1 FROM parent_child_links pcl
              WHERE pcl.parent_id = {table}.{user_column}
              AND pcl.student_id = ANY(app_auth.teacher_accessible_students())
            )
          )
        )
      )
      OR
      -- Parents can see teachers of their children
      (
        app_auth.is_parent()
        AND {table}.role = 'teacher'
        AND EXISTS (
          SELECT 1 FROM students s
          JOIN classes c ON c.id = s.class_id
          JOIN class_teachers ct ON ct.class_id = c.id
          WHERE s.id = ANY(app_auth.parent_accessible_students())
          AND ct.teacher_id = {table}.{user_column}
        )
      )
    )
  )
);

-- Write Policy: User Data with Management Rights
CREATE POLICY "{table}_user_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR app_auth.can_manage_user({table}.{user_column})
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    app_auth.can_manage_user({table}.{user_column})
    AND (
      -- Self-updates allowed
      {table}.{user_column} = app_auth.user_id()
      OR
      -- Administrative updates require capabilities
      (
        app_auth.is_principal() 
        AND app_auth.has_cap('manage_users')
      )
      OR
      (
        app_auth.is_teacher()
        AND app_auth.has_cap('manage_students')
      )
    )
  )
);
```

### 5. Assignment-Scoped Tables
**Use Case:** Homework, assignments, and submissions  
**Examples:** `assignments`, `homework_submissions`, `grades`

```sql
-- Read Policy: Assignment Access
CREATE POLICY "{table}_assignment_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.can_access_assignment({table}.{assignment_column})
);

-- Write Policy: Assignment Management
CREATE POLICY "{table}_assignment_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    app_auth.can_access_assignment({table}.{assignment_column})
    AND (
      app_auth.is_principal()
      OR app_auth.is_teacher()
      OR (
        app_auth.is_parent()
        AND EXISTS (
          SELECT 1 FROM assignments a
          JOIN assignment_submissions asub ON asub.assignment_id = a.id
          WHERE a.id = {table}.{assignment_column}
          AND asub.student_id = ANY(app_auth.parent_accessible_students())
        )
      )
    )
  )
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    app_auth.can_access_assignment({table}.{assignment_column})
    AND (
      (app_auth.is_principal() AND app_auth.has_cap('manage_assignments'))
      OR (app_auth.is_teacher() AND app_auth.has_cap('create_assignments'))
      OR (app_auth.is_parent() AND app_auth.has_cap('submit_homework'))
    )
  )
);
```

### 6. Communication-Scoped Tables
**Use Case:** Messages, conversations, notifications  
**Examples:** `conversations`, `messages`, `notifications`

```sql
-- Read Policy: Communication Participants
CREATE POLICY "{table}_communication_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.is_super_admin()
  OR app_auth.can_access_conversation({table}.{conversation_column})
  OR (
    -- Principal oversight for org communications
    app_auth.is_principal()
    AND {table}.{org_column} = app_auth.org_id()
  )
);

-- Write Policy: Communication Participants
CREATE POLICY "{table}_communication_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR app_auth.can_access_conversation({table}.{conversation_column})
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    app_auth.can_access_conversation({table}.{conversation_column})
    AND (
      (app_auth.is_teacher() AND app_auth.has_cap('communicate_with_parents'))
      OR (app_auth.is_parent() AND app_auth.has_cap('communicate_with_teachers'))
      OR app_auth.is_principal()
    )
  )
);
```

### 7. Global Configuration Tables
**Use Case:** System-wide settings and reference data  
**Examples:** `billing_plans`, `system_settings`, `ai_services`

```sql
-- Read Policy: Global Config (All Authenticated)
CREATE POLICY "{table}_global_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  -- Most config data is readable by all authenticated users
  true
);

-- Write Policy: Admin Only
CREATE POLICY "{table}_global_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
)
WITH CHECK (
  app_auth.is_super_admin()
  AND app_auth.has_cap('{admin_capability}')
);
```

### 8. Junction Tables
**Use Case:** Many-to-many relationship tables  
**Examples:** `class_teachers`, `parent_child_links`

```sql
-- Read Policy: Junction Table Access
CREATE POLICY "{table}_junction_read" ON public.{table}
FOR SELECT
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      app_auth.is_principal()
      OR (
        app_auth.is_teacher()
        AND (
          {table}.{teacher_column} = app_auth.teacher_id()
          OR app_auth.teacher_can_access_class({table}.{class_column})
        )
      )
      OR (
        app_auth.is_parent()
        AND (
          {table}.{parent_column} = app_auth.parent_id()
          OR app_auth.parent_can_access_student({table}.{student_column})
        )
      )
    )
  )
);

-- Write Policy: Junction Management
CREATE POLICY "{table}_junction_write" ON public.{table}
FOR ALL
TO authenticated
USING (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      app_auth.is_principal()
      OR (
        app_auth.is_teacher() 
        AND {table}.{teacher_column} = app_auth.teacher_id()
      )
      OR (
        app_auth.is_parent()
        AND {table}.{parent_column} = app_auth.parent_id()
      )
    )
  )
)
WITH CHECK (
  app_auth.is_super_admin()
  OR (
    {table}.{org_column} = app_auth.org_id()
    AND (
      (app_auth.is_principal() AND app_auth.has_cap('{management_capability}'))
      OR (
        app_auth.is_teacher() 
        AND {table}.{teacher_column} = app_auth.teacher_id()
        AND app_auth.has_cap('{teacher_junction_capability}')
      )
      OR (
        app_auth.is_parent()
        AND {table}.{parent_column} = app_auth.parent_id()
        AND app_auth.has_cap('{parent_junction_capability}')
      )
    )
  )
);
```

## Template Variables Reference

### Common Placeholders
- `{table}` - Target table name
- `{org_column}` - Organization identifier column (organization_id, preschool_id)
- `{user_column}` - User identifier column (user_id, id)
- `{class_column}` - Class identifier column (class_id)
- `{student_column}` - Student identifier column (student_id)
- `{assignment_column}` - Assignment identifier column (assignment_id)
- `{conversation_column}` - Conversation identifier column (conversation_id)
- `{teacher_column}` - Teacher identifier column (teacher_id)
- `{parent_column}` - Parent identifier column (parent_id)

### Capability Placeholders
- `{required_capability}` - Base capability for the operation
- `{principal_capability}` - Principal-specific capability
- `{teacher_capability}` - Teacher-specific capability
- `{parent_capability}` - Parent-specific capability
- `{admin_capability}` - Admin-only capability
- `{management_capability}` - Management capability for junction tables

## Implementation Guidelines

### 1. Template Selection
Choose the appropriate template based on:
- **Primary access pattern** (org, class, student, user, etc.)
- **Read vs. write requirements**
- **Role-specific access needs**
- **Capability requirements**

### 2. Customization Rules
- Always include `app_auth.is_super_admin()` bypass
- Use organization scoping as the primary boundary
- Add capability checks for write operations
- Consider performance implications of complex EXISTS queries

### 3. Naming Conventions
- Policy names: `{table}_{scope}_{operation}`
- Examples: `users_org_read`, `assignments_student_write`
- Keep names under 63 characters for PostgreSQL compatibility

### 4. Testing Strategy
Each template should be tested with:
- Super admin access (should always work)
- Principal access (org-scoped)
- Teacher access (relationship-based)
- Parent access (child-specific)
- Cross-organizational access attempts (should fail)

## Performance Considerations

### Indexing Requirements
Ensure these columns are indexed for performance:
- All organization identifier columns
- All relationship identifier columns (class_id, student_id, etc.)
- Junction table foreign keys
- User identifier columns

### Query Optimization
- Use helper functions to encapsulate complex logic
- Prefer simple predicates over complex EXISTS clauses
- Cache results of expensive relationship queries
- Monitor query performance with EXPLAIN ANALYZE

---

These templates provide the foundation for secure, performant RLS policies that align with EduDash Pro's RBAC system while maintaining the flexibility needed for complex educational data relationships.