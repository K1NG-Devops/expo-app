# AI Assistant Rules for EduDash Pro Database & Security

> **Mandatory rules for AI assistant when working with EduDash Pro database operations**

## 📋 ALWAYS REFERENCE THESE FILES

When dealing with database or security issues, ALWAYS consult these files first:

1. **`/home/king/Desktop/edudashpro/docs/DATABASE_SECURITY_GUIDE.md`** - Comprehensive database guide
2. **`/home/king/Desktop/edudashpro/docs/QUICK_REFERENCE.md`** - Essential commands and connection info
3. **`/home/king/Desktop/edudashpro/scripts/validate_rls_policies.sql`** - RLS validation script
4. **`/home/king/Desktop/edudashpro/scripts/find_tables_needing_policies.sql`** - Security audit script

## 🔒 DATABASE CONNECTION RULES

### ALWAYS Use This Connection Method First
```bash
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres
# Password: hHFgMNhsfdUKUEkA (stored in $SUPABASE_DB_PASSWORD)
```

### Key Project Details (MEMORIZE THESE)
- **Project ID**: `lvvvjywrmpcqrpvuptdi`
- **Project Name**: EduDash-Pro
- **Region**: Southeast Asia (Singapore)
- **Young Eagles Org ID**: `ba79097c-1b93-4b48-bcbe-df73878ab4d1`
- **Principal User ID**: `136cf31c-b37c-45c0-9cf7-755bd1b9afbf`

## 🚨 TROUBLESHOOTING WORKFLOW

### Step 1: Always Run Health Check First
```bash
# Check for tables without policies (main cause of 500 errors)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f scripts/find_tables_needing_policies.sql
```

### Step 2: Check for NULL organization_id Issues
```bash
# This is the #1 cause of RLS policy failures
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT id, role, organization_id, 
       CASE WHEN organization_id IS NULL THEN 'NULL ❌' ELSE 'SET ✅' END as status
FROM profiles ORDER BY role;"
```

### Step 3: Test Common Failing Queries
```bash
# Test activity logs (most common 500 error source)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "
SELECT activity_type, description, created_at FROM activity_logs 
WHERE organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1' 
ORDER BY created_at DESC LIMIT 5;"
```

## 🔧 MIGRATION RULES

### Migration Execution Priority
1. **First Choice**: Use direct SQL with pooler connection
2. **Second Choice**: Use `supabase db push --include-all`
3. **Last Resort**: Use standard `supabase db push`

### Migration File Naming Convention
- Format: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Always use BEGIN; ... COMMIT; blocks
- Include error handling with DO $$ blocks for complex operations

## 🛡️ SECURITY POLICY RULES

### RLS Policy Template (ALWAYS USE THIS PATTERN)
```sql
-- Standard tenant isolation
CREATE POLICY "table_name_org_select"
ON table_name FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
    AND organization_id IS NOT NULL
));

-- ALWAYS add service role bypass
CREATE POLICY "Service role full access to table_name"
ON table_name FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

### Policy Creation Checklist
- [ ] NULL safety checks included
- [ ] Superadmin bypass where appropriate  
- [ ] Service role bypass policy added
- [ ] GRANT permissions to authenticated role
- [ ] Policy handles different user roles correctly

## ⚠️ CRITICAL REMINDERS

### NEVER Do These Things
1. **NEVER** disable RLS without documenting why
2. **NEVER** create policies with `USING (true)` for tenant data
3. **NEVER** forget to add service_role bypass policies
4. **NEVER** apply migrations without testing the SQL first
5. **NEVER** assume organization_id is not NULL

### ALWAYS Do These Things
1. **ALWAYS** reference the documentation files first
2. **ALWAYS** test queries with direct SQL before troubleshooting frontend
3. **ALWAYS** check for NULL organization_id when policies fail
4. **ALWAYS** add service_role bypass policies
5. **ALWAYS** validate policies after creation with the validation script

## 📊 CURRENT STATUS (Updated: 2025-09-21)

### Security Achievement ✅
- **139 tables** secured with RLS policies
- **0 security vulnerabilities** remaining  
- **0 tables** with RLS but no policies
- **All 500 errors** from RLS issues resolved

### Key Fixes Applied ✅
- Fixed NULL organization_id for principal user
- Added service role bypass policies  
- Implemented comprehensive tenant isolation
- Added proper error handling for edge cases

## 🎯 FRONTEND DEVELOPMENT READINESS

### Database Status: **READY** ✅
- All RLS policies working correctly
- No more 500 errors from database queries
- Proper tenant isolation implemented
- All user roles have appropriate access

### Common Query Patterns That Work
```sql
-- Activity logs for organization
SELECT * FROM activity_logs WHERE organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';

-- User profile data  
SELECT * FROM profiles WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Financial data
SELECT * FROM petty_cash_accounts WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';
```

---

## 📞 WHEN TO CONSULT DOCUMENTATION

### Before Any Database Operation
1. Check `DATABASE_SECURITY_GUIDE.md` for proper procedures
2. Use `QUICK_REFERENCE.md` for command syntax
3. Run validation scripts before and after changes

### When Encountering Issues
1. **500 Errors**: Check RLS policies and NULL organization_id
2. **Permission Denied**: Check GRANT statements and table permissions  
3. **Policy Failures**: Verify policy logic and service role bypasses
4. **Migration Failures**: Use direct SQL approach with proper error handling

### When Making Changes
1. **Always** test in development first
2. **Always** backup before major changes
3. **Always** validate after changes
4. **Always** update documentation if you discover new patterns

---

**🎯 REMEMBER: The database is now fully secured and ready. Focus on building great frontend experiences!**