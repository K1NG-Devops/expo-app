# EduDash Pro Development Rules

This file contains specific development principles and rules that complement the master WARP.md document.

**Hierarchy**: WARP.md > rules.md > .cursorrules > code

---

## 🗄️ DATABASE MANAGEMENT RULES [NONNEGOTIABLE]

### Migration-Only Database Changes

**THE GOLDEN RULE OF DATABASE CHANGES:**
> **ALL database changes must go through the Supabase migration system. No exceptions.**

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

```bash
# 1. Create new migration
supabase migration new "add_avatar_storage_policies"

# 2. Edit the generated file in supabase/migrations/
# Write your SQL changes there

# 3. Test locally (optional but recommended)
supabase db reset --local
supabase db push --local

# 4. Apply to remote
supabase db push --linked

# 5. Verify migration was applied
supabase migration list

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

**Remember**: Migration files are permanent records. Write them clearly, test them thoroughly, and document breaking changes. Your future self (and your teammates) will thank you.

---

*Last Updated: 2025-09-18*  
*Version: 1.0.0*