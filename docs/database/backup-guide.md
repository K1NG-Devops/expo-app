# Database Backup Guide - EduDash Pro

## 🛡️ **CRITICAL: Create Backups Before Security Fixes**

Before applying any of the security fixes (`SECURITY_ADVISOR_FIXES.sql` or `FUNCTION_SEARCH_PATH_FIXES.sql`), we need comprehensive backups.

---

## 📋 **METHOD 1: Supabase Dashboard Backup (RECOMMENDED)**

### **Step 1: Full Schema + Data Backup via Dashboard**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your EduDash Pro project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Export Full Database Schema**
   ```sql
   -- Copy this query and run it to see your database structure
   SELECT 
     table_schema,
     table_name,
     table_type
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

4. **Export Database via pg_dump (if you have direct access)**
   - Go to Settings → Database
   - Look for "Connection pooling" or "Direct connection"
   - Use the connection string with pg_dump

---

## 📋 **METHOD 2: Manual Table Export (SAFEST)**

### **Step 1: Export Critical Tables**

Run these queries in Supabase Dashboard SQL Editor and save results:

#### **Users & Authentication Data**
```sql
-- Export users table
SELECT * FROM public.profiles ORDER BY created_at;

-- Export preschools
SELECT * FROM public.preschools ORDER BY created_at;

-- Export subscriptions
SELECT * FROM public.subscriptions ORDER BY created_at;
```

#### **Business Data**
```sql
-- Export subscription plans
SELECT * FROM public.subscription_plans ORDER BY tier;

-- Export classes
SELECT * FROM public.classes ORDER BY created_at;

-- Export any homework/lessons data
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%homework%' 
  OR table_name LIKE '%lesson%'
  OR table_name LIKE '%assignment%';
```

### **Step 2: Export Schema Structure**
```sql
-- Get all table definitions
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### **Step 3: Export Functions and Policies**
```sql
-- Get all functions
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname NOT LIKE 'pg_%'
ORDER BY proname;

-- Get all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 📋 **METHOD 3: Programmatic Backup (If you have connection details)**

### **Step 1: Set Environment Variables**

Create a `.env.backup` file (don't commit this):
```bash
# Your Supabase project details
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_DB_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### **Step 2: Use pg_dump (if available)**
```bash
# Create timestamped backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)_pre_security_fixes

# Full database backup (if you have connection string)
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-privileges \
  --file="backups/$(date +%Y%m%d_%H%M%S)_pre_security_fixes/full_backup.sql"

# Schema-only backup
pg_dump "$SUPABASE_DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="backups/$(date +%Y%m%d_%H%M%S)_pre_security_fixes/schema_backup.sql"

# Data-only backup  
pg_dump "$SUPABASE_DB_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  --file="backups/$(date +%Y%m%d_%H%M%S)_pre_security_fixes/data_backup.sql"
```

---

## 📋 **METHOD 4: Supabase CLI Backup (If you can link the project)**

### **Step 1: Link Your Project**
```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_ID
```

### **Step 2: Create Backup**
```bash
# Create full backup
supabase db dump --file=backups/pre_security_fixes_$(date +%Y%m%d_%H%M%S).sql

# Create schema-only backup
supabase db dump --schema-only --file=backups/schema_backup_$(date +%Y%m%d_%H%M%S).sql

# Create data-only backup
supabase db dump --data-only --file=backups/data_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🧪 **BACKUP VERIFICATION CHECKLIST**

### **Essential Data to Verify**
- [ ] **Users/Profiles**: Count matches production
- [ ] **Preschools**: All schools present with correct data
- [ ] **Subscriptions**: Active subscriptions preserved
- [ ] **Classes**: Class assignments intact
- [ ] **Functions**: Critical functions like `current_preschool_id` backed up
- [ ] **RLS Policies**: Tenant isolation policies captured

### **Verification Queries**
```sql
-- Count critical records
SELECT 
  'profiles' as table_name, 
  count(*) as record_count 
FROM public.profiles
UNION ALL
SELECT 
  'preschools', 
  count(*) 
FROM public.preschools
UNION ALL
SELECT 
  'subscriptions', 
  count(*) 
FROM public.subscriptions;

-- Verify function count
SELECT 
  count(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname NOT LIKE 'pg_%';

-- Verify RLS policy count
SELECT 
  count(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🚨 **CRITICAL BACKUP LOCATIONS**

### **Recommended Backup Strategy**
1. **Primary**: Supabase Dashboard manual exports (saved as CSV/JSON)
2. **Secondary**: Full pg_dump backup (if connection available)
3. **Tertiary**: Screenshots of critical data counts and schema

### **Backup File Naming Convention**
```
backups/
├── 20250917_202500_pre_security_fixes/
│   ├── full_backup.sql
│   ├── schema_backup.sql
│   ├── data_backup.sql
│   ├── critical_tables_export.csv
│   └── verification_queries.sql
```

---

## ⚠️ **IMPORTANT NOTES**

### **Before You Start**
- **Don't** run any migrations until backups are complete
- **Do** test restore process if possible
- **Save** all exports with timestamps
- **Document** current record counts for verification

### **What to Backup Priority Order**
1. **CRITICAL**: `profiles`, `preschools`, `subscriptions`
2. **HIGH**: `subscription_plans`, `classes`, security functions
3. **MEDIUM**: `homework_assignments`, `lessons`, audit logs
4. **LOW**: Debug functions, temporary data

### **After Backup is Complete**
- Verify file sizes are reasonable (not empty)
- Check that sensitive data is included
- Document exact backup time and method used
- Store backups in multiple locations if possible

---

## 🔄 **RESTORE TESTING (Optional but Recommended)**

If you have a development environment:
```bash
# Test restore (ONLY ON DEV DATABASE)
psql "DEV_DATABASE_URL" -f backups/full_backup.sql
```

---

**Next Step**: Once backup is complete, proceed with applying `SECURITY_ADVISOR_FIXES.sql`