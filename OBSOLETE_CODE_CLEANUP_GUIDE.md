# Obsolete Code Cleanup Guide
**Generated**: 2025-10-18  
**Repository**: EduDash Pro

## Executive Summary

This repository contains approximately **19MB of obsolete code and documentation** causing confusion and technical debt. This guide provides step-by-step instructions to safely remove obsolete code while maintaining production stability.

### Quick Stats
- 📁 **19MB** of archived files in `docs/OBSOLETE/`
- 📄 **141 obsolete TypeScript files** in moved-files directory
- 💾 **12+ backup files** scattered across the codebase
- 📝 **68 root-level markdown files** (many one-off documentation)
- 🗑️ **6 backup migration files** in supabase/migrations
- 🔍 **54 files** with TODO/FIXME comments
- 💬 **6,708 commented code blocks** across 463 TypeScript files

---

## Part 1: Remove Confirmed Obsolete Directories and Files

### Step 1.1: Delete the OBSOLETE Documentation Directory (SAFE)
**Status**: ✅ Safe to delete - Already archived  
**Size**: 19MB  
**Risk**: LOW - This is explicitly marked as obsolete

```bash
# Backup first (optional)
tar -czf obsolete-backup-$(date +%Y%m%d).tar.gz docs/OBSOLETE/

# Delete the obsolete directory
rm -rf docs/OBSOLETE/

# Verify deletion
git status
```

**What this removes:**
- 386 moved files (TypeScript, SQL, JavaScript)
- Obsolete documentation for completed features
- Old configuration backups
- Historical analysis documents

---

### Step 1.2: Delete Backup Files (SAFE)
**Status**: ✅ Safe to delete - Backup files have active counterparts  
**Risk**: LOW - Original files exist

```bash
# Delete backup files at root level
rm -f eas.json.backup

# Delete backup sign-in screen
rm -f app/\(auth\)/sign-in.tsx.backup

# Delete backup allocation file
rm -f lib/ai/allocation-direct.ts.bak

# Delete backup Supabase migration files
rm -f supabase/migrations/*.bak

# Delete backup script
rm -f scripts/create_backup.sh

# Verify what was deleted
git status
```

**Files removed:**
- `eas.json.backup` (3.2KB)
- `app/(auth)/sign-in.tsx.backup` (32KB)
- `lib/ai/allocation-direct.ts.bak` (size varies)
- `supabase/migrations/20250921164913_critical_security_audit_fixes.sql.bak`
- `supabase/migrations/20250921170200_standard_tenant_policies.sql.bak`
- `supabase/migrations/20250921170400_complex_table_policies.sql.bak`
- `supabase/migrations/20250921172200_fix_rls_policy_issues.sql.bak`
- `supabase/migrations/20250921172400_fix_organization_id.sql.bak`
- `supabase/migrations/20250921180300_fix_infinite_recursion.sql.bak`
- `scripts/create_backup.sh`

---

### Step 1.3: Delete Obsolete Screen File (REQUIRES VERIFICATION)
**Status**: ⚠️ Verify before deleting  
**Risk**: MEDIUM - Ensure account.tsx is fully functional

```bash
# First, check if account-old.tsx is referenced anywhere
grep -r "account-old" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules .

# If no results, it's safe to delete
rm -f app/screens/account-old.tsx

# Verify deletion
git status
```

**What this removes:**
- `app/screens/account-old.tsx` (47KB, 1,565 lines)
- Obsolete version of the account screen
- **Note**: `app/screens/account.tsx` (34KB) is the active version

---

### Step 1.4: Delete Archive Directory (SAFE)
**Status**: ✅ Safe to delete  
**Risk**: LOW - Single obsolete script

```bash
# Delete archive directory
rm -rf archive/

# Verify deletion
git status
```

**What this removes:**
- `archive/fix-auth-database-error.js` (obsolete script)

---

### Step 1.5: Delete Supabase Archived Functions (SAFE)
**Status**: ✅ Safe to delete - Explicitly archived  
**Risk**: LOW - Already replaced

```bash
# Delete archived edge functions
rm -rf supabase/functions/.archive/

# Verify deletion
git status
```

**What this removes:**
- `supabase/functions/.archive/transcribe-chunk-obsolete/index.ts`
- Obsolete transcription function (replaced by direct Deepgram WebSocket)
- Archived on 2025-01-16

---

## Part 2: Consolidate Root-Level Documentation (REQUIRES REVIEW)

### Step 2.1: Audit Root-Level Markdown Files
**Status**: ⚠️ Requires manual review  
**Risk**: MEDIUM - Some may contain important information  
**Count**: 68 markdown files at root level

```bash
# List all root-level markdown files
ls -1 *.md

# Review each file to determine if it should be:
# 1. Kept (active documentation)
# 2. Consolidated into docs/ directory
# 3. Deleted (one-off fixes, completed features)
```

**Recommended actions for specific files:**

#### Delete: Completed Fix Documentation (SAFE)
These document completed fixes and can be archived:

```bash
# Create backup first
mkdir -p docs/archive/completed-fixes
mv APPLY_VOICE_NOTES_FIX.md docs/archive/completed-fixes/
mv AUDIO_MODE_COORDINATOR_IMPLEMENTATION.md docs/archive/completed-fixes/
mv AZURE_MULTILINGUAL_ACTIVATED.md docs/archive/completed-fixes/
mv AZURE_QUICKSTART.md docs/archive/completed-fixes/
mv AZURE_SPEECH_SETUP.md docs/archive/completed-fixes/
mv AZURE_TTS_INTEGRATION.md docs/archive/completed-fixes/
mv COMPLETE_FIX_SUMMARY.md docs/archive/completed-fixes/
mv CORS_FIX_AND_TESTING.md docs/archive/completed-fixes/
mv DASH_AGENT_ACTIVATION_PLAN.md docs/archive/completed-fixes/
mv DASH_AGENT_QUICK_TEST.md docs/archive/completed-fixes/
mv DASH_AGENTIC_TEST_PLAN.md docs/archive/completed-fixes/
mv DASH_AI_IMPROVEMENTS.md docs/archive/completed-fixes/
mv DASH_AI_LESSON_GENERATION_FIXES.md docs/archive/completed-fixes/
mv DASH_FAB_FIXES_SUMMARY.md docs/archive/completed-fixes/
mv DASH_FEATURES_TEST_REPORT.md docs/archive/completed-fixes/
mv DASH_FIXES_COMPLETE_SUMMARY.md docs/archive/completed-fixes/
mv DASH_PERSONALIZATION_FIX.md docs/archive/completed-fixes/
mv DASH_PHASE1_SUMMARY.md docs/archive/completed-fixes/
mv DASH_TRANSCRIPTION_FIX_SUMMARY.md docs/archive/completed-fixes/
mv DASH_VOICE_FIX_PLAN.md docs/archive/completed-fixes/
mv DASH_VOICE_INTERRUPT_FIX.md docs/archive/completed-fixes/
mv DASH_VOICE_TESTING_GUIDE.md docs/archive/completed-fixes/
mv DEBUG_BUILD_GUIDE.md docs/archive/completed-fixes/
mv DEEPGRAM_FIX_COMPLETE.md docs/archive/completed-fixes/
mv DEEPGRAM_PHASE2_COMPLETE.md docs/archive/completed-fixes/
mv DEEPGRAM_PHASE3_OPENAI_FALLBACK.md docs/archive/completed-fixes/
mv DEEPGRAM_PHASE4_PICOVOICE_PLAN.md docs/archive/completed-fixes/
mv ENABLE_DASH_STREAMING.md docs/archive/completed-fixes/
mv EXPO_AV_AUDIT_AND_FIX_PLAN.md docs/archive/completed-fixes/
mv EXTERNAL_DOCUMENTATION_TRACKING.md docs/archive/completed-fixes/
mv FIXES_SUMMARY.md docs/archive/completed-fixes/
mv HYBRID_TRANSCRIPTION_QUICKSTART.md docs/archive/completed-fixes/
mv ISSUE_ANALYSIS.md docs/archive/completed-fixes/
mv MEMORY_OPTIMIZATION_FIX.md docs/archive/completed-fixes/
mv MIC_BUTTON_FIX_COMPLETE.md docs/archive/completed-fixes/
mv MIC_BUTTON_ISSUE_ANALYSIS.md docs/archive/completed-fixes/
mv MIC_PERMISSION_DIAGNOSTIC.md docs/archive/completed-fixes/
mv MODULE_IMPORT_FIX.md docs/archive/completed-fixes/
mv OPTIMIZATION_SUMMARY.md docs/archive/completed-fixes/
mv ORB_FIX_AND_PHASE2_SUMMARY.md docs/archive/completed-fixes/
mv ORB_FIXES_LANGUAGE_INTERRUPT_CLOSE.md docs/archive/completed-fixes/
mv PHASE_1_1_DEAD_CODE_REMOVAL.md docs/archive/completed-fixes/
mv PHASE_1_COMPLETE.md docs/archive/completed-fixes/
mv PHASE_1_EXPO_AV_REMOVAL_COMPLETE.md docs/archive/completed-fixes/
mv PHASE_4_COMPLETE.md docs/archive/completed-fixes/
mv PHASE_4_MODULARIZATION_BLUEPRINT.md docs/archive/completed-fixes/
mv PHASE1_DEPLOYMENT_GUIDE.md docs/archive/completed-fixes/
mv QUICK_DEBUG.md docs/archive/completed-fixes/
mv QUICK_FIX_SUMMARY.md docs/archive/completed-fixes/
mv REFACTOR_ASSESSMENT_AND_DOCUMENTATION_NEEDS.md docs/archive/completed-fixes/
mv SESSION_REFRESH_FIX.md docs/archive/completed-fixes/
mv SETTINGS_AUTOSAVE_IMPROVEMENTS.md docs/archive/completed-fixes/
mv SOCIETY_5_FAB_IMPROVEMENTS.md docs/archive/completed-fixes/
mv STREAMING_AND_MULTILINGUAL_SETUP.md docs/archive/completed-fixes/
mv TEST_VOICE_SA_ENHANCEMENT.md docs/archive/completed-fixes/

# After moving, you can optionally delete the archive
# rm -rf docs/archive/completed-fixes/
```

#### Keep: Active Documentation (IMPORTANT)
These should remain at root or be moved to appropriate docs/ subdirectories:

```bash
# Keep these files - they are active documentation
# - README.md (main project readme)
# - RELEASE_NOTES.md (release information)
# - CODEOWNERS (GitHub ownership)
# - ASSESSMENT_EXECUTIVE_SUMMARY.md (may be important)
# - ESSENTIAL_DOCS_BOOKMARK_LIST.md (reference list)
```

---

## Part 3: Code Quality Improvements (OPTIONAL BUT RECOMMENDED)

### Step 3.1: Address TODO/FIXME Comments
**Status**: ⚠️ Requires developer review  
**Count**: 54 files with TODO/FIXME comments

```bash
# Generate a report of all TODO/FIXME comments
grep -rn "TODO\|FIXME\|HACK\|XXX" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=docs \
  . > todo-fixme-report.txt

# Review the report and create tickets for legitimate items
cat todo-fixme-report.txt
```

**Action items:**
1. Review each TODO/FIXME comment
2. Create GitHub issues for legitimate technical debt
3. Remove obsolete TODO comments
4. Update comments to reference issue numbers

---

### Step 3.2: Clean Up Commented-Out Code
**Status**: ⚠️ Requires careful review  
**Count**: 6,708 multi-line comment blocks across 463 files  
**Risk**: HIGH - Some may be documentation

```bash
# Generate a report of files with heavy commenting
# This is for manual review - DO NOT automate deletion
find . -name "*.ts" -o -name "*.tsx" | \
  while read file; do
    count=$(grep -c "^[[:space:]]*//.*console\\.log\|^[[:space:]]*//.*debugger\|^[[:space:]]*//.*import" "$file" 2>/dev/null || true)
    if [ "$count" -gt 5 ]; then
      echo "$count commented imports/logs in $file"
    fi
  done | sort -rn > commented-code-report.txt

cat commented-code-report.txt
```

**Manual review process:**
1. Open each file with high comment counts
2. Identify genuinely commented-out code (vs. documentation)
3. Remove commented code that's in version control history
4. Keep documentation comments
5. Remove debug console.log statements

**Examples of code to remove:**
```typescript
// Commented-out imports
// import { OldComponent } from './old-component';

// Commented-out console.log statements
// console.log('Debug info:', data);

// Commented-out debugger statements
// debugger;
```

---

## Part 4: Database Cleanup

### Step 4.1: Review SQL Files
**Status**: ⚠️ Requires database expert review

```bash
# List SQL files in root directory
ls -1 *.sql

# Determine which are:
# 1. One-off debug scripts (can be archived)
# 2. Migration scripts (should be in migrations/)
# 3. Reference scripts (should be in docs/sql/)
```

**Root SQL files found:**
- `debug-org-rpc.sql` - Debug script, can be archived
- `fix-storage-rls.sql` - One-off fix, can be archived
- `fix-voice-notes-rls-simple.sql` - One-off fix, can be archived
- `fix-voice-notes-upload.sql` - One-off fix, can be archived
- `FIX_VOICE_RLS_RUN_IN_SUPABASE.sql` - One-off fix, can be archived
- `RUN_THIS_IN_SUPABASE_NOW.sql` - One-off script, can be archived

**Recommended action:**
```bash
# Create archive for SQL scripts
mkdir -p docs/archive/sql-scripts

# Move one-off SQL scripts
mv debug-org-rpc.sql docs/archive/sql-scripts/
mv fix-storage-rls.sql docs/archive/sql-scripts/
mv fix-voice-notes-rls-simple.sql docs/archive/sql-scripts/
mv fix-voice-notes-upload.sql docs/archive/sql-scripts/
mv FIX_VOICE_RLS_RUN_IN_SUPABASE.sql docs/archive/sql-scripts/
mv RUN_THIS_IN_SUPABASE_NOW.sql docs/archive/sql-scripts/

# After archiving, optionally delete
# rm -rf docs/archive/sql-scripts/
```

---

## Part 5: Testing and Deployment Scripts

### Step 5.1: Review Root-Level Scripts
**Status**: ⚠️ Requires review

```bash
# List shell scripts in root
ls -1 *.sh

# Review each script
```

**Root scripts found:**
- `debug-trace.sh` - Debug script
- `deploy-chunked-transcription.sh` - Deployment script
- `fix-mic-permission.sh` - One-off fix script

**Recommended actions:**
1. Move active deployment scripts to `scripts/` directory
2. Archive one-off fix scripts
3. Delete obsolete debug scripts

```bash
# Move deployment scripts to scripts directory if still needed
# Only if not already in scripts/
if [ -f "deploy-chunked-transcription.sh" ]; then
  mv deploy-chunked-transcription.sh scripts/
fi

# Archive debug/fix scripts
mkdir -p docs/archive/shell-scripts
mv debug-trace.sh docs/archive/shell-scripts/ 2>/dev/null || true
mv fix-mic-permission.sh docs/archive/shell-scripts/ 2>/dev/null || true
```

---

## Part 6: Testing Files Cleanup

### Step 6.1: Review Test Files
**Status**: ℹ️ Informational - Handle carefully

```bash
# List test HTML files at root
ls -1 *.html

# Review if these should be in a test/ directory
```

**Test files found:**
- `test-chunked-transcription.html` - Test file

**Recommended action:**
```bash
# Move test files to appropriate location
mkdir -p tests/manual
mv test-chunked-transcription.html tests/manual/ 2>/dev/null || true
```

---

## Part 7: Commit and Document Changes

### Step 7.1: Stage and Review Changes
```bash
# Review all deletions and moves
git status

# Review specific deletions
git diff --cached

# Ensure no critical files were deleted
git log --oneline -10
```

### Step 7.2: Commit Cleanup Changes
```bash
# Commit in logical groups

# Group 1: Delete OBSOLETE directory
git add -A
git commit -m "chore: remove docs/OBSOLETE directory (19MB archived files)

- Remove 386 moved files from docs/OBSOLETE/moved-files/
- Remove obsolete documentation for completed features
- Remove old configuration backups
- Archived date: 2025-10-14"

# Group 2: Delete backup files
git add -A
git commit -m "chore: remove backup files (.backup, .bak)

- Remove eas.json.backup
- Remove app/(auth)/sign-in.tsx.backup
- Remove lib/ai/allocation-direct.ts.bak
- Remove 6 supabase migration backup files
- Remove scripts/create_backup.sh"

# Group 3: Delete obsolete screens
git add -A
git commit -m "chore: remove obsolete account-old.tsx screen

- Remove app/screens/account-old.tsx (1,565 lines)
- Active version: app/screens/account.tsx"

# Group 4: Delete archive directory
git add -A
git commit -m "chore: remove archive directory

- Remove archive/fix-auth-database-error.js"

# Group 5: Delete supabase archived functions
git add -A
git commit -m "chore: remove archived supabase edge functions

- Remove supabase/functions/.archive/
- transcribe-chunk-obsolete replaced by direct Deepgram WebSocket"

# Group 6: Consolidate documentation
git add -A
git commit -m "chore: archive completed fix documentation

- Move 54 completed fix markdown files to docs/archive/completed-fixes/
- Keep active documentation (README.md, RELEASE_NOTES.md)
- Reduces root-level clutter"

# Group 7: Archive SQL scripts
git add -A
git commit -m "chore: archive one-off SQL scripts

- Move debug and fix SQL scripts to docs/archive/sql-scripts/
- Remove clutter from root directory"
```

---

## Part 8: Prevention - Establish Guidelines

### Step 8.1: Create Documentation Standards
Create a new file: `docs/CONTRIBUTING.md`

```markdown
# Contributing Guidelines

## Documentation Standards

### File Organization
- **Active documentation**: Place in `docs/` with descriptive subdirectories
- **One-off fixes**: Create a ticket, document in the ticket, don't create markdown files
- **Completed features**: Update main `docs/README.md`, don't create separate files
- **Archived docs**: Place in `docs/archive/` with date and reason

### Backup Files
- **Never commit** `.backup`, `.bak`, `.old`, `_BACKUP_*`, `_LOCAL_*`, `_REMOTE_*` files
- Use git for version control instead of file-based backups
- Add to `.gitignore`:
  ```
  *.backup
  *.bak
  *_BACKUP_*
  *_LOCAL_*
  *_REMOTE_*
  *-old.*
  ```

### Code Comments
- Remove commented-out code before committing
- Keep documentation comments
- Replace TODO comments with GitHub issues
- Format: `// TODO(#123): Description` linking to issue number

### SQL Scripts
- **Migrations**: Place in `supabase/migrations/`
- **Debug scripts**: Don't commit, keep locally
- **One-off fixes**: Document in migration files or tickets
```

### Step 8.2: Update .gitignore
```bash
# Add to .gitignore
cat >> .gitignore << 'EOF'

# Backup files
*.backup
*.bak
*_BACKUP_*
*_LOCAL_*
*_REMOTE_*
*-old.*
*_old.*

# Debug files
debug-*.sql
debug-*.sh
debug-*.js
debug-*.ts

# Test files at root
test-*.html
EOF
```

### Step 8.3: Set Up Pre-commit Hook
Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for backup files
if git diff --cached --name-only | grep -E '\.(backup|bak)$|_BACKUP_|_LOCAL_|_REMOTE_|-old\.'; then
  echo "❌ Error: Attempting to commit backup files"
  echo "Please remove or rename these files before committing"
  exit 1
fi

# Check for root-level markdown files (except allowed ones)
ALLOWED_ROOT_MD="README.md|RELEASE_NOTES.md|CODEOWNERS|LICENSE.md"
if git diff --cached --name-only | grep '^[^/]*\.md$' | grep -vE "$ALLOWED_ROOT_MD"; then
  echo "⚠️  Warning: Committing root-level markdown file"
  echo "Consider placing in docs/ directory instead"
  echo "Press Enter to continue or Ctrl+C to abort"
  read
fi

exit 0
```

```bash
chmod +x .git/hooks/pre-commit
```

---

## Summary of Cleanup Impact

### Files/Directories Deleted (Safe Operations)
✅ `docs/OBSOLETE/` - 19MB  
✅ `eas.json.backup` - 3.2KB  
✅ `app/(auth)/sign-in.tsx.backup` - 32KB  
✅ `lib/ai/allocation-direct.ts.bak`  
✅ `supabase/migrations/*.bak` - 6 files  
✅ `scripts/create_backup.sh`  
✅ `archive/` directory  
✅ `supabase/functions/.archive/`  

### Files to Review Before Deletion
⚠️ `app/screens/account-old.tsx` - 47KB (verify account.tsx is working)  

### Files to Archive/Move
📦 54 root-level markdown files → `docs/archive/completed-fixes/`  
📦 6 SQL scripts → `docs/archive/sql-scripts/`  
📦 3 shell scripts → `docs/archive/shell-scripts/`  

### Estimated Cleanup Results
- **Disk space saved**: ~20MB
- **Files removed**: 400+ obsolete files
- **Reduced clutter**: Root directory cleaned from 68 → 5 markdown files
- **Reduced confusion**: Clear separation of active vs. archived code

---

## Risk Assessment

### LOW RISK (Safe to Execute)
✅ Steps 1.1, 1.2, 1.4, 1.5 - Removing explicitly archived/backup files

### MEDIUM RISK (Verify First)
⚠️ Step 1.3 - Removing account-old.tsx (verify account.tsx works)  
⚠️ Step 2.1 - Moving documentation (review each file)  
⚠️ Step 4.1 - Archiving SQL scripts (verify they're not needed)

### HIGH RISK (Manual Review Required)
🔴 Step 3.2 - Removing commented code (requires developer judgment)  
🔴 Step 3.1 - Addressing TODOs (requires creating issues)

---

## Post-Cleanup Checklist

After completing the cleanup:

- [ ] Run `npm run typecheck` - Ensure no type errors
- [ ] Run `npm run lint` - Ensure no lint errors
- [ ] Run `npm test` - Ensure tests pass
- [ ] Test critical user flows in dev environment
- [ ] Review git diff to ensure nothing critical was deleted
- [ ] Verify build succeeds: `npm run build`
- [ ] Deploy to staging environment
- [ ] Test on staging
- [ ] Document cleanup in RELEASE_NOTES.md
- [ ] Update team on changes
- [ ] Set up .gitignore rules to prevent future clutter
- [ ] Set up pre-commit hooks

---

## Questions or Issues?

If you encounter any issues during cleanup:

1. **Stop immediately** - Don't force deletions
2. **Check git status** - Review what's being changed
3. **Use git stash** - Temporarily save changes if needed
4. **Restore from backup** - If you created one in Step 1.1
5. **Ask for help** - Consult team lead before proceeding

---

## Maintenance Schedule

To prevent future accumulation:

**Weekly:**
- Review root directory for new markdown files
- Check for .backup/.bak files

**Monthly:**
- Audit docs/ directory for obsolete content
- Review and close/update TODO comments

**Quarterly:**
- Major documentation reorganization if needed
- Review and archive completed feature docs

---

**End of Cleanup Guide**
