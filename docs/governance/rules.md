# EduDash Pro Development Rules

This file contains specific development principles and rules that complement the master WARP.md document.

**Hierarchy**: WARP.md > rules.md > .cursorrules > code

---

## 🗄️ DATABASE MANAGEMENT RULES [NONNEGOTIABLE]

## 📚 Documentation Placement Rules
- Only README.md may live at project root. All other Markdown (*.md) must be placed under docs/.
- Summaries, status reports, and test plan documents belong in docs/status/ or docs/analysis/.
- Deployment/runbooks → docs/deployment/
- Architecture/design → docs/architecture/
- Security policies/reports → docs/security/
- Feature specs → docs/features/
- Governance/process → docs/governance/

## 🔇 Console Logging Policy
- No console.log, console.debug, or console.warn in production bundles.
- Gate non-error logs with __DEV__ or use a central Logger that no-ops in production.
- Route errors through Logger.error and forward to Sentry/PostHog in production.
- Enforce via ESLint (no-console with allow: ["error"]) and Babel transform-remove-console in production.

### Migration-Only Database Changes

**THE GOLDEN RULE OF DATABASE CHANGES:**
> **ALL database changes must go through the Supabase migration system. No exceptions.**

### SQL Linting and Migration Policy

- **✅ ALL SQL migrations must be linted with sqlfluff before pushing to Supabase**
- **✅ ALL SQL must go through supabase db push** - Absolutely no direct SQL commands/querying against any environment
  - **❌ Forbidden examples**: psql, database GUI clients, Supabase Studio SQL editor for schema changes, raw DDL executed from application code
- **❌ NO local Docker instance running** for database development - Do not use `supabase start` or `docker-compose` for local DB
- **✅ Migrations must be kept in sync under any circumstances**
  - Every schema change requires a committed migration under `supabase/migrations` in the same PR as dependent code
  - After applying migrations, verify no drift with `supabase db diff` - If drift exists, immediately add a corrective migration

#### Required Commands

```bash
# Lint all migrations
sqlfluff lint supabase/migrations

# Auto-fix common issues (optional, review changes)
sqlfluff fix supabase/migrations

# Apply migrations to the linked environment
supabase db push

# Verify no schema drift after push
supabase db diff
```

#### Reviewer Checklist

- [ ] Migration files are present, ordered, and pass `sqlfluff lint`
- [ ] No evidence of direct SQL against environments or local Docker usage
- [ ] Post-push, `supabase db diff` reports no changes

#### ❌ NEVER DO THIS:
- **❌ NEVER** execute SQL directly in Supabase Dashboard SQL Editor
- **❌ NEVER** run raw SQL scripts with psql or other clients  
- **❌ NEVER** make schema changes outside the migration system
- **❌ NEVER** use quick fixes via direct SQL execution
- **❌ NEVER** copy/paste SQL from documentation directly into dashboard

#### ✅ ALWAYS DO THIS:
- **✅ ALWAYS** create migrations with `supabase migration new <descriptive-name>`
- **✅ ALWAYS** write SQL in migration files under `supabase/migrations/`
- **✅ ALWAYS** test locally first with `supabase db reset --local`  
- **✅ ALWAYS** apply to remote with `supabase db push --linked`
- **✅ ALWAYS** verify with `supabase migration list`
- **✅ ALWAYS** use `supabase migration repair` if history gets corrupted

### Why This Rule Exists

**Direct SQL execution breaks:**
1. **Migration History** - Creates drift between local and remote
2. **Team Collaboration** - Others can't reproduce your changes
3. **Deployment Pipeline** - Changes don't propagate to other environments
4. **Version Control** - No record of what changed when
5. **Rollback Capability** - Can't easily undo problematic changes

### Migration Workflow

#### Prerequisites

Install sqlfluff for SQL linting:
```bash
# Option 1: Using pipx (recommended)
pipx install sqlfluff

# Option 2: Using pip
pip install --user sqlfluff

# Option 3: Using brew (macOS)
brew install sqlfluff
```

#### Standard Migration Process

```bash
# 1. Create new migration
supabase migration new "add_avatar_storage_policies"

# 2. Edit the generated file in supabase/migrations/
# Write your SQL changes there

# 3. Lint your SQL (REQUIRED)
sqlfluff lint supabase/migrations
# Fix any issues, optionally use: sqlfluff fix supabase/migrations

# 4. Apply to remote (NO local Docker/supabase start)
supabase db push

# 5. Verify migration was applied AND no drift exists
supabase migration list
supabase db diff  # Must show no changes

# 6. If issues occur, repair history
supabase migration repair --status applied <migration_id>
```

### Emergency Procedures

If migration history gets corrupted:

1. **DO NOT PANIC** - This is fixable
2. **DO NOT** try more direct SQL - This makes it worse  
3. **Use migration repair commands** as shown by CLI
4. **Contact team** if repair commands don't work
5. **Document the issue** for future prevention

### Examples of Changes That Need Migrations

- ✅ Creating tables
- ✅ Adding/dropping columns  
- ✅ Creating/modifying indexes
- ✅ Adding/changing RLS policies
- ✅ Creating/modifying functions
- ✅ Creating/modifying triggers
- ✅ Inserting reference data
- ✅ Changing constraints
- ✅ Modifying data types

---

## 📋 DEVELOPMENT CHECKLIST

### Before Making Database Changes
- [ ] Is this change really necessary?
- [ ] Have I checked existing migrations for similar patterns?
- [ ] Do I have a rollback plan?
- [ ] Will this break existing data?

### During Database Changes  
- [ ] Migration file created with `supabase migration new`
- [ ] SQL written in migration file (not dashboard)
- [ ] Migration tested locally
- [ ] Migration includes proper error handling
- [ ] Breaking changes documented in comments

### After Database Changes
- [ ] Migration applied with `supabase db push --linked`
- [ ] Migration history verified with `supabase migration list`
- [ ] Team notified of schema changes
- [ ] Documentation updated if needed

---

## 🚨 VIOLATION RESPONSE

### If You've Already Used Direct SQL:
1. **Stop immediately** - Don't make more direct changes
2. **Document what was changed** - Write down exactly what SQL was run  
3. **Create a migration** - Put the same SQL in a proper migration file
4. **Use migration repair** - Fix the history with CLI commands
5. **Test thoroughly** - Ensure everything still works
6. **Inform the team** - Let others know about the issue

### Enforcement:
- **First violation**: Warning and education
- **Repeat violations**: Code review blocks
- **Severe cases**: Architecture review required

---

## 📚 Related Documentation

- [Supabase CLI Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Database Migration Best Practices](https://supabase.com/docs/guides/database/migrations)
- [WARP.md - Master Rules](./WARP.md)

---

## 🔄 Examples of Proper Migration Usage

### Creating RLS Policies (Correct Way)
```sql
-- supabase/migrations/20250918143500_setup_avatar_storage_rls.sql

-- Enable RLS on storage.objects
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)  
DROP POLICY IF EXISTS "avatars_upload_policy" ON storage.objects;

-- Create new policy
CREATE POLICY "avatars_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated'
  );
```

### Adding New Table (Correct Way)
```sql
-- supabase/migrations/20250918150000_create_notifications_table.sql

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add policies  
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 📖 Migration Sync Runbook

### When to Create a Migration

- **Always** when making ANY schema change (tables, columns, indexes, constraints, policies, functions, triggers)
- **Always** in the same PR as the code that depends on the schema change
- **Never** make schema changes without a migration file

### Migration Sync Workflow

1. **Create Migration**: `supabase migration new "descriptive_change_name"`
2. **Write SQL**: Add your changes to the generated migration file
3. **Lint SQL**: `sqlfluff lint migrations/` and fix any issues
4. **Apply Migration**: `supabase db push`
5. **Verify Sync**: `supabase db diff` - **MUST** show no changes
6. **Commit**: Include migration file in your PR

### When Schema Drift is Detected

**If `supabase db diff` shows any output:**

1. **STOP** - Do not ignore this
2. **Create corrective migration**: `supabase migration new "fix_schema_drift"`
3. **Add the drift as SQL**: Copy the output from `supabase db diff` into the new migration
4. **Apply immediately**: `supabase db push`
5. **Verify**: `supabase db diff` should now be empty
6. **Document**: Add a comment explaining why the drift occurred

### Emergency Escalation

**If production drift occurs:**

1. **Immediate**: Contact Security Lead + Data Owner
2. **Document**: Record what changes were made outside migration system
3. **Assess Impact**: Determine if rollback is needed
4. **Create Recovery Plan**: Generate migrations to restore consistency
5. **Post-Incident**: Review how drift occurred and prevent recurrence

### Common Mistakes to Avoid

- ❌ Making "quick fixes" directly in Supabase Dashboard
- ❌ Running SQL scripts manually against the database
- ❌ Ignoring drift warnings from `supabase db diff`
- ❌ Pushing code without corresponding migrations
- ❌ Assuming "it's just a small change"

---

**Remember**: Migration files are permanent records. Write them clearly, test them thoroughly, and document breaking changes. Your future self (and your teammates) will thank you.

---

*Last Updated: 2025-09-19*  
*Version: 1.1.0*
