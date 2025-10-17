# Mock Data Strategy for Production Safety

## 🎯 Overview

This document explains how we handle test/seed data in development while preventing it from leaking into production environments.

## 🔐 Multi-Layer Safety Strategy

### Layer 1: Migration Numbering Convention

**Seed migrations use special numbering:**
```
99999999999999_seed_*.sql
```

**Why this works:**
- Regular migrations: `20250117120000_create_table.sql`
- Seed migrations: `99999999999999_seed_data.sql`
- Seed migrations run **last** (after all schema migrations)
- Easy to identify and exclude from production

### Layer 2: Built-in Environment Detection

Every seed migration includes a safety check at the top:

```sql
-- Check if we're in production environment and abort if so
DO $$
BEGIN
  IF current_database() = 'postgres' AND 
     EXISTS (SELECT 1 FROM pg_settings WHERE name = 'application_name' AND setting LIKE '%prod%') 
  THEN
    RAISE EXCEPTION 'SEED DATA BLOCKED: This migration contains test data and must not run in production!';
  END IF;
END $$;
```

**What this does:**
- Detects production database connection strings
- Aborts migration before any data is inserted
- Logs clear error message

### Layer 3: `is_seed_data` Flag

All seed data is tagged in the database:

```sql
jsonb_build_object(
  'is_seed_data', true,
  'organization_id', 'org_soil_of_africa_dev'
)
```

**Benefits:**
- Easy to query: `SELECT * FROM organizations WHERE settings->>'is_seed_data' = 'true'`
- Can be cleaned up programmatically
- Provides audit trail

### Layer 4: `.dev` Email Domain Convention

All seed accounts use `.dev` email domain:

```
director@soilofafrica.dev
instructor1@soilofafrica.dev
trainee1@soilofafrica.dev
```

**Why `.dev`:**
- Never a valid production email
- Easy to filter: `WHERE email LIKE '%.dev'`
- Google owns `.dev` TLD and enforces HTTPS (blocks accidental exposure)

### Layer 5: Explicit Migration Isolation

In this repo, dev-only seeds live in `supabase/local_migrations` (gitignored) and are applied manually. They are never part of `supabase/migrations`.

Apply locally:
```bash
supabase db query -f supabase/local_migrations/<seed_file>.sql
```

CI/CD guard (optional): ensure no seed-like files exist under tracked migrations:
```bash
# Fail if any 99999* seed files are accidentally added to tracked migrations
if ls supabase/migrations/99999* 2>/dev/null; then
  echo "ERROR: Seed-like migrations detected under supabase/migrations";
  exit 1;
fi
```

---

## 🧹 Cleanup Scripts

### Quick Cleanup (Development Reset)

**Script: `scripts/cleanup-seed-data.sql`**

```sql
-- Remove all seed data from development database
BEGIN;

-- Delete seed organizations
DELETE FROM organizations WHERE settings->>'is_seed_data' = 'true';

-- Delete seed users
DELETE FROM auth.users WHERE raw_user_meta_data->>'is_seed_data' = 'true';
DELETE FROM profiles WHERE raw_user_meta_data->>'is_seed_data' = 'true';

-- Delete seed enrollments
DELETE FROM student_classes WHERE student_id IN (
  SELECT id FROM profiles WHERE email LIKE '%.dev'
);

COMMIT;
```

**Run with:**
```bash
npm run cleanup-seeds
```

### Production Safety Audit

**Script: `scripts/audit-production-safety.sql`**

```sql
-- Audit production database for seed data (should return 0 rows)
SELECT 
  'ALERT: Seed data found in production!' as warning,
  table_name,
  COUNT(*) as records
FROM (
  SELECT 'organizations' as table_name FROM organizations WHERE settings->>'is_seed_data' = 'true'
  UNION ALL
  SELECT 'profiles' FROM profiles WHERE email LIKE '%.dev'
  UNION ALL
  SELECT 'auth.users' FROM auth.users WHERE email LIKE '%.dev'
) seed_check
GROUP BY table_name;
```

**Run before every production deployment:**
```bash
npm run audit-prod-safety
```

---

## 📋 Production Deployment Checklist

Before deploying to production:

- [ ] Verify no seed migrations in migration list: `ls supabase/migrations/99999*`
- [ ] Run audit script: `npm run audit-prod-safety`
- [ ] Check CI/CD excludes seed migrations
- [ ] Confirm environment variables use production Supabase URL
- [ ] Test migration rollback plan

---

## 🔄 Development Workflow

### Creating New Seed Data

**Step 1: Create migration with seed number prefix**
```bash
# DO NOT use regular migration command
# MANUALLY create file with seed prefix

touch supabase/migrations/99999999999999_seed_new_org_dev_only.sql
```

**Step 2: Add safety checks**
```sql
-- First lines of every seed migration
DO $$
BEGIN
  IF current_database() LIKE '%prod%' THEN
    RAISE EXCEPTION 'SEED DATA BLOCKED IN PRODUCTION';
  END IF;
END $$;
```

**Step 3: Tag all data**
```sql
INSERT INTO organizations (..., settings) VALUES (
  ...,
  jsonb_build_object('is_seed_data', true)
);
```

**Step 4: Use `.dev` emails**
```sql
INSERT INTO auth.users (email) VALUES ('test@example.dev');
```

### Refreshing Seed Data

```bash
# Clean existing seed data
npm run cleanup-seeds

# Re-run seed migrations
supabase db push
```

---

## 🚨 Emergency Response Plan

### If Seed Data Leaks to Production

**Immediate Actions:**

1. **Stop all deployments**
   ```bash
   git tag emergency-rollback-$(date +%s)
   ```

2. **Audit extent of contamination**
   ```bash
   npm run audit-prod-safety > seed_leak_report.txt
   ```

3. **Remove seed data from production**
   ```sql
   -- ONLY run in production emergency
   DELETE FROM organizations WHERE settings->>'is_seed_data' = 'true';
   DELETE FROM auth.users WHERE email LIKE '%.dev';
   ```

4. **Verify cleanup**
   ```bash
   npm run audit-prod-safety
   # Should return 0 rows
   ```

5. **Post-mortem: Update safety checks**

---

## 📊 Monitoring & Alerts

### Automated Monitoring

Add to CI/CD pipeline:

```yaml
# .github/workflows/production-safety.yml
name: Production Safety Check
on:
  push:
    branches: [main]
    
jobs:
  audit-seed-data:
    runs-on: ubuntu-latest
    steps:
      - name: Check for seed migrations in production deploy
        run: |
          if ls supabase/migrations/99999* 2>/dev/null; then
            echo "ERROR: Seed migrations detected!"
            exit 1
          fi
```

### Database Triggers (Extra Safety Layer)

```sql
-- Create trigger to block .dev emails in production
CREATE OR REPLACE FUNCTION prevent_dev_emails_in_prod()
RETURNS TRIGGER AS $$
BEGIN
  IF current_database() LIKE '%prod%' AND NEW.email LIKE '%.dev' THEN
    RAISE EXCEPTION 'Dev email blocked in production: %', NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_dev_emails_prod
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION prevent_dev_emails_in_prod();
```

---

## ✅ Best Practices Summary

| Practice | Why It Matters |
|----------|----------------|
| **Prefix seed migrations with `99999`** | Easy identification and exclusion |
| **Tag data with `is_seed_data: true`** | Programmatic cleanup and auditing |
| **Use `.dev` email domain** | Impossible to be real production users |
| **Environment detection in SQL** | Fail-fast protection at database level |
| **Exclude from production deploys** | CI/CD pipeline enforcement |
| **Regular audits** | Catch leaks before they cause problems |

---

## 🎓 Example: Soil Of Africa Seed Data

**Location:** `supabase/local_migrations/99999999999999_seed_soil_of_africa_dev_only.sql`

**What it creates:**
- Organization: `org_soil_of_africa_dev`
- Director: `director@soilofafrica.dev`
- 4 Instructors: `instructor1-4@soilofafrica.dev`
- 4 Training cohorts
- 20 Trainees: `trainee1-20@soilofafrica.dev`

**All tagged with:**
- Email domain: `.dev`
- Metadata flag: `is_seed_data: true`
- Organization ID suffix: `_dev`

**To run:**
```bash
supabase db query -f supabase/local_migrations/99999999999999_seed_soil_of_africa_dev_only.sql
```

**To clean:**
```bash
npm run cleanup-seeds
```

---

## 📝 Quick Reference Commands

```bash
# Create new seed file (manual file creation)
touch supabase/local_migrations/99999999999999_seed_description.sql

# Apply a local seed (development only)
supabase db query -f supabase/local_migrations/99999999999999_seed_description.sql

# Clean seed data
npm run cleanup-seeds

# Audit production safety
npm run audit-prod-safety

# Deploy to production
supabase db push  # seeds not included (gitignored)

# List local seed files
ls supabase/local_migrations/*.sql
```

---

**Last Updated:** 2025-01-17  
**Owner:** EduDash Pro Team  
**Review Frequency:** Before every production deployment
