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

## MISSING COMPONENTS - TODO

### SuperAdmin Cross-Tenant Access Model

**Current State**: SuperAdmin role exists but lacks proper cross-tenant access implementation.

**Missing SuperAdmin Tenant Features:**

#### 1. Global Tenant Management
```sql
-- Missing: SuperAdmin global organization view
CREATE VIEW superadmin_global_organizations AS
SELECT 
  o.id,
  o.name,
  o.tenant_type,
  COUNT(p.id) as user_count,
  s.tier as subscription_tier,
  s.status as subscription_status,
  ai_usage.monthly_requests,
  ai_usage.quota_limit
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
LEFT JOIN subscriptions s ON s.school_id = o.id
LEFT JOIN ai_usage_summary ai_usage ON ai_usage.organization_id = o.id
GROUP BY o.id, s.tier, s.status, ai_usage.monthly_requests, ai_usage.quota_limit;
```

#### 2. SuperAdmin RLS Bypass Patterns
```sql
-- Pattern for SuperAdmin cross-tenant access
CREATE POLICY "superadmin_global_access" ON {table_name}
  FOR ALL TO authenticated
  USING (
    -- Normal tenant isolation
    preschool_id IN (
      SELECT organization_id FROM profiles 
      WHERE profiles.id = auth.uid()
    )
    OR
    -- SuperAdmin bypass with audit logging
    (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'superadmin'
      )
      AND audit_log_access(auth.uid(), '{table_name}', preschool_id)
    )
  );
```

#### 3. Missing Cross-Tenant Audit Tables
```sql
CREATE TABLE superadmin_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id UUID REFERENCES profiles(id),
  accessed_organization_id UUID REFERENCES preschools(id),
  accessed_table TEXT,
  accessed_record_id UUID,
  action TEXT, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  reason TEXT, -- Business justification
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

**Implementation Priority**: HIGH - Required for operational support

### Multi-Tenant Principal → Teacher → Parent Flows

**Current Challenge**: Role relationships cross tenant boundaries in complex ways.

#### 1. Cross-Organization Teacher Assignments
**Scenario**: A teacher works at multiple schools (common in small districts)

```sql
-- Missing: Multi-tenant teacher assignments
CREATE TABLE teacher_organization_assignments (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id),
  preschool_id UUID REFERENCES preschools(id),
  role_permissions JSONB, -- Different permissions per school
  ai_quota_allocated INTEGER, -- Quota from this school
  assignment_period DATERANGE,
  assigned_by UUID REFERENCES profiles(id) -- Which principal assigned
);
```

#### 2. Cross-Organization Parent Access
**Scenario**: Parents with children in different schools (siblings, transfers)

```sql
-- Missing: Multi-school parent access
CREATE TABLE parent_school_relationships (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id),
  student_id UUID REFERENCES profiles(id),
  school_preschool_id UUID REFERENCES preschools(id),
  access_level TEXT, -- 'full', 'limited', 'emergency_only'
  granted_by UUID REFERENCES profiles(id), -- Principal who granted access
  valid_until TIMESTAMPTZ
);
```

#### 3. AI Usage Across Organizations
**Challenge**: Teacher's AI quota when working across multiple schools

```typescript
// Missing: Multi-tenant AI quota resolution
interface MultiTenantAIQuota {
  teacherId: string
  quotaAllocations: {
    preschoolId: string
    allocatedQuota: number
    usedQuota: number
    modelRestrictions: string[]
  }[]
  // Which school's quota to use for this request?
  resolveQuotaForRequest(preschoolId: string, modelId: string): Promise<QuotaResult>
}
```

**Implementation Priority**: MEDIUM - Affects scalability for larger districts

### Tenant Isolation Compliance Gaps

#### 1. Data Residency Requirements
**Missing**: Some regions require student data to stay within geographic boundaries

```sql
-- Missing: Geographic data residency tracking
ALTER TABLE preschools ADD COLUMN data_residency_region TEXT;
ALTER TABLE preschools ADD COLUMN compliance_requirements JSONB;

-- Missing: Region-specific AI model restrictions
CREATE TABLE regional_ai_restrictions (
  region TEXT,
  restricted_models TEXT[],
  data_processing_requirements JSONB
);
```

#### 2. Cross-Tenant Data Sharing Consent
**Missing**: Explicit consent tracking for data sharing between roles

```sql
CREATE TABLE data_sharing_consents (
  id UUID PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  data_type TEXT, -- 'student_progress', 'ai_usage', 'assessment_results'
  preschool_context UUID REFERENCES preschools(id),
  consent_given_at TIMESTAMPTZ,
  consent_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
```

**Implementation Priority**: HIGH - Critical for FERPA/GDPR compliance

### Performance and Scaling Considerations

#### 1. Tenant Data Partitioning
**Current**: All tenant data in shared tables
**Missing**: Partitioning strategy for large installations

```sql
-- Consider partitioning large tables by preschool
CREATE TABLE ai_usage_logs_partitioned (
  -- ... existing columns ...
  preschool_id UUID NOT NULL
) PARTITION BY HASH (preschool_id);

-- Create partitions for different preschool groups
CREATE TABLE ai_usage_logs_partition_1 PARTITION OF ai_usage_logs_partitioned
FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

#### 2. Cross-Tenant Query Optimization
**Missing**: Optimized indexes for SuperAdmin global queries

```sql
-- Missing: SuperAdmin-optimized indexes
CREATE INDEX CONCURRENTLY idx_profiles_role_preschool 
ON profiles (role, preschool_id) 
WHERE role IN ('superadmin', 'principal');

CREATE INDEX CONCURRENTLY idx_ai_usage_global_analytics
ON ai_usage_logs (preschool_id, created_at, ai_model_used)
WHERE created_at >= (NOW() - INTERVAL '90 days');
```

**Implementation Priority**: LOW - Performance optimization, not blocking

---

**Updated Analysis Date:** 2025-01-21  
**Additional Missing Components:** 15  
**Multi-Tenant Complexity Score:** HIGH  
**Estimated Implementation Time:** 6-8 weeks for complete multi-tenant flows
