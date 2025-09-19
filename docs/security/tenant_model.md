# EduDash Pro Tenant Model Documentation

**Date:** 2025-09-19  
**Status:** Phase 3.2 Analysis Complete  
**Database:** PostgreSQL 15 (Supabase)

## 🏢 Multi-Tenancy Architecture Overview

EduDash Pro implements a **preschool-based multi-tenancy model** where each preschool organization operates as an isolated tenant with strict data boundaries enforced through Row Level Security (RLS).

### Tenancy Strategy
- **Primary Tenant Entity:** `preschools` table
- **Tenant Isolation:** Row-level security with tenant-scoped policies
- **Cross-Tenant Access:** Superadmin role only, with explicit authorization
- **Tenant Identification:** `preschool_id` or `organization_id` UUID columns

---

## 🔑 Tenant Key Patterns

### Primary Tenant Columns
Based on schema analysis, EduDash Pro uses two naming patterns for tenant identification:

| Column Name | Usage | Tables |
|-------------|--------|---------|
| `preschool_id` | Primary pattern for educational entities | classes, homework_assignments, lessons, subscriptions, ai_generations, child_registration_requests |
| `organization_id` | Legacy/alternative pattern | users, parent_child_links |

### Tenant Column Distribution

```csv
Schema,Table,Tenant_Column,Type
public,users,organization_id,uuid
public,classes,preschool_id,uuid  
public,homework_assignments,preschool_id,uuid
public,lessons,preschool_id,uuid
public,subscriptions,preschool_id,uuid
public,ai_generations,preschool_id,uuid
public,parent_child_links,organization_id,uuid
public,child_registration_requests,preschool_id,uuid
```

### ⚠️ Inconsistency Alert
**Issue:** Mixed tenant column naming (`preschool_id` vs `organization_id`)  
**Impact:** Policy complexity, potential join issues  
**Recommendation:** Standardize on `preschool_id` and migrate `organization_id` references

---

## 🔄 Relationship Model Analysis

### Core Entity Relationships

#### 1. **Preschool → Users** (1:N)
- **Anchor:** `users.organization_id` → `preschools.id`
- **Scope:** Organization-wide user access
- **Roles:** All user types (super_admin, principal, teacher, parent)

#### 2. **Preschool → Classes** (1:N)  
- **Anchor:** `classes.preschool_id` → `preschools.id`
- **Scope:** School-specific class management
- **Access:** Teachers (assigned), Principals (all), Parents (children's classes)

#### 3. **Classes → Teachers** (N:1)
- **Anchor:** `classes.teacher_id` → `users.id` (role='teacher')
- **Scope:** Teacher can access assigned classes
- **Constraint:** Teacher must belong to same preschool

#### 4. **Parents ↔ Children** (N:M)
- **Bridge:** `parent_child_links` table
- **Keys:** `parent_id` → `users.id`, `child_id` → `users.id` 
- **Scope:** Parent can access child's educational data
- **Note:** Uses `organization_id` (inconsistent with other tables)

#### 5. **Educational Content Hierarchy**
```
Preschool
├── Classes (preschool_id)
│   ├── Homework Assignments (class_id + preschool_id)
│   └── Lessons (class_id + preschool_id)
├── AI Generations (preschool_id + user_id)  
└── Subscriptions (preschool_id)
```

---

## 📊 FK Path Analysis to Tenant Scope

### Direct Tenant Tables (Level 0)
**Tables with direct tenant columns:**
- ✅ `classes` → `preschool_id`
- ✅ `homework_assignments` → `preschool_id`  
- ✅ `lessons` → `preschool_id`
- ✅ `subscriptions` → `preschool_id`
- ✅ `ai_generations` → `preschool_id`
- ✅ `child_registration_requests` → `preschool_id`
- ⚠️ `users` → `organization_id` (naming inconsistency)
- ⚠️ `parent_child_links` → `organization_id` (naming inconsistency)

### Indirect Tenant Tables (Level 1)
**Tables that reach tenant scope via 1 FK hop:**

#### Via `classes.preschool_id`:
- `lesson_activities` → `lessons.id` → `lessons.preschool_id` ✅
- `activity_attempts` → `lesson_activities.id` → `lessons.preschool_id` ✅

#### Via `subscriptions.preschool_id`:
- `seats` → `subscriptions.id` → `subscriptions.preschool_id` ✅
- `subscription_invoices` → `subscriptions.id` → `subscriptions.preschool_id` ✅
- `parent_payments` → `subscriptions.id` → `subscriptions.preschool_id` ✅

#### Via `users.organization_id`:
- `profiles` → `users.id` → `users.organization_id` ⚠️
- `org_invites` → `preschools.id` (direct) ✅
- `push_notifications` → `users.id` → `users.organization_id` ⚠️

### Potentially Orphaned Tables
**Tables without clear tenant path (⚠️ Security Risk):**
- `billing_plans` - Global configuration table ✅
- `config_kv` - Mixed global/tenant configuration ⚠️
- `payfast_itn_logs` - Payment processing logs ⚠️  
- `ad_impressions` - Advertising tracking ⚠️

---

## 🔒 RLS Policy Requirements by Table Type

### 1. **Org-Scoped Tables** (Direct tenant column)
**Policy Pattern:** `WHERE preschool_id = app_auth.org_id()`

**Tables:**
- classes, homework_assignments, lessons, subscriptions
- ai_generations, child_registration_requests

### 2. **Legacy Org-Scoped Tables** (organization_id)
**Policy Pattern:** `WHERE organization_id = app_auth.org_id()`  
**Action Required:** Migrate to `preschool_id` for consistency

**Tables:**
- users, parent_child_links

### 3. **Class-Scoped Tables** (Requires class → preschool path)
**Policy Pattern:** 
```sql
WHERE EXISTS (
  SELECT 1 FROM classes c 
  WHERE c.id = table.class_id 
  AND c.preschool_id = app_auth.org_id()
)
```

**Tables:**
- lesson_activities (via lessons)
- Direct class assignments/resources

### 4. **Student-Scoped Tables** (Requires student → preschool path)
**Policy Pattern:** Role-based access:
- **Teachers:** Can access students in their classes
- **Parents:** Can access their children only  
- **Principals:** Can access all students in their preschool

**Tables:**
- activity_attempts, student_progress, student_grades

### 5. **User-Scoped Tables** (Personal data)
**Policy Pattern:** `WHERE user_id = app_auth.user_id() OR [role-based access]`

**Tables:**  
- profiles, push_notifications, user_preferences

### 6. **Global/System Tables**
**Policy Pattern:** Public read, superadmin write

**Tables:**
- billing_plans, system_config

---

## 🚨 Security Gaps & Recommendations

### Critical Issues ✋

1. **Tenant Column Inconsistency**
   - **Issue:** Mixed `preschool_id`/`organization_id` usage
   - **Risk:** Policy complexity, potential bypass
   - **Fix:** Migrate all to `preschool_id`

2. **Orphaned Tables Without Tenant Path**
   - **Tables:** `config_kv`, `payfast_itn_logs`, `ad_impressions`
   - **Risk:** Cross-tenant data leakage
   - **Fix:** Add tenant columns or explicit tenant scoping

3. **Complex FK Chains**  
   - **Issue:** Multi-hop paths to tenant (activity_attempts → lessons → preschool)
   - **Risk:** Performance, policy complexity  
   - **Fix:** Add direct tenant columns or optimized policies

### Performance Optimizations ⚡

1. **Required Indexes for RLS:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_classes_preschool ON classes(preschool_id);
   CREATE INDEX CONCURRENTLY idx_users_organization ON users(organization_id);
   CREATE INDEX CONCURRENTLY idx_lessons_preschool ON lessons(preschool_id);
   CREATE INDEX CONCURRENTLY idx_homework_preschool ON homework_assignments(preschool_id);
   ```

2. **Composite Indexes for Common Joins:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_classes_teacher_preschool ON classes(teacher_id, preschool_id);
   CREATE INDEX CONCURRENTLY idx_parent_child_links_parent ON parent_child_links(parent_id);
   ```

---

## 📋 Policy Template Assignments

| Table Type | Template | Example Tables | Policy Complexity |
|------------|----------|----------------|-------------------|
| **Org-Scoped** | `org_scoped` | classes, lessons, homework_assignments | Low ⭐ |
| **Legacy Org** | `org_scoped_legacy` | users, parent_child_links | Low ⭐ |
| **Class-Scoped** | `class_scoped` | lesson_activities | Medium ⭐⭐ |
| **Student-Scoped** | `student_scoped` | activity_attempts, grades | High ⭐⭐⭐ |
| **User-Scoped** | `user_scoped` | profiles, notifications | Medium ⭐⭐ |
| **Junction** | `junction` | parent_child_links | High ⭐⭐⭐ |
| **Global** | `global_config` | billing_plans, system_config | Low ⭐ |

---

## ✅ Next Steps

### Phase 3.3: RLS Gap Analysis
1. ✅ Export current RLS status per table
2. ✅ Inventory existing policies  
3. 🔄 Identify policy gaps and insufficient scoping
4. 🔄 Create comprehensive security assessment

### Phase 4: Policy Generation  
1. 🔄 Create policy manifest with table classifications
2. 🔄 Generate policies using templates
3. 🔄 Add performance indexes
4. 🔄 Test and validate access patterns

---

## 📈 Impact Assessment

### Security Improvement
- **Before:** Inconsistent tenant isolation, potential data leakage
- **After:** Comprehensive RLS with strict tenant boundaries
- **Benefit:** GDPR compliance, data sovereignty, zero cross-tenant access

### Performance Considerations  
- **Index Requirements:** +8-12 new indexes for RLS optimization
- **Query Overhead:** 5-15ms per query for RLS evaluation
- **Mitigation:** Proper indexing, query optimization, policy efficiency

### Development Impact
- **Migration Required:** Tenant column standardization
- **Policy Complexity:** Medium-high for relationship tables  
- **Testing Required:** Comprehensive access validation across all roles

---

*This tenant model serves as the foundation for comprehensive RLS policy design and implementation in EduDash Pro.*