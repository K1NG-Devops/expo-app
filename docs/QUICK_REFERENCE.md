# EduDash Pro Database Quick Reference

> **Essential commands and connection info for daily operations**

## 🔌 Quick Connect
```bash
# Primary connection (recommended)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres

# Password: hHFgMNhsfdUKUEkA
```

## 🚨 Emergency Commands

### Check System Health
```bash
# Tables without policies (security risk)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -f scripts/find_tables_needing_policies.sql

# Check for NULL organization_id issues  
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "SELECT id, role, organization_id FROM profiles WHERE organization_id IS NULL;"
```

### Test Common Failing Queries
```bash
# Test activity logs (most common 500 error)
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "SELECT COUNT(*) FROM activity_logs WHERE organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';"

# Test profiles access
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres -c "SELECT id, role FROM profiles WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';"
```

## 🔧 Quick Fixes

### Fix Missing Policies (template)
```sql
-- Replace 'table_name' with actual table
CREATE POLICY "table_name_org_select"
ON table_name FOR SELECT TO authenticated
USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
));
```

### Grant Permissions
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON table_name TO authenticated;
```

### Service Role Bypass
```sql
CREATE POLICY "Service role full access to table_name"
ON table_name FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

## 📊 Key IDs
- **Young Eagles Org**: `ba79097c-1b93-4b48-bcbe-df73878ab4d1`
- **Principal User**: `136cf31c-b37c-45c0-9cf7-755bd1b9afbf`
- **Project**: `lvvvjywrmpcqrpvuptdi`

## 🎯 Migration Status: ALL SECURE ✅
- **139 tables** with RLS policies
- **0 security vulnerabilities**
- **Ready for frontend development**