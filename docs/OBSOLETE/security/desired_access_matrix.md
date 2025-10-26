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

---

## MISSING COMPONENTS - TODO

### SuperAdmin Global Management Access Patterns

**Current Gap**: SuperAdmin exists but lacks comprehensive global access patterns for operational needs.

#### 1. Missing SuperAdmin-Specific Access Matrix

| Resource Type | Current Access | Missing Access | Implementation Priority |
|---------------|----------------|----------------|-----------------------|
| **AI Model Management** | None | Global AI usage analytics, quota overrides | HIGH |
| **Cross-Org User Management** | Limited | View/manage users across all organizations | HIGH |
| **Global Subscription Management** | Basic | Change plans, override billing, refund handling | HIGH |
| **System Health Monitoring** | None | Database performance, error logs, system metrics | MEDIUM |
| **Security Incident Response** | None | Access audit logs, security investigation tools | HIGH |
| **Feature Flag Management** | None | Toggle features per organization, A/B testing | LOW |

#### 2. Missing SuperAdmin Database Views

```sql
-- Global user management view
CREATE VIEW superadmin_users_global AS
SELECT 
  u.id, u.email, u.role,
  p.name as preschool_name,
  p.id as preschool_id,
  u.created_at, u.last_sign_in_at
FROM profiles u
LEFT JOIN preschools p ON p.id = u.preschool_id
ORDER BY u.created_at DESC;

-- Global subscription analytics
CREATE VIEW superadmin_subscription_analytics AS
SELECT 
  sp.tier,
  COUNT(s.id) as active_subscriptions,
  SUM(s.seats_total) as total_seats,
  SUM(s.seats_used) as used_seats,
  AVG(sp.price_monthly) as avg_monthly_revenue
FROM subscriptions s
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.status = 'active'
GROUP BY sp.tier, sp.price_monthly;

-- Global AI usage monitoring
CREATE VIEW superadmin_ai_usage_global AS
SELECT 
  p.name as preschool_name,
  p.id as preschool_id,
  sp.tier as subscription_tier,
  COUNT(ai.id) as ai_requests_count,
  ai.ai_model_used,
  DATE_TRUNC('month', ai.created_at) as usage_month
FROM ai_usage_logs ai
JOIN preschools p ON p.id = ai.preschool_id
JOIN subscriptions s ON s.school_id = p.id
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE ai.created_at >= (NOW() - INTERVAL '6 months')
GROUP BY p.name, p.id, sp.tier, ai.ai_model_used, DATE_TRUNC('month', ai.created_at)
ORDER BY usage_month DESC, ai_requests_count DESC;
```

**Implementation Priority**: HIGH - Critical for platform scaling and support

### Principal → Teacher → Parent Flow Access Patterns

**Current Gap**: Basic hierarchy exists but delegation and communication flows are incomplete.

#### 1. Missing Principal Delegation Access Matrix

| Delegation Type | Principal Can Grant | Teacher Receives | Parent Visibility | Missing Implementation |
|----------------|---------------------|------------------|-------------------|-----------------------|
| **AI Quota Allocation** | Allocate from school quota | Personal AI request quota | Child's AI usage summary | Quota delegation tables |
| **Class Management Rights** | Grant class admin rights | Create/modify assignments | Assignment notifications | Permission delegation system |
| **Parent Communication** | Grant parent contact access | Direct parent messaging | Teacher-parent message history | Communication permission matrix |
| **Student Data Access** | Grant assessment rights | Student progress data | Limited child progress view | Graduated data access controls |

#### 2. Missing Principal Delegation Database Schema

```sql
-- Principal's delegation of capabilities to teachers
CREATE TABLE principal_teacher_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID REFERENCES profiles(id),
  teacher_id UUID REFERENCES profiles(id),
  preschool_id UUID REFERENCES preschools(id),
  
  -- What capabilities are delegated
  delegated_capabilities JSONB, -- ['ai_quota_management', 'parent_communication', etc.]
  
  -- Scope limitations
  class_scope UUID[], -- Which classes this applies to
  student_scope UUID[], -- Which students (if limited)
  
  -- AI quota specific
  ai_quota_allocated INTEGER DEFAULT 0,
  ai_quota_used INTEGER DEFAULT 0,
  ai_models_allowed TEXT[], -- ['claude-3-haiku', 'claude-3-sonnet']
  
  -- Time bounds
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher's graduated permissions for parent communication
CREATE TABLE teacher_parent_communication_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id),
  preschool_id UUID REFERENCES preschools(id),
  
  -- What can be shared
  data_sharing_permissions JSONB, -- {'grades': true, 'assessments': true, 'ai_insights': false}
  
  -- Communication settings
  can_initiate_contact BOOLEAN DEFAULT true,
  can_share_student_work BOOLEAN DEFAULT true,
  can_share_ai_generated_reports BOOLEAN DEFAULT false,
  
  -- Granted by principal
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Parent consent
  parent_consent_given BOOLEAN DEFAULT false,
  parent_consent_at TIMESTAMPTZ
);
```

#### 3. Missing Three-Way Communication Access Patterns

```sql
-- Policy for AI-generated insights sharing
CREATE POLICY "ai_insights_three_way_access" ON ai_student_insights
FOR SELECT
USING (
  -- Super admin can see all
  auth.is_super_admin()
  OR
  -- Principal can see all insights in their school
  (auth.role() = 'principal' AND preschool_id = auth.org_id())
  OR
  -- Teacher can see insights for students in their classes (with delegation)
  (
    auth.role() = 'teacher' 
    AND student_id IN (
      SELECT cs.student_id 
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      JOIN principal_teacher_delegations ptd ON ptd.teacher_id = auth.uid()
      WHERE c.teacher_id = auth.uid()
      AND 'ai_student_insights' = ANY(ptd.delegated_capabilities)
      AND ptd.preschool_id = c.preschool_id
    )
  )
  OR
  -- Parent can see insights for their children (with permission)
  (
    auth.role() = 'parent'
    AND student_id IN (
      SELECT pcl.child_id 
      FROM parent_child_links pcl
      JOIN teacher_parent_communication_rights tpcr ON tpcr.parent_id = pcl.parent_id
      WHERE pcl.parent_id = auth.uid()
      AND tpcr.student_id = pcl.child_id
      AND (tpcr.data_sharing_permissions->>'ai_insights')::boolean = true
      AND tpcr.parent_consent_given = true
    )
  )
);
```

**Implementation Priority**: MEDIUM - Important for user experience, not system-critical

### AI Model Tiering Integration Gaps

**Current State**: Basic AI tiering implemented, missing role-specific integrations.

#### 1. Role-Specific AI Model Access Matrix

| Role | Free Tier | Starter Tier | Premium Tier | Enterprise Tier | Missing Features |
|------|-----------|--------------|--------------|-----------------|------------------|
| **SuperAdmin** | All models (global) | All models (global) | All models (global) | All models (global) | Global usage analytics, override capabilities |
| **Principal** | Haiku only | Haiku + Sonnet | All models | All models | Usage analytics dashboard, teacher quota allocation UI |
| **Teacher** | Haiku only | Haiku + limited Sonnet | All models | All models | Personal usage tracking, quota remaining display |
| **Parent** | Homework help only | Homework help only | Homework help + progress insights | All homework features | Child's usage visibility, parental controls |

#### 2. Missing Role-Based AI Feature Access

```sql
-- AI feature permissions by role and tier
CREATE TABLE ai_feature_role_matrix (
  role TEXT, -- 'superadmin', 'principal', 'teacher', 'parent'
  subscription_tier TEXT, -- 'free', 'starter', 'premium', 'enterprise'
  ai_feature TEXT, -- 'lesson_generation', 'homework_help', 'grading_assistance', 'progress_insights'
  model_access TEXT[], -- ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus']
  monthly_quota INTEGER, -- requests per month
  rate_limit INTEGER, -- requests per minute
  additional_restrictions JSONB,
  PRIMARY KEY (role, subscription_tier, ai_feature)
);

-- Seed data for AI feature access
INSERT INTO ai_feature_role_matrix VALUES
-- SuperAdmin gets everything
('superadmin', 'free', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'], -1, 60, '{}'),
('superadmin', 'starter', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'], -1, 60, '{}'),
('superadmin', 'premium', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'], -1, 60, '{}'),
('superadmin', 'enterprise', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'], -1, 60, '{}'),

-- Principal gets school tier access
('principal', 'free', 'lesson_generation', ARRAY['claude-3-haiku'], 50, 5, '{}'),
('principal', 'starter', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet'], 500, 15, '{}'),
('principal', 'premium', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'], 2500, 30, '{}'),

-- Teacher gets allocated quota from principal
('teacher', 'free', 'lesson_generation', ARRAY['claude-3-haiku'], 0, 5, '{"quota_source": "principal_allocation"}'),
('teacher', 'starter', 'lesson_generation', ARRAY['claude-3-haiku', 'claude-3-sonnet'], 0, 15, '{"quota_source": "principal_allocation"}'),

-- Parent gets limited homework help only
('parent', 'free', 'homework_help', ARRAY['claude-3-haiku'], 20, 3, '{"children_only": true}'),
('parent', 'starter', 'homework_help', ARRAY['claude-3-haiku'], 50, 5, '{"children_only": true}');
```

**Implementation Priority**: LOW - Enhancement to existing AI tiering system

### Missing Compliance and Audit Trails

#### 1. Educational Compliance (FERPA/COPPA)

```sql
-- Student data access audit trail
CREATE TABLE student_data_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id),
  data_type TEXT, -- 'grades', 'assessments', 'ai_insights', 'behavioral_notes'
  access_reason TEXT, -- 'teaching_duties', 'parent_request', 'principal_review'
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  preschool_id UUID REFERENCES preschools(id)
);

-- Parental consent tracking
CREATE TABLE parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id),
  consent_type TEXT, -- 'ai_usage', 'data_sharing', 'communication_preferences'
  consent_details JSONB,
  consent_given BOOLEAN,
  consent_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  preschool_id UUID REFERENCES preschools(id)
);
```

#### 2. AI Usage Audit and Compliance

```sql
-- Enhanced AI usage logging for compliance
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS student_context UUID REFERENCES profiles(id);
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS educational_purpose TEXT;
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS data_retention_until TIMESTAMPTZ;
ALTER TABLE ai_usage_logs ADD COLUMN IF NOT EXISTS parent_consent_verified BOOLEAN DEFAULT false;
```

**Implementation Priority**: HIGH - Critical for educational institution compliance

---

**Updated Analysis Date:** 2025-01-21  
**Additional Missing Components:** 18  
**Implementation Complexity:** HIGH  
**Estimated Development Time:** 8-10 weeks for complete role delegation flows
