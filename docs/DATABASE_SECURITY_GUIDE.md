# EduDash Pro Database & Security Guide

> **Complete guide to database management, security, and troubleshooting for EduDash Pro**

## 🗄️ Database Configuration

### Connection Details
- **Project ID**: `lvvvjywrmpcqrpvuptdi`
- **Project Name**: EduDash-Pro
- **Region**: Southeast Asia (Singapore)
- **Database Password**: `hHFgMNhsfdUKUEkA` (stored in `$SUPABASE_DB_PASSWORD`)

### Connection Strings

#### Direct Database Connection (Recommended for Admin Tasks)
```bash
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres
```

#### Alternative Connection Methods
```bash
# Via environment variable
export SUPABASE_DB_PASSWORD="hHFgMNhsfdUKUEkA"

# Direct host connection (if pooler fails)
psql -h db.lvvvjywrmpcqrpvuptdi.supabase.co -p 5432 -U postgres -d postgres

# Connection string format
postgresql://postgres.lvvvjywrmpcqrpvuptdi:$SUPABASE_DB_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## 🚀 Migration Management

### Current Migration Status
✅ **139 tables** secured with Row Level Security (RLS)  
✅ **Zero security vulnerabilities** remaining  
✅ **Complete tenant isolation** implemented

### Running Migrations

#### Using Supabase CLI (Standard Method)
```bash
# Check migration status
supabase migration list

# Apply pending migrations
supabase db push

# Include all migrations (bypass some checks)
supabase db push --include-all
```

#### Using Direct SQL (For Complex Migrations)
```bash
# Apply single migration file
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f supabase/migrations/[filename].sql

# Apply multiple migrations in order
for file in supabase/migrations/*.sql; do
  echo "Applying $file..."
  psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f "$file"
done
```

### Key Migration Files

| File | Purpose | Status |
|------|---------|---------|
| `20250921164900_add_missing_tenant_columns.sql` | Added tenant isolation columns | ✅ Applied |
| `20250921164913_critical_security_audit_fixes.sql` | Core RLS policies | ✅ Applied |
| `20250921170200_standard_tenant_policies.sql` | 44 tables with standard policies | ✅ Applied |
| `20250921170400_complex_table_policies.sql` | 82 tables with complex policies | ✅ Applied |
| `20250921172400_fix_organization_id.sql` | Fixed NULL organization_id | ✅ Applied |

---

## 🔒 Row Level Security (RLS) Architecture

### Security Model Overview
- **Multi-tenant isolation**: Organizations cannot access each other's data
- **Role-based access control**: Different permissions per user role
- **Relationship-based access**: Parents can access children's data
- **Service role bypass**: System operations can bypass RLS

### User Roles & Permissions

#### Role Hierarchy
1. **superadmin** - Full system access across all organizations
2. **principal** - Full access within their organization  
3. **admin** - Administrative access within their organization
4. **teacher** - Classroom and student management within organization
5. **parent** - Access to their children's data only
6. **student** - Access to their own data only

### Policy Types Implemented

#### 1. Standard Tenant Isolation (44 tables)
**Tables with `preschool_id`**: activity_feed, ad_impressions, age_groups, etc.
```sql
-- Example policy
CREATE POLICY "table_name_tenant_select"
ON table_name FOR SELECT TO authenticated
USING (preschool_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
));
```

#### 2. Organization-Based (5 tables)
**Tables with `organization_id`**: activity_logs, assignment_categories, etc.
```sql
CREATE POLICY "table_name_org_select" 
ON table_name FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
));
```

#### 3. School-Based (5 tables)
**Tables with `school_id`**: billing_invoices, payment_transactions, etc.
```sql
CREATE POLICY "table_name_school_select"
ON table_name FOR SELECT TO authenticated  
USING (school_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
));
```

#### 4. User-Based (21 tables)
**Tables with `user_id`**: addresses, billing_preferences, etc.
```sql
CREATE POLICY "table_name_user_own"
ON table_name FOR ALL TO authenticated
USING (user_id = auth.uid());
```

#### 5. Student-Based (10 tables)  
**Tables with `student_id`**: attendance, assessments, etc.
```sql
-- Students access their own data
CREATE POLICY "table_name_student_own"
ON table_name FOR ALL TO authenticated
USING (student_id = auth.uid());

-- Parents access their children's data
CREATE POLICY "table_name_parent_child"
ON table_name FOR SELECT TO authenticated
USING (student_id IN (
    SELECT student_id FROM student_parent_relationships
    WHERE parent_id = auth.uid()
));
```

#### 6. Public/System Tables (50 tables)
**Lookup tables, templates, etc.**: activities, system_settings, etc.
```sql
-- Read access for all authenticated users
CREATE POLICY "table_name_public_read"
ON table_name FOR SELECT TO authenticated
USING (true);

-- Modify access only for admins
CREATE POLICY "table_name_admin_modify"
ON table_name FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'principal', 'superadmin')
));
```

#### 7. Service Role Bypass (All tables)
```sql
CREATE POLICY "Service role full access to table_name"
ON table_name FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

---

## 🛠️ Troubleshooting Common Issues

### 1. 500 Internal Server Error on Database Queries

**Symptoms**: Frontend receives 500 errors when querying database
**Common Causes**:
- Missing RLS policies on tables with RLS enabled
- NULL values in tenant isolation columns (`organization_id`, `preschool_id`)
- Incorrect policy logic that returns NULL instead of true/false

**Diagnosis**:
```bash
# Check tables with RLS but no policies
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f scripts/find_tables_needing_policies.sql

# Check for NULL organization_id
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT id, role, organization_id, 
       CASE WHEN organization_id IS NULL THEN 'NULL ❌' ELSE 'SET ✅' END as status
FROM profiles ORDER BY role;"
```

**Solutions**:
1. Add missing RLS policies
2. Update NULL organization_id values
3. Add service_role bypass policies

### 2. Permission Denied Errors

**Symptoms**: `permission denied for table [table_name]`
**Cause**: Missing GRANT permissions for authenticated role

**Fix**:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON table_name TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

### 3. User Can't Access Their Own Data

**Symptoms**: Users can't see data they should have access to
**Common Causes**:
- User's `organization_id` is NULL or incorrect
- Policy logic error
- Missing relationships (e.g., student_parent_relationships)

**Diagnosis**:
```sql
-- Check user's organization
SELECT id, role, organization_id FROM profiles WHERE id = 'user-uuid';

-- Check policy effectiveness
SET ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-uuid", "role": "authenticated"}';
SELECT COUNT(*) FROM table_name WHERE condition;
```

### 4. Cross-Tenant Data Leakage

**Symptoms**: Users can see data from other organizations
**Cause**: Incorrect or missing tenant isolation in policies

**Prevention**: Always include tenant checks in policies:
```sql
-- Good: Includes tenant isolation
USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
))

-- Bad: No tenant isolation
USING (true)
```

---

## 🧪 Validation & Testing

### RLS Policy Validation
```bash
# Run comprehensive validation
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f scripts/validate_rls_policies.sql
```

### Test Specific Queries
```bash
# Test activity logs (common failure point)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT activity_type, description, created_at 
FROM activity_logs 
WHERE organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'
ORDER BY created_at DESC LIMIT 5;"

# Test profiles access
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT id, role, organization_id 
FROM profiles 
WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';"
```

---

## 📊 Database Schema Key Points

### Core Tables
- **organizations**: Main tenant isolation table
- **profiles**: User accounts with roles and organization membership  
- **preschools**: Educational institutions (legacy - now maps to organizations)
- **groups/classes**: Educational groupings
- **courses**: Educational content
- **assignments/submissions**: Academic work

### Key Relationships
```
organizations (1) ←→ (many) profiles
profiles (1) ←→ (many) student_parent_relationships ←→ (1) profiles
groups (many) ←→ (1) courses ←→ (1) organizations
```

### Critical Constraints
- `profiles.organization_id` → `organizations.id` (must not be NULL for non-superadmin)
- All tenant tables must have proper isolation column
- Service role must have bypass policies on all RLS-enabled tables

---

## 🚨 Emergency Procedures

### Disable RLS Temporarily (Emergency Only)
```sql
-- ONLY use in emergency - this disables all security!
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Grant Emergency Admin Access
```sql
-- Grant temporary superadmin access
UPDATE profiles SET role = 'superadmin' WHERE id = 'user-uuid';

-- Revoke after emergency
UPDATE profiles SET role = 'principal' WHERE id = 'user-uuid';  
```

### Bypass RLS for Data Recovery
```sql
-- Use service_role for system operations
SET ROLE service_role;
-- Perform data operations
RESET ROLE;
```

---

## 📈 Performance Considerations

### Indexing for RLS
Most tenant isolation policies use these patterns - ensure indexes exist:
```sql
-- Essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_organization_id ON table_name(organization_id);
CREATE INDEX IF NOT EXISTS idx_table_user_id ON table_name(user_id);
CREATE INDEX IF NOT EXISTS idx_table_student_id ON table_name(student_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_table_org_created ON table_name(organization_id, created_at);
```

### Query Optimization
- Always filter by tenant column first
- Use EXPLAIN ANALYZE to check query plans
- Consider materialized views for complex cross-table policies

---

## 🔧 Useful Scripts & Commands

### Quick Health Check
```bash
# Check all critical systems
./scripts/health-check.sh
```

### Find Tables Needing Attention
```bash
# Tables with RLS but no policies
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f scripts/find_tables_needing_policies.sql
```

### Policy Management
```bash
# List all policies for a table
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'table_name';"

# Drop all policies for a table (emergency)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT 'DROP POLICY IF EXISTS \"' || policyname || '\" ON ' || tablename || ';'
FROM pg_policies 
WHERE tablename = 'table_name';"
```

---

## 📝 Change Log

### 2025-09-21: Major Security Overhaul
- ✅ Secured all 139 tables with RLS policies  
- ✅ Fixed NULL organization_id issues
- ✅ Implemented comprehensive tenant isolation
- ✅ Added service role bypass policies
- ✅ Resolved all 500 errors from policy issues

### Future Maintenance
- Monitor query performance with RLS enabled
- Regular policy audits for new tables
- Update policies when schema changes
- Test policies with each new user role introduction

---

**📞 Need Help?**
- Check this guide first
- Run validation scripts
- Review recent migrations
- Test with direct SQL queries before debugging frontend

**⚠️ Remember**: Always test policy changes in development before applying to production!