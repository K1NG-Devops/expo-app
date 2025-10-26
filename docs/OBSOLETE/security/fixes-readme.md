# Security Advisor Fixes - Implementation Plan

## 🚨 Critical Security Issues Identified

The Supabase Security Advisor has identified **6 security vulnerabilities** in our database:

1. **Policy Exists RLS Disabled** on `public.assignments`
2. **Security Definer View** on `public.teacher_stats` 
3. **Security Definer View** on `public.users_with_subscription`
4. **Security Definer View** on `public.activity_logs_view`
5. **Security Definer View** on `public.classes_with_teachers`
6. **RLS Disabled in Public** on `public.assignments`

## 🎯 Solution Overview

The `SECURITY_ADVISOR_FIXES.sql` script addresses all these issues by:

- ✅ Enabling RLS on all tables that have policies but RLS disabled
- ✅ Converting Security Definer views to Security Invoker views  
- ✅ Creating proper tenant isolation policies
- ✅ Securing sensitive tables with appropriate permissions
- ✅ Providing verification functions

## 🔧 Implementation Steps

### Step 1: Backup Current State (CRITICAL)
```bash
# Create a backup before applying fixes
supabase db dump --file=backup_before_security_fixes.sql
```

### Step 2: Test Connection
```bash
# Verify you can connect to your database
supabase status
```

### Step 3: Apply Security Fixes
```bash
# Apply the security fixes migration
supabase db reset --db-url="$SUPABASE_DB_URL" < SECURITY_ADVISOR_FIXES.sql
```

**OR** if you prefer to apply via Supabase Dashboard:
1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the contents of `SECURITY_ADVISOR_FIXES.sql`
3. Execute the script

### Step 4: Verify Results
After applying the fixes, run this query to verify RLS status:
```sql
SELECT * FROM verify_rls_status() ORDER BY table_name;
```

Expected results:
- All tables should show `rls_enabled = true`
- Tables with tenant data should have `policy_count >= 1`

### Step 5: Check Security Advisor
1. Go to Supabase Dashboard > Advisors > Security Advisor  
2. Click "Refresh" to re-scan
3. Verify that all 6 errors are resolved

## 🛡️ What This Fix Does

### RLS Enablement
- Enables Row Level Security on `assignments` table
- Ensures all core business tables have RLS enabled
- Creates tenant isolation using `preschool_id`

### View Security Fixes
Converts problematic Security Definer views to Security Invoker:
- `teacher_stats` - Now respects user's RLS context
- `users_with_subscription` - Filtered by current preschool
- `activity_logs_view` - Tenant-isolated audit logs  
- `classes_with_teachers` - School-specific class data

### Policy Creation
- Tenant isolation policies for all business tables
- Public read access for subscription plans (active only)
- Superadmin-only access for PayFast logs
- Proper config table permissions

## 🔒 Security Benefits

✅ **Tenant Isolation**: Each school can only see their own data  
✅ **Principle of Least Privilege**: Users get minimal required access  
✅ **Audit Trail Protection**: Sensitive logs secured to superadmins  
✅ **View Security**: No privilege escalation through views  
✅ **Payment Security**: Financial data properly isolated  

## 🧪 Testing Checklist

After applying fixes, test these scenarios:

- [ ] **Teacher Login**: Can see only their school's data
- [ ] **Parent Login**: Can access only their child's information  
- [ ] **Superadmin Login**: Can access global data appropriately
- [ ] **API Calls**: All existing API endpoints still work
- [ ] **Views**: All views return expected filtered results
- [ ] **Subscription Flow**: Payment and plan changes work

## 🚨 Rollback Plan

If issues occur after applying fixes:

```bash
# Restore from backup
supabase db reset --db-url="$SUPABASE_DB_URL" < backup_before_security_fixes.sql
```

## 📋 WARP.md Compliance

This security fix aligns with our Non-Negotiables:

✅ **Security Controls**: Maintains RLS policies for tenant isolation  
✅ **Production Database Integrity**: Uses approved migration pipeline  
✅ **Audit Logs**: Preserves audit trail protection  
✅ **Child Safety**: Ensures data privacy compliance  

## 🔗 References

- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Row Level Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Security Definer vs Security Invoker](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

**⚠️ Important**: These security issues expose tenant data across schools. Apply these fixes as soon as possible to maintain data privacy compliance.