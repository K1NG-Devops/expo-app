# EduDash Pro RLS Manifest Quick Start

## 🎯 What This System Does

The manifest system **generates safe, non-breaking RLS policies** from templates instead of writing SQL manually. This ensures:
- ✅ Consistent multi-tenant isolation
- ✅ WARP.md compliance (proper migration workflow)
- ✅ Educational platform security patterns
- ✅ Performance optimization

## 🚀 Quick Team Workflow

### 1. Adding a New Table (Most Common Task)

```yaml
# Add to policy_manifest_enhanced.yaml
- table: your_new_table
  template: org_scoped              # Choose template based on access pattern
  tenant_column: preschool_id       # Column that isolates tenants
  write_capability: manage_feature  # Required capability for writes
  priority: medium                  # critical | high | medium | low
  description: "Brief description"  # What this table stores
  schema: public                    # Usually 'public'
  policy_roles: authenticated       # Usually 'authenticated'
```

### 2. Generate Migration (WARP.md Compliant)

```bash
# Generate policies for a specific phase
node scripts/security/generate_policies.js --phase=critical

# This will:
# 1. Create migration via: supabase migration new rls-policies-critical
# 2. Generate SQL policies from templates
# 3. Write to proper migration file
```

### 3. Apply Safely

```bash
# Always lint first (WARP.md requirement)
sqlfluff lint supabase/migrations

# Apply to remote database
supabase db push

# Verify no drift (should show no changes)
supabase db diff
```

## 📋 Available Templates

### For Most Tables: `org_scoped`
```yaml
template: org_scoped
tenant_column: preschool_id  # or organization_id
```
**Use for**: Classes, assignments, announcements, reports

### For User Data: `user_scoped`
```yaml
template: user_scoped
user_column: id  # or user_id depending on your schema
```
**Use for**: Profiles, preferences, notifications

### For Payments: `parent_scoped` 
```yaml
template: parent_scoped
parent_column: parent_id
tenant_column: preschool_id
```
**Use for**: Payment records, invoices, financial data

### For Complex Relationships: `class_scoped`
```yaml
template: class_scoped
class_column: class_id
tenant_column: preschool_id
```
**Use for**: Assignment submissions, attendance, class-specific content

### For System Config: `global_config`
```yaml
template: global_config
```
**Use for**: Billing plans, system settings (read by all, write by superadmin)

## 🎯 Educational Platform Patterns

### Student Assignment Access
```yaml
- table: homework_submissions
  template: class_scoped
  class_column: class_id
  tenant_column: preschool_id
  write_capability: submit_assignments
  priority: medium
```

### Parent Financial Data
```yaml
- table: tuition_payments
  template: parent_scoped
  parent_column: parent_id
  tenant_column: preschool_id
  write_capability: manage_payments
  priority: high
```

### Teacher Resources
```yaml
- table: lesson_plans
  template: org_scoped
  tenant_column: preschool_id
  write_capability: manage_lessons
  priority: medium
```

## ⚡ Performance Notes

### Always Include These Columns
- `tenant_column` (preschool_id/organization_id) - **Critical for isolation**
- `created_at` - Common query pattern
- `updated_at` - Audit trail

### Template Complexity Guide
- **Low**: `org_scoped`, `global_config` - Simple tenant filtering
- **Medium**: `user_scoped`, `parent_scoped` - Involves user relationships  
- **High**: `class_scoped`, `user_selective` - Complex role-based logic

## 🛡️ Security Checklist

### Before Adding a Table
- [ ] Does this table contain student data? (Use appropriate template)
- [ ] What's the tenant isolation column? (Usually `preschool_id`)
- [ ] Who should read this data? (Choose template accordingly)
- [ ] What capability is needed for writes? (Define in manifest)

### Template Selection Decision Tree
```
Student/Child data? 
  → Yes: Use class_scoped or parent_scoped
  → No: Continue...

Personal user data?
  → Yes: Use user_scoped
  → No: Continue...

Organization-wide data?
  → Yes: Use org_scoped
  → No: Continue...

System configuration?
  → Yes: Use global_config
```

## 🚨 Common Mistakes to Avoid

### ❌ Wrong Column Names
```yaml
# Wrong - hardcoded column that may not exist
user_column: user_id

# Right - check your actual schema
user_column: id  # if your table uses 'id' for users
```

### ❌ Missing Template Variables
```yaml
# Wrong - no column specified for user_scoped template
template: user_scoped

# Right - specify the user column
template: user_scoped
user_column: profile_id
```

### ❌ Wrong Priority Assignment
```yaml
# Wrong - payment data as low priority
- table: parent_payments
  priority: low

# Right - financial data is high priority
- table: parent_payments  
  priority: high
```

## 🔧 Troubleshooting

### Generator Fails
1. Check YAML syntax: `node -e "console.log(require('js-yaml').load(require('fs').readFileSync('policy_manifest_enhanced.yaml', 'utf8')))"`
2. Verify template exists in templates section
3. Ensure all required variables are provided

### Policies Don't Work
1. Check `app_auth.*` functions exist: Run latest auth helpers migration
2. Verify column names match your actual schema
3. Test policies with different user roles

### Performance Issues
1. Check indexes are created for tenant columns
2. Monitor policy execution time with EXPLAIN ANALYZE
3. Consider simpler templates for high-volume tables

## 📞 Need Help?

1. **New to manifests?** Read `docs/security/manifest-development-guide.md`
2. **Policy not working?** Check template variables match your schema
3. **Performance issues?** Review required indexes in template
4. **Security questions?** Verify WARP.md Non-negotiables compliance

---

Remember: This system **generates policies**, it doesn't replace them manually. Always use the generator to ensure consistency and WARP.md compliance.