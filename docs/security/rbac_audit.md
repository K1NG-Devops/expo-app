# RBAC Audit Report - EduDash Pro
**Date:** 2025-09-19  
**Auditor:** Security Assessment  
**Source:** `/lib/rbac.ts` analysis

## Executive Summary

EduDash Pro implements a sophisticated Role-Based Access Control (RBAC) system with hierarchical roles and capability-based permissions. The system supports multi-tenant architecture with organization-level isolation and subscription tier-based feature access.

## Role Hierarchy

```
super_admin (Level 4) ── Full system access across all organizations
    │
    ├── principal (Level 3) ── School-wide access within organization  
    │   └── principal_admin (Level 3) ── Same as principal with admin privileges
    │
    ├── teacher (Level 2) ── Class and student access within organization
    │
    └── parent (Level 1) ── Child-specific access within organization
```

## Role Definitions

### 1. Super Admin (Level 4)
- **Access Scope:** Cross-organizational, unlimited
- **Primary Use:** Platform administration, monitoring, billing management
- **Key Capabilities:** 
  - `view_all_organizations`
  - `manage_billing`, `manage_subscriptions`
  - `access_admin_tools`, `manage_feature_flags`
  - `view_system_logs`
  - All AI capabilities with `ai_quota_management`

### 2. Principal (Level 3) 
- **Access Scope:** Organization-wide within their school
- **Primary Use:** School management, teacher oversight, student administration
- **Key Capabilities:**
  - `manage_teachers`, `manage_students`, `manage_classes`
  - `access_principal_hub`
  - `generate_school_reports`
  - `ai_quota_management` for their school
  - All teacher capabilities

### 3. Principal Admin (Level 3)
- **Access Scope:** Same as principal
- **Primary Use:** Technical principal with administrative privileges
- **Key Capabilities:** Identical to principal role

### 4. Teacher (Level 2)
- **Access Scope:** Class and student level within organization
- **Primary Use:** Teaching, grading, student management, parent communication
- **Key Capabilities:**
  - `create_assignments`, `grade_assignments`
  - `view_class_analytics`
  - `communicate_with_parents`
  - AI teaching tools: `ai_lesson_generation`, `ai_grading_assistance`

### 5. Parent (Level 1)
- **Access Scope:** Child-specific access
- **Primary Use:** Child progress monitoring, teacher communication, homework support
- **Key Capabilities:**
  - `view_child_progress`, `communicate_with_teachers`
  - `access_parent_dashboard`
  - `submit_homework`, `view_announcements`
  - `ai_homework_helper` (basic tier)

## Capability Categories

### Core Access (17 capabilities)
- Dashboard and mobile app access
- Organization and seat management
- Basic school metrics and settings

### Educational Capabilities (11 capabilities)
- Class, student, and assignment management
- Progress tracking and reporting
- Principal hub and school reports

### Parent Dashboard Capabilities (10 capabilities)
- Homework submission and progress viewing
- In-app messaging and voice notes
- Push notifications and offline access

### WhatsApp Integration (4 capabilities)  
- Opt-in, send/receive messages
- Voice message support

### Communication & Engagement (6 capabilities)
- Announcements, teacher replies
- Media messages and voice feedback
- Engagement metrics

### AI Capabilities (7 capabilities)
- Lesson generation, grading assistance
- Homework helper, STEM activities
- Progress analysis and insights
- Quota management (admin levels)

### Premium Features (6 capabilities)
- Advanced analytics, bulk operations
- Custom reports, API access
- SSO access, priority support

### Admin Capabilities (6 capabilities)
- System logs, feature flags
- Billing and subscription management
- Cross-organizational access

## Subscription Tier Enhancements

### Free Tier
- Basic `ai_homework_helper` (10 requests/month limit)
- Basic engagement metrics

### Starter Tier  
- Enhanced AI capabilities with limited usage
- WhatsApp voice messages
- Basic AI insights

### Premium Tier
- Full AI suite including STEM activities
- Complete WhatsApp integration
- Advanced analytics

### Enterprise Tier
- All features plus bulk operations
- Custom reports and SSO
- AI quota management
- Priority support

## Multi-Tenant Architecture

### Organization Scoping
- All roles (except super_admin) are scoped to `organization_id`
- Teachers and parents have additional relationship-based scoping
- Seat management controls active/inactive status

### Relationship-Based Access
- **Teachers:** Access students through class assignments
- **Parents:** Access children through parent-child links
- **Principals:** Unrestricted within their organization

### Capability-Based Writes
- Read access primarily governed by RLS policies based on role/scope
- Write access additionally gated by specific capabilities
- Example: Managing students requires both organizational scope AND `manage_students` capability

## Security Considerations

### Current Strengths
1. **Hierarchical Design:** Clear escalation path with level-based permissions
2. **Capability Granularity:** 117 distinct capabilities for fine-grained control
3. **Multi-Tenant Safe:** Organization-level isolation built-in
4. **Subscription Integration:** Features tied to billing tiers

### Areas for RLS Alignment
1. **Super Admin Access:** Currently may bypass RLS - needs proper policy integration
2. **Principal Scope:** Requires organization-wide visibility without RLS bypass
3. **Teacher-Student Relationships:** Complex joins need optimization for RLS performance
4. **Parent-Child Links:** Multi-guardian support requires careful policy design

## Capability to Resource Mapping

### Users & Profiles
- **Read:** Role hierarchy determines scope (super_admin > principal > teacher/parent own)
- **Write:** `manage_users` capability required

### Classes & Students  
- **Read:** Organization scope + relationship-based access
- **Write:** `manage_classes`, `manage_students` capabilities

### Assignments & Grades
- **Read:** Teacher (own classes), Parent (own children), Principal (org), Super Admin (all)
- **Write:** `create_assignments`, `grade_assignments` capabilities

### AI Usage & Quotas
- **Read:** Usage visible to user + organizational admins
- **Write:** `ai_quota_management` capability for allocation changes

### Billing & Subscriptions
- **Read:** Principal (own org), Super Admin (all)
- **Write:** `manage_billing`, `manage_subscriptions` capabilities

## Conditional Logic Patterns

### Seat Status Validation
```typescript
// Teachers without active seats lose core teaching capabilities
if (role === 'teacher' && seatStatus !== 'active') {
  removeCapabilities(['manage_classes', 'create_assignments', 'grade_assignments']);
}
```

### Organization Membership
```typescript
// All non-super_admin roles require organization membership
if (role !== 'super_admin' && !organizationId) {
  return minimalCapabilities;
}
```

### Subscription Tier Gates
```typescript
// AI capabilities limited by subscription tier
if (planTier === 'free') {
  capabilities.add('ai_homework_helper'); // limited usage
} else if (planTier === 'premium') {
  capabilities.add(['ai_lesson_generation', 'ai_grading_assistance', 'ai_stem_activities']);
}
```

## Recommendations for RLS Implementation

1. **Preserve Role Hierarchy:** Ensure RLS policies respect the 4-level access model
2. **Organization First:** All policies should start with organization scoping
3. **Capability Integration:** Write policies should validate required capabilities
4. **Performance Optimization:** Index relationship tables for teacher-student joins
5. **Super Admin Support:** Use explicit policy conditions instead of RLS bypass

## Next Steps

1. Map each database table to appropriate access scope (org/class/student/user)
2. Create policy templates that incorporate both role hierarchy and capabilities
3. Design relationship helper functions for complex teacher-parent-student joins
4. Implement JWT claim structure to pass role, org_id, and capabilities to database
5. Create verification tests for each role's expected access patterns

---
**Generated from:** `/lib/rbac.ts` analysis  
**Total Capabilities:** 117  
**Total Roles:** 5  
**Access Levels:** 4-tier hierarchy