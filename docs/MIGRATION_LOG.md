# MIGRATION_LOG.md

A living log of all database migration attempts, errors, and resolutions. Append new entries at the top. This log is referenced by RULES.md and must be consulted before creating new migrations.

---

## 2025-09-14 – Initialization
- Created MIGRATION_LOG.md
- Rule: Every migration that fails validation on local or remote must be logged here with error text, root cause, and resolution snippet. Link the migration file.

Template:
```
### YYYY-MM-DD – <short title>
Migration: supabase/migrations/<timestamp>_<name>.sql
Environment: local|remote
Error:
<copy exact error text>
Root Cause:
<why this happened>
Resolution:
<SQL or steps applied>
Notes:
<any additional learnings>
```