# 🚨 NEW SQL MIGRATION RULES - IMMEDIATE ACTION REQUIRED

## 📅 **Effective Immediately**
All database changes must now follow the new SQL migration rules outlined in WARP.md and rules.md.

## 🔒 **NEW NON-NEGOTIABLES**

### ✅ **REQUIRED for all SQL migrations:**
1. **SQLFluff linting** - All migrations must pass `sqlfluff lint migrations/` before push
2. **Remote-only pushes** - Use `supabase db push` exclusively, NO direct SQL
3. **No local Docker** - Remote development only (controlled exceptions require approval) 
4. **Migration sync** - `supabase db diff` must show no changes after every push

## 🛠️ **SETUP REQUIRED (One-time)**

Install SQLFluff:
```bash
# Choose one:
pipx install sqlfluff              # Recommended
pip install --user sqlfluff       # Alternative
brew install sqlfluff             # macOS only
```

Install pre-commit (optional but recommended):
```bash
pip install pre-commit
pre-commit install
```

## 📋 **NEW WORKFLOW (Use immediately)**

```bash
# 1. Create migration
supabase migration new "your_descriptive_change"

# 2. Edit the generated migration file in migrations/

# 3. Lint your SQL (REQUIRED)
sqlfluff lint migrations/
# Fix any violations, optionally: sqlfluff fix migrations/

# 4. Apply migration 
supabase db push

# 5. Verify no drift (CRITICAL)
supabase db diff
# Must show NO OUTPUT - if it shows changes, create corrective migration

# 6. Commit and create PR
```

## 🚫 **FORBIDDEN (Immediate Stop)**

- ❌ Direct SQL in Supabase Studio SQL editor
- ❌ Running psql or GUI tools against any environment  
- ❌ `supabase start` / local Docker (without approval)
- ❌ Pushing migrations without SQLFluff lint
- ❌ Ignoring output from `supabase db diff`

## 📖 **Documentation Updated**

- **[WARP.md](./WARP.md)** - Updated non-negotiables and development workflow
- **[rules.md](./rules.md)** - New SQL linting policy and migration runbook  
- **[.sqlfluff](./.sqlfluff)** - Linting configuration
- **[.pre-commit-config.yaml](./.pre-commit-config.yaml)** - Pre-commit hooks

## 🛡️ **CI Enforcement**

- ✅ PR checks now validate SQLFluff compliance
- ⚠️ Non-compliant PRs will be automatically blocked
- 📊 CI will check for schema drift after merges

## 🐳 **Docker Policy Update**

**Default**: Remote-first development only  
**Exception**: Local Docker allowed ONLY for complex migrations requiring multiple iterations
- Must run `./scripts/check-docker-resources.sh` before starting
- Must `supabase stop` immediately after session
- Limited to 4-hour sessions, 1 developer at a time
- Requires final sync with remote

## ⚡ **Immediate Actions Required**

### For Current Work:
1. **Stop any direct SQL** - Create migrations instead
2. **Install SQLFluff** - Use commands above  
3. **Lint existing changes** - Fix any violations
4. **Verify sync** - Run `supabase db diff` on current branches

### For New Work:
1. **Use new workflow** - Follow the 6-step process above
2. **Test setup** - Create a small test migration to verify tooling
3. **Ask questions** - Better to clarify than violate rules

## 📞 **Questions & Support**

- **WARP.md violations**: Ask before proceeding
- **SQLFluff issues**: Check `.sqlfluff` config or ask for help
- **Migration problems**: Use the runbook in rules.md
- **Emergency drift**: Follow escalation in rules.md

## 🎯 **Why These Rules?**

- **Database integrity** - Prevents production outages from schema drift
- **Team collaboration** - Everyone uses the same migration process
- **Code quality** - Consistent, linted SQL across the project  
- **Deployment safety** - All changes tracked and reversible

---

**🚀 Let's maintain our high standards for database management!**

*These rules are effective immediately. Please confirm receipt and setup completion.*