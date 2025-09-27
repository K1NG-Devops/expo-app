# EduDash Pro RLS Manifest Development Guide

## 🎯 Purpose

This guide helps your team develop robust, safe RLS policy manifests that generate **non-breaking policies** for the EduDash Pro educational platform. The manifest is a **template-driven system** that ensures consistency, security, and maintainability across your multi-tenant database.

## 🏗️ How Manifest-Driven Policies Work

### The Flow
```
YAML Manifest → JS Generator → SQL Migration → Supabase Push → Validation
```

**Key Principle**: You define **templates** and **table classifications** once, then generate consistent, tested policies for all tables. This prevents manual SQL errors and ensures multi-tenant isolation.

## 📋 Manifest Structure

### 1. **Templates Section** - Reusable Policy Patterns

Templates define the **core security patterns** your platform needs:

```yaml
templates:
  # Organization-scoped tables (most common)
  org_scoped:
    description: "Standard multi-tenant isolation by organization"
    read_policy: |
      app_auth.is_super_admin()
      OR ({tenant_column} = app_auth.org_id())
    write_policy: |
      app_auth.is_super_admin()
      OR (
        {tenant_column} = app_auth.org_id()
        AND app_auth.has_cap('{write_capability}')
      )
    complexity: low
    
  # User-specific data (profiles, preferences)
  user_scoped:
    description: "Personal user data - owner + admin access"
    read_policy: |
      app_auth.is_super_admin()
      OR {user_column} = app_auth.profile_id()
      OR (
        app_auth.is_principal()
        AND EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = {user_column} 
          AND u.organization_id = app_auth.org_id()
        )
      )
    write_policy: |
      app_auth.is_super_admin()
      OR (
        {user_column} = app_auth.profile_id()
        AND app_auth.has_cap('manage_own_profile')
      )
      OR (
        app_auth.is_principal()
        AND app_auth.has_cap('{write_capability}')
        AND EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = {user_column} 
          AND u.organization_id = app_auth.org_id()
        )
      )
    complexity: medium
```

### 2. **Table Classifications** - Map Tables to Templates

For each table, specify:
- Which template to use
- What columns map to template variables
- Security priority level
- Required capabilities

```yaml
tables:
  # Critical security tables first
  - table: users
    template: user_selective  # Special complex template for users
    tenant_column: organization_id
    user_column: id
    write_capability: manage_users
    priority: critical
    description: "User accounts - highest security risk"
    
  - table: classes
    template: org_scoped
    tenant_column: preschool_id
    write_capability: manage_classes
    priority: critical
    description: "Class management"
    
  - table: profiles
    template: user_scoped
    user_column: id  # Important: match your actual column name
    write_capability: manage_profiles
    priority: critical
    description: "Personal user profile data"
```

## 🔧 Template Variable System

### Core Variables (Always Available)
- `{table}` - Table name
- `{tenant_column}` - Organization/preschool column (e.g., `preschool_id`)
- `{write_capability}` - Required capability for writes
- `{schema}` - Schema name (default: `public`)

### New Variables (Enhanced Manifest)
- `{user_column}` - User ID column (often `user_id` or `id`)
- `{parent_column}` - Parent ID column
- `{child_column}` - Student/child ID column  
- `{policy_roles}` - Who can use the policy (default: `authenticated`)

### Example Usage in Templates
```yaml
# Template using flexible variables
user_scoped:
  read_policy: |
    app_auth.is_super_admin()
    OR {user_column} = app_auth.profile_id()
  variables:
    user_column: "user_id"  # default value
    schema: "public"        # default schema
    policy_roles: "authenticated"  # default role
```

## 🎯 Educational Platform Specific Templates

### Teacher-Student Relationships
```yaml
class_scoped:
  description: "Data tied to specific classes - teacher + admin access"
  read_policy: |
    app_auth.is_super_admin()
    OR (
      {tenant_column} = app_auth.org_id()
      AND (
        app_auth.is_principal()
        OR (
          app_auth.is_teacher() 
          AND app_auth.teacher_can_access_class({class_column})
        )
        OR (
          app_auth.is_parent()
          AND EXISTS (
            SELECT 1 FROM parent_child_links pcl
            JOIN users student ON student.id = pcl.child_id
            WHERE student.class_id = {class_column}
            AND pcl.parent_id = app_auth.parent_id()
          )
        )
      )
    )
```

### Parent-Child Financial Data
```yaml
parent_scoped:
  description: "Financial data - parent + school admin access"
  read_policy: |
    app_auth.is_super_admin()
    OR (
      {parent_column} = app_auth.parent_id()
      AND {tenant_column} = app_auth.org_id()
    )
    OR (
      app_auth.is_principal()
      AND {tenant_column} = app_auth.org_id()
    )
  write_policy: |
    app_auth.is_super_admin()
    OR (
      app_auth.is_principal()
      AND {tenant_column} = app_auth.org_id()
      AND app_auth.has_cap('{write_capability}')
    )
```

## ⚡ Performance Guidelines

### Index Requirements
Always define required indexes for your templates:

```yaml
templates:
  org_scoped:
    required_indexes:
      - "{tenant_column}"  # Essential for tenant isolation
      - "created_at"       # Common query pattern
    
  user_scoped:
    required_indexes:
      - "{user_column}"
      - "({tenant_column}, {user_column})"  # Composite index
```

### Performance Targets
```yaml
validation:
  performance_targets:
    max_policy_overhead_ms: 20    # Per query policy evaluation
    min_index_coverage: 95        # Query should hit indexes
    max_function_calls: 2         # Limit app_auth.* calls per policy
```

## 🛡️ Security Best Practices

### 1. **Always Include Superadmin Bypass**
```sql
app_auth.is_super_admin() OR (your_conditions_here)
```

### 2. **Tenant Isolation First**
```sql
{tenant_column} = app_auth.org_id() AND (role_specific_logic)
```

### 3. **Capability-Based Writes**
```sql
app_auth.has_cap('{write_capability}')
```

### 4. **Handle Edge Cases**
```yaml
# Global config tables
global_config:
  read_policy: |
    active = true  # Everyone can read active config
  write_policy: |
    app_auth.is_super_admin()  # Only superadmin writes
```

## 🔍 Validation and Testing

### Pre-Generation Checks
```yaml
validation:
  required_functions:
    - "app_auth.is_super_admin"
    - "app_auth.org_id"
    - "app_auth.has_cap"
  
  required_columns:
    - "organization_id OR preschool_id"  # Tenant isolation
    - "created_at"                       # Audit trail
  
  security_requirements:
    cross_tenant_leakage_tolerance: 0    # Zero tolerance
    force_rls_after_validation: true     # Enable RLS
```

### Testing Strategy
1. **Cross-tenant isolation** - Users can't see other schools' data
2. **Role boundaries** - Teachers can't access parent payment data
3. **Self-service** - Users can update their own profiles
4. **Admin oversight** - Principals see all org data

## 📦 Implementation Phases

### Phase Structure
```yaml
implementation_phases:
  critical:    # User data, auth, core entities
    - users
    - profiles
    - preschools
    - classes
    - parent_child_links
    
  financial:   # Payment and subscription data
    - subscriptions
    - parent_payments
    - seats
    
  operational: # Daily operations
    - homework_assignments
    - attendance
    - communications
```

## 🚀 Team Workflow

### 1. **Adding a New Table**
```yaml
# Add to manifest
- table: new_feature_table
  template: org_scoped              # Choose appropriate template
  tenant_column: preschool_id       # Specify tenant column
  write_capability: manage_feature  # Define required capability
  priority: medium
  description: "What this table stores"
```

### 2. **Generate Migration**
```bash
# Generate policies for specific phase
node scripts/security/generate_policies.js --phase=critical

# This creates a proper migration file:
# supabase/migrations/TIMESTAMP_rls_critical_policies.sql
```

### 3. **Apply Safely**
```bash
# Lint first (WARP.md requirement)
sqlfluff lint supabase/migrations

# Apply to remote
supabase db push

# Verify no drift
supabase db diff  # Should show no changes
```

## 🎓 Educational Context Considerations

### Child Safety (Golden Rule Compliance)
- **Minimal exposure**: Students only see their own data + assigned content
- **Parent boundaries**: Parents see only their children's data
- **Teacher scope**: Teachers access only assigned students
- **Admin oversight**: Principals have full org visibility for safety

### POPIA/GDPR Compliance
```yaml
# Personal data templates should include audit trails
user_personal_data:
  audit_required: true
  retention_policy: "7_years"
  export_capability: "data_export"
  deletion_capability: "data_deletion"
```

## 🔧 Common Patterns for EduDash Pro

### Assignment Access Pattern
```yaml
assignment_scoped:
  read_policy: |
    app_auth.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM homework_assignments ha
      WHERE ha.id = assignment_id
      AND ha.preschool_id = app_auth.org_id()
      AND (
        ha.teacher_id = app_auth.teacher_id()        # Assignment creator
        OR app_auth.is_principal()                   # School admin
        OR EXISTS (                                  # Parent of assigned student
          SELECT 1 FROM parent_child_links pcl
          WHERE pcl.parent_id = app_auth.parent_id()
          AND pcl.child_id = ANY(ha.assigned_student_ids)
        )
      )
    )
```

### Communication Pattern
```yaml
parent_teacher_communication:
  read_policy: |
    app_auth.is_super_admin()
    OR (
      preschool_id = app_auth.org_id()
      AND (
        sender_id = app_auth.profile_id()
        OR recipient_id = app_auth.profile_id()
        OR app_auth.is_principal()  # Admin oversight
      )
    )
```

## 🚨 Critical Reminders

### WARP.md Compliance
- ✅ **No direct SQL** - Always use migrations
- ✅ **No mock data** - Policies handle empty states gracefully  
- ✅ **RLS enforced** - Never bypass security
- ✅ **Migration workflow** - Use `supabase migration new`

### Testing Requirements
- **No production testing** - Use staging/test environments only
- **Real data simulation** - Create test data via service role, clean up after
- **Cross-tenant validation** - Verify isolation between different schools

---

This manifest system ensures your team generates **safe, consistent, non-breaking policies** that protect student data while enabling the educational workflows your platform needs.