# K-12 Organization Support Implementation Plan

**Project**: EduDash Pro - Preschool to K-12 Organization Support  
**Date**: 2025-09-18  
**Status**: Planning Phase  
**WARP.md Compliance**: Required for all steps

## 🎯 Overview

This document outlines the comprehensive plan to extend EduDash Pro from preschool-only support to include K-12 schools while maintaining full backward compatibility and adhering to all WARP.md non-negotiables.

### Current Situation
- `preschools` table serves as the tenant anchor
- All organizations currently assumed to be preschools
- Strong RLS policies exist using `preschool_id` for tenant isolation
- Need to add K-12 support without breaking existing functionality

### Strategic Approach
- **Backward-compatible extension**: Keep existing `preschools` table structure
- **Additive migrations only**: No destructive changes
- **Tenant isolation maintained**: All new tables follow RLS patterns
- **Feature gating**: Organization type determines available features

---

## 📋 Implementation Tasks

### ✅ Task 1: Governance, Approvals, and Guardrails (WARP.md Compliance)

**Objective**: Establish proper governance framework before making any changes

**Requirements**:
- **Non-negotiables**: Use Supabase migrations only; no SQL in Dashboard; no production resets; keep RLS intact; no mock/seed demo data; privacy and child safety first
- **Approvals required per WARP.md**: Data Owner + Engineering Lead (schema), Security Lead (RLS)
- Create a long-lived feature branch: `feature/k12-organization-support`
- Define change window and rollback owner; document risks

**Deliverables**:
- [ ] Feature branch created
- [ ] Risk assessment document
- [ ] Approval matrix populated
- [ ] Change window scheduled

---

### ✅ Task 2: Baseline Schema and RLS Audit (Read-Only)

**Objective**: Inventory all database objects and dependencies

**Activities**:
- Inventory all objects referencing `public.preschools` and all tables depending on `preschool_id` for tenant isolation
- Export current schema and policies locally (read-only) to plan updates

**Queries to run**:
```sql
-- List FKs to preschools
SELECT
  conrelid::regclass as table_name,
  a.attname as column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE confrelid = 'public.preschools'::regclass AND contype = 'f'
ORDER BY 1,2;

-- List RLS policies touching preschool_id
SELECT * FROM pg_policies WHERE schemaname='public';

-- List functions referencing preschools
SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_definition ILIKE '%preschools%';
```

**Deliverables**:
- [ ] `docs/tenancy-audit.md` created
- [ ] Dependency map documented
- [ ] RLS policy inventory complete
- [ ] Function dependency list

---

### ✅ Task 3: Target Data Model (Backward-Compatible)

**Objective**: Design the new data model without breaking existing functionality

**Design Principles**:
- Keep `public.preschools` as the canonical tenant table for backward compatibility
- Do NOT rename (existing code uses `preschool_id` for RLS)
- Introduce organization typing and education phases while preserving current behavior

**New Data Types**:
- `organization_type` enum: `preschool | k12_school | mixed`
- `education_phase` enum: `ecd | foundation | intermediate | senior | fetc`
- `grade_level_code` enum: `ecd_grade_000, ecd_grade_00, grade_r, grade_1 … grade_12`
- `department_type` enum: `foundation_phase | intermediate_phase | senior_phase | fetc | academics | support | sports | arts | admin`

**New Tables**:
- `organization_grade_offerings` (tenant → grades)
- `departments` (tenant-scoped)
- `subjects` (tenant-scoped)

**Compatibility Layer**:
- Views and functions to let new code speak "organization" without breaking "preschool" references

**Deliverables**:
- [ ] Data model design document
- [ ] ERD created
- [ ] Migration sequence planned

---

### ✅ Task 4: Migration M1 - Create Enums (Types Only; Safe, Fast)

**Objective**: Add new enum types without affecting existing data

**Commands**:
```bash
supabase migration new m1_org_enums
```

**Migration SQL**:
```sql
-- Organization types
CREATE TYPE public.organization_type AS ENUM ('preschool','k12_school','mixed');

-- Education phases aligned with South African system
CREATE TYPE public.education_phase AS ENUM ('ecd','foundation','intermediate','senior','fetc');

-- SA-aligned levels including ECD pathway
CREATE TYPE public.grade_level_code AS ENUM (
  'ecd_grade_000','ecd_grade_00','grade_r',
  'grade_1','grade_2','grade_3','grade_4','grade_5','grade_6',
  'grade_7','grade_8','grade_9','grade_10','grade_11','grade_12'
);

-- Department types
CREATE TYPE public.department_type AS ENUM (
  'foundation_phase','intermediate_phase','senior_phase','fetc',
  'academics','support','sports','arts','admin'
);

-- Add helpful comments
COMMENT ON TYPE public.organization_type IS 'Type of educational organization: preschool, K-12 school, or mixed';
COMMENT ON TYPE public.education_phase IS 'South African education phases';
COMMENT ON TYPE public.grade_level_code IS 'Grade levels from ECD to Grade 12';
COMMENT ON TYPE public.department_type IS 'Department categories for K-12 schools';
```

**Notes**:
- Types are immutable forward; adding new values later is append-only
- This migration has zero impact on existing data

**Deliverables**:
- [ ] Migration file created
- [ ] Migration tested locally
- [ ] Migration applied to staging

---

### ✅ Task 5: Migration M2 - Alter Preschools (Add Org Typing and Settings)

**Objective**: Add organization typing columns to existing preschools table

**Commands**:
```bash
supabase migration new m2_preschools_add_org_type
```

**Migration SQL**:
```sql
-- Add organization_type column with safe default
ALTER TABLE public.preschools
  ADD COLUMN IF NOT EXISTS organization_type public.organization_type;

-- Backfill existing records as preschools
UPDATE public.preschools
  SET organization_type = 'preschool'
WHERE organization_type IS NULL;

-- Make column required with default
ALTER TABLE public.preschools
  ALTER COLUMN organization_type SET NOT NULL,
  ALTER COLUMN organization_type SET DEFAULT 'preschool';

-- Add education phases array
ALTER TABLE public.preschools
  ADD COLUMN IF NOT EXISTS education_phases public.education_phase[];

-- Default phases for legacy preschools: ECD only
UPDATE public.preschools
  SET education_phases = ARRAY['ecd']::public.education_phase[]
WHERE education_phases IS NULL AND organization_type = 'preschool';

-- Add K-12 specific settings
ALTER TABLE public.preschools
  ADD COLUMN IF NOT EXISTS k12_settings JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Add helpful comments
COMMENT ON COLUMN public.preschools.organization_type IS
  'Tenant type: preschool, k12_school, or mixed. Backward compatible default is preschool.';
COMMENT ON COLUMN public.preschools.education_phases IS
  'List of education phases served by this tenant.';
COMMENT ON COLUMN public.preschools.k12_settings IS
  'Type-specific settings (readonly unless tenant type includes k12).';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_preschools_organization_type 
  ON public.preschools(organization_type);
```

**Safety Notes**:
- Do NOT change primary keys or existing constraints
- Preserve all existing data
- All changes are additive only

**Deliverables**:
- [ ] Migration file created
- [ ] Migration tested locally
- [ ] Data integrity verified
- [ ] Migration applied to staging

---

### ✅ Task 6: Migration M3 - Organization Grade Offerings (Tenant → Grades)

**Objective**: Create tenant-scoped grade offerings table

**Commands**:
```bash
supabase migration new m3_org_grade_offerings
```

**Migration SQL**:
```sql
-- Create grade offerings table
CREATE TABLE IF NOT EXISTS public.organization_grade_offerings (
  id BIGSERIAL PRIMARY KEY,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  grade_level public.grade_level_code NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE (preschool_id, grade_level)
);

-- Enable RLS
ALTER TABLE public.organization_grade_offerings ENABLE ROW LEVEL SECURITY;

-- RLS: tenant isolation by preschool_id (SELECT)
CREATE POLICY org_grade_offerings_tenant_select
  ON public.organization_grade_offerings
  FOR SELECT
  USING (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  );

-- RLS: tenant isolation (ALL operations)
CREATE POLICY org_grade_offerings_tenant_mod
  ON public.organization_grade_offerings
  FOR ALL
  USING (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  )
  WITH CHECK (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_org_grade_offerings_preschool
  ON public.organization_grade_offerings(preschool_id);
CREATE INDEX IF NOT EXISTS idx_org_grade_offerings_grade
  ON public.organization_grade_offerings(grade_level);

-- Add helpful comment
COMMENT ON TABLE public.organization_grade_offerings IS
  'Tenant-specific grade levels offered by each organization';
```

**Safety Notes**:
- No automatic backfill to avoid assumptions
- UI will drive grade selection for K-12
- Full RLS protection maintained

**Deliverables**:
- [ ] Migration file created
- [ ] RLS policies tested
- [ ] Migration applied to staging

---

### ✅ Task 7: Migration M4 - Departments and Subjects (Tenant-Scoped Catalogs)

**Objective**: Create tenant-scoped department and subject management

**Commands**:
```bash
supabase migration new m4_departments_subjects
```

**Migration SQL**:
```sql
-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  department_type public.department_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (preschool_id, name)
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (preschool_id, name)
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- RLS: tenant isolation for departments
CREATE POLICY departments_tenant
  ON public.departments FOR ALL
  USING (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  )
  WITH CHECK (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  );

-- RLS: tenant isolation for subjects
CREATE POLICY subjects_tenant
  ON public.subjects FOR ALL
  USING (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  )
  WITH CHECK (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_departments_preschool ON public.departments(preschool_id);
CREATE INDEX IF NOT EXISTS idx_subjects_preschool ON public.subjects(preschool_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON public.subjects(department_id);

-- Add helpful comments
COMMENT ON TABLE public.departments IS 'Tenant-specific departments for K-12 schools';
COMMENT ON TABLE public.subjects IS 'Tenant-specific subjects within departments';
```

**Safety Notes**:
- Keep catalogs tenant-specific to avoid seeding "global" data
- Full RLS protection on all operations

**Deliverables**:
- [ ] Migration file created
- [ ] RLS policies verified
- [ ] Migration applied to staging

---

### ✅ Task 8: Migration M5 - Compatibility Views and Helper Functions

**Objective**: Create compatibility layer for seamless integration

**Commands**:
```bash
supabase migration new m5_org_views_functions
```

**Migration SQL**:
```sql
-- Unified read view: lets app read "organizations" without renaming table
CREATE OR REPLACE VIEW public.organizations_v1 AS
  SELECT
    p.*,
    p.id AS organization_id,
    p.id AS preschool_id -- explicit alias for compatibility
  FROM public.preschools p;

-- Helper function: get organization type
CREATE OR REPLACE FUNCTION public.get_organization_type(school_id UUID)
RETURNS public.organization_type
LANGUAGE SQL STABLE AS $$
  SELECT organization_type FROM public.preschools WHERE id = school_id
$$;

-- Helper function: check if K-12
CREATE OR REPLACE FUNCTION public.is_k12(school_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT organization_type IN ('k12_school','mixed')
  FROM public.preschools WHERE id = school_id
$$;

-- Helper function: get available grades
CREATE OR REPLACE FUNCTION public.available_grades(school_id UUID)
RETURNS SETOF public.grade_level_code
LANGUAGE SQL STABLE AS $$
  SELECT grade_level
  FROM public.organization_grade_offerings
  WHERE preschool_id = school_id
  ORDER BY 1
$$;

-- Helper function: get grade display name
CREATE OR REPLACE FUNCTION public.grade_display_name(grade_code public.grade_level_code)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE grade_code
    WHEN 'ecd_grade_000' THEN 'ECD Grade 000'
    WHEN 'ecd_grade_00' THEN 'ECD Grade 00'
    WHEN 'grade_r' THEN 'Grade R'
    WHEN 'grade_1' THEN 'Grade 1'
    WHEN 'grade_2' THEN 'Grade 2'
    WHEN 'grade_3' THEN 'Grade 3'
    WHEN 'grade_4' THEN 'Grade 4'
    WHEN 'grade_5' THEN 'Grade 5'
    WHEN 'grade_6' THEN 'Grade 6'
    WHEN 'grade_7' THEN 'Grade 7'
    WHEN 'grade_8' THEN 'Grade 8'
    WHEN 'grade_9' THEN 'Grade 9'
    WHEN 'grade_10' THEN 'Grade 10'
    WHEN 'grade_11' THEN 'Grade 11'
    WHEN 'grade_12' THEN 'Grade 12'
    ELSE grade_code::TEXT
  END
$$;

-- Add helpful comments
COMMENT ON VIEW public.organizations_v1 IS 'Compatibility view for organization access';
COMMENT ON FUNCTION public.get_organization_type IS 'Get the organization type for a school';
COMMENT ON FUNCTION public.is_k12 IS 'Check if organization supports K-12';
COMMENT ON FUNCTION public.available_grades IS 'Get all grade levels for an organization';
COMMENT ON FUNCTION public.grade_display_name IS 'Get human-readable grade name';
```

**Safety Notes**:
- All functions are STABLE and respect RLS (no SECURITY DEFINER)
- View provides backward compatibility without breaking changes

**Deliverables**:
- [ ] Migration file created
- [ ] Functions tested
- [ ] Migration applied to staging

---

### ✅ Task 9: RLS Service-Role Allowances and Audits

**Objective**: Add service role policies for server-side operations

**Activities**:
- Add service role policies where needed for server-side maintenance (Edge Functions)
- Verify no existing policies are weakened
- Ensure audit trail triggers include new tables

**Migration SQL**:
```sql
-- Service role policy for grade offerings
CREATE POLICY org_grade_offerings_service
  ON public.organization_grade_offerings
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role policy for departments
CREATE POLICY departments_service
  ON public.departments
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role policy for subjects
CREATE POLICY subjects_service
  ON public.subjects
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Safety Notes**:
- Keep SELECT/INSERT/UPDATE/DELETE scoped by preschool_id for non-service roles
- Service role policies are permissive and don't weaken tenant isolation

**Deliverables**:
- [ ] Service role policies created
- [ ] RLS audit completed
- [ ] Policy regression testing done

---

### ✅ Task 10: Indexes, Constraints, and Comments (Performance and Clarity)

**Objective**: Optimize performance and add documentation

**Activities**:
- Add GIN index for settings lookups if needed
- Ensure unique constraints are present where necessary
- Comment all new enums/tables/columns for future maintainers

**Migration SQL**:
```sql
-- GIN index for K-12 settings lookups
CREATE INDEX IF NOT EXISTS idx_preschools_k12_settings_gin
  ON public.preschools USING GIN (k12_settings);

-- Composite index for grade offerings by tenant and grade
CREATE INDEX IF NOT EXISTS idx_org_grade_offerings_tenant_grade
  ON public.organization_grade_offerings(preschool_id, grade_level);

-- Index for department lookup by type
CREATE INDEX IF NOT EXISTS idx_departments_type
  ON public.departments(department_type) WHERE department_type IS NOT NULL;
```

**Deliverables**:
- [ ] Performance indexes created
- [ ] Constraint verification complete
- [ ] Documentation comments added

---

### ✅ Task 11: Optional Phase - Class/Homeroom Grade Linking (Post-Audit)

**Objective**: Link existing class structures to grade levels

**Decision Point**: After Step 2 audit, choose integration path:

**Option A**: Existing classes table enhancement
```sql
-- Migration m6_classes_add_grade_level (safe, additive)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS grade_level public.grade_level_code;

COMMENT ON COLUMN public.classes.grade_level IS 
  'Optional: link class to a grade level (K-12).';
```

**Option B**: New homerooms table
```sql
CREATE TABLE IF NOT EXISTS public.homerooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level public.grade_level_code,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (preschool_id, name)
);

ALTER TABLE public.homerooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY homerooms_tenant ON public.homerooms
  FOR ALL USING (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  )
  WITH CHECK (
    preschool_id = (COALESCE(
      NULLIF(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::JSONB ->> 'preschool_id')::UUID
  );

CREATE INDEX IF NOT EXISTS idx_homerooms_preschool ON public.homerooms(preschool_id);
```

**Safety Notes**:
- Choose only one path; do not duplicate concepts
- Decision based on audit findings

**Deliverables**:
- [ ] Integration path chosen
- [ ] Migration created (if needed)
- [ ] Testing completed

---

### ✅ Task 12: Application Updates (Mobile/Web) - Tenant Context and Feature Gating

**Objective**: Update application to support organization types

**Tenant Bootstrap**:
- Fetch `organization_type` and `education_phases` with `organizations_v1` or `preschools` select
- Cache in TanStack Query keyed by `preschool_id`

**Feature Gating**:
- If `organization_type = 'preschool'`: preserve current flows unchanged
- If `organization_type IN ('k12_school','mixed')`: enable K-12 setup wizard

**API/Types Updates**:
- Add `OrganizationType` union and enums in `packages/types`
- Generate from DB via `supabase gen types`
- New hooks: `useAvailableGrades(preschool_id)`, `useDepartments`, `useSubjects`

**UI Changes**:
- Add settings screens for K-12 to manage grades/departments/subjects
- Keep strings externalized; add Afrikaans/isiZulu stubs
- Mobile-first design for all new screens

**Security**:
- No service role on client; all RLS-protected queries scoped by `preschool_id`

**Deliverables**:
- [ ] Type definitions updated
- [ ] New hooks implemented
- [ ] Feature gating logic added
- [ ] UI screens created
- [ ] Mobile testing completed

---

### ✅ Task 13: Age-Appropriate Content and AI Safety Hooks

**Objective**: Implement age-appropriate content controls

**Activities**:
- Derive conservative age band from `grade_level_code` or `education_phase`
- Enforce AI prompts via server proxy only
- Include age/phase metadata and redact PII as per WARP.md
- Add `content_guard` util on server that validates phase before enabling features

**Implementation**:
```typescript
// Age band derivation
function getAgeRange(gradeLevel: GradeLevelCode): { min: number; max: number } {
  switch (gradeLevel) {
    case 'ecd_grade_000': return { min: 3, max: 4 };
    case 'ecd_grade_00': return { min: 4, max: 5 };
    case 'grade_r': return { min: 5, max: 6 };
    case 'grade_1': return { min: 6, max: 7 };
    // ... continue for all grades
    case 'grade_12': return { min: 17, max: 18 };
    default: return { min: 3, max: 18 }; // Conservative fallback
  }
}

// Content guard for server-side validation
function validateContentForPhase(phase: EducationPhase, content: string): boolean {
  // Implement age-appropriate content validation
  return true; // Placeholder
}
```

**Deliverables**:
- [ ] Age derivation functions implemented
- [ ] Content validation added to AI proxy
- [ ] PII redaction enhanced
- [ ] Child safety controls verified

---

### ✅ Task 14: Billing and Subscription Alignment (Phase 2)

**Objective**: Plan billing model differentiation (schema stub only)

**Future Considerations**:
- Add `billing_model` enum: `per_learner | per_classroom | per_grade | site_license`
- Add `product_family` enum: `preschool | k12`
- Backfill existing rows to `product_family = 'preschool'`

**Migration Stub** (for future implementation):
```sql
-- Future migration: subscription model differentiation
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_model billing_model_enum,
  ADD COLUMN IF NOT EXISTS product_family product_family_enum DEFAULT 'preschool';
```

**Safety Notes**:
- Keep out of critical path to avoid risk
- Implement after K-12 core is stable
- Requires product sign-off

**Deliverables**:
- [ ] Billing requirements documented
- [ ] Migration stub prepared
- [ ] Product alignment confirmed

---

### ✅ Task 15: Testing Plan (Local → Staging → Production)

**Objective**: Comprehensive testing across all environments

**Local Testing**:
- `supabase db reset --local` (allowed locally per WARP.md)
- `supabase db lint` and run Database Advisors; fix findings
- Unit tests for helper functions and RLS policy checks
- Test with multiple `preschool_id` values to verify tenant isolation

**Staging Testing**:
- `supabase db push --linked` (staging project)
- Smoke tests: create K-12 tenant, set phases/grades, create departments/subjects
- Verify RLS isolation between two tenants
- Performance testing with realistic data volumes

**Production Testing**:
- Change window application
- `supabase db push --linked` to production
- Post-deploy verification checklist
- Monitor logs for any policy regressions

**Test Cases**:
1. **Preschool Backward Compatibility**: Existing preschool flows unchanged
2. **K-12 Setup**: New organization can select phases, grades, departments
3. **Tenant Isolation**: User A cannot see User B's data across organizations
4. **RLS Enforcement**: All queries properly filtered by `preschool_id`
5. **Performance**: New indexes provide expected query performance

**Deliverables**:
- [ ] Test suite implemented
- [ ] Local testing passed
- [ ] Staging testing passed
- [ ] Production deployment verified

---

### ✅ Task 16: Rollback and Recovery

**Objective**: Prepare rollback procedures and recovery plans

**Roll-Forward Preferred**:
- Each migration remains additive
- Fix issues with new migrations rather than rollbacks

**Emergency Rollback** (if required):
- Create new migration to drop offending objects only
- Drop views/functions first, then tables created in this feature
- Never run ad-hoc SQL in Dashboard (WARP.md non-negotiable)
- Revert application feature flags to hide K-12 features

**Recovery Procedures**:
```sql
-- Example rollback migration (emergency only)
DROP VIEW IF EXISTS public.organizations_v1;
DROP FUNCTION IF EXISTS public.get_organization_type;
DROP FUNCTION IF EXISTS public.is_k12;
DROP FUNCTION IF EXISTS public.available_grades;
DROP FUNCTION IF EXISTS public.grade_display_name;

DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.organization_grade_offerings CASCADE;

-- Note: Cannot easily roll back preschools table changes without data loss
-- Consider leaving organization_type column as harmless 'preschool' default
```

**Data Export Scripts**:
- Prepare export scripts for new tables before rollback
- Ensure data can be recovered if needed

**Deliverables**:
- [ ] Rollback procedures documented
- [ ] Data export scripts prepared
- [ ] Recovery testing completed

---

### ✅ Task 17: Documentation and Change Communication

**Objective**: Document all changes and communicate to stakeholders

**Documentation Updates**:
- `docs/tenancy-audit.md` (from Step 2)
- `docs/schema/organizations.md` (org types, phases, grades)
- RLS policy map including new tables
- Admin runbooks for K-12 onboarding and support
- API documentation for new endpoints
- Mobile app user guides

**Change Communication**:
- Product team: Feature capabilities and limitations
- Support team: New onboarding flows and troubleshooting
- QA team: Test scenarios and edge cases
- Development team: Schema changes and RLS implications

**Training Materials**:
- Screenshots of new setup flows
- Video walkthroughs for complex workflows
- FAQ for common questions

**Deliverables**:
- [ ] All documentation updated
- [ ] Stakeholder communication sent
- [ ] Training materials created
- [ ] FAQ populated

---

### ✅ Task 18: Execution Checklist (Commands and Reviews)

**Objective**: Systematic execution with proper reviews

**For Each Migration**:
1. **Create**: `supabase migration new <name>`
2. **Author**: Write SQL with comments and safety notes
3. **Test**: `supabase db reset --local`
4. **Lint**: `supabase db lint`
5. **Stage**: `supabase db push --linked` (staging)
6. **Verify**: `supabase migration list`
7. **Review**: Security Lead (RLS), Data Owner (schema), Eng Lead (app impact)

**Code Review Checklist**:
- [ ] WARP.md compliance verified
- [ ] RLS policies properly scoped
- [ ] No hardcoded tenant data
- [ ] Proper error handling
- [ ] Performance considerations addressed
- [ ] Backward compatibility maintained

**Release Criteria**:
- [ ] All migrations pass local testing
- [ ] Staging validation complete
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team notifications sent

**Final Merge**:
- After all migrations land and pass tests
- Merge `feature/k12-organization-support` branch
- Release per WARP.md release criteria

**Deliverables**:
- [ ] All migrations reviewed and approved
- [ ] Feature branch merged
- [ ] Production deployment successful
- [ ] Post-deployment verification complete

---

## 🎯 Success Criteria

### Technical Excellence
- ✅ 100% backward compatibility maintained
- ✅ Zero impact on existing preschool functionality
- ✅ Full RLS compliance for all new tables
- ✅ Performance within acceptable ranges
- ✅ All Database Advisor warnings resolved

### Business Impact
- ✅ K-12 schools can onboard successfully
- ✅ Appropriate grade/department management available
- ✅ Content filtering by age/phase working
- ✅ Billing model flexibility prepared

### Operational Excellence
- ✅ All changes via proper migrations
- ✅ Full audit trail maintained
- ✅ Rollback procedures tested
- ✅ Documentation complete and accurate
- ✅ Team training completed

---

## 📅 Timeline Estimate

**Phase 1: Planning & Approval** (Tasks 1-3): 3-5 days
**Phase 2: Core Migrations** (Tasks 4-8): 5-7 days  
**Phase 3: Integration & Testing** (Tasks 9-15): 7-10 days
**Phase 4: Deployment & Documentation** (Tasks 16-18): 3-5 days

**Total Estimated Timeline**: 18-27 days

---

## 🚨 Risk Mitigation

### High-Risk Areas
1. **RLS Policy Changes**: Could break tenant isolation
2. **Migration Order**: Dependencies must be respected
3. **Production Data**: Existing preschools must remain functional

### Mitigation Strategies
1. **Extensive Testing**: Each migration tested in isolation and sequence
2. **Staged Rollout**: Local → Staging → Production with verification at each stage
3. **Monitoring**: Enhanced logging during deployment window
4. **Expert Review**: Security Lead and Data Owner approval required

---

## 📞 Contacts & Approvals

**Required Approvals (per WARP.md)**:
- [ ] **Data Owner**: Schema changes and data integrity
- [ ] **Engineering Lead**: Technical implementation and migration sequence
- [ ] **Security Lead**: RLS policies and tenant isolation
- [ ] **Product Owner**: Feature scope and business logic

**Emergency Contacts**:
- Database DBA: [Contact Info]
- Security Lead: [Contact Info]  
- Rollback Owner: [Contact Info]

---

**Document Status**: ✅ Complete  
**Next Review Date**: [Set after Task 1 completion]  
**Last Updated**: 2025-09-18
