# Strategic Plan: Phase 2 – Core Implementation

Last Updated: 2025-09-11

This document defines the authoritative database/RLS flow and migration plan for Parent onboarding and child linking. All engineers must follow this structure to keep migrations clean, consistent, and in sync across environments.

---

## Scope
- Parent profile completion wizard
- Child linking via invite code (fast path) or approval request (no code)
- Secure RLS with RPC-only approvals

## Target Outcomes
- Minimal, additive migrations that pass on first try
- No destructive changes in mainline migrations
- RLS that prevents any cross-tenant data access
- All sensitive ops via SECURITY DEFINER RPCs

---

## Data Model

Tables to add (Task 4 – Migrations):
1) student_parent_links
   - id uuid pk default gen_random_uuid()
   - student_id uuid not null
   - parent_user_id uuid not null
   - relationship_type text check in ('parent','guardian') not null
   - status text check in ('pending','approved','denied','revoked') not null default 'pending'
   - requested_at timestamptz not null default now()
   - approved_at timestamptz
   - approved_by uuid
   - reason text

2) invite_codes
   - id uuid pk default gen_random_uuid()
   - code text unique not null
   - student_id uuid not null
   - expires_at timestamptz not null
   - created_by uuid not null
   - used_by uuid
   - used_at timestamptz

3) profile_completion
   - user_id uuid primary key
   - fields_completed jsonb not null default '{}'::jsonb
   - percent int not null default 0
   - updated_at timestamptz not null default now()

RLS Principles:
- Enable RLS on all tables
- Parents can read/insert only their own link requests; cannot update status
- Staff approves/denies via RPC only
- Invite redemption via RPC only

---

## RPC Endpoints (SECURITY DEFINER)
- create_parent_link_request(student_identifier text | invite_code text, relationship_type text)
- approve_parent_link(link_id uuid)
- deny_parent_link(link_id uuid, reason text)
- create_invite_code(student_id uuid, expires_at timestamptz)
- redeem_invite_code(code text)
- get_my_children()

Authorization Guards inside RPCs:
- Parent path: auth.uid() matches target parent_user_id
- Staff path: verify capability (principal/teacher) within student's preschool
- Ensure invite validity (not expired/used) and ownership

---

## Client Flow
1) profiles-gate Wizard (extended)
   - Step 1: Basic info
   - Step 2: Contact info
   - Step 3: Preferences (language)
   - Step 4: Link Children
     - Invite Code: redeem → approved link
     - Request Link: create pending link; show pending status

2) Parent Dashboard
   - If no children: show empty state + CTA to Link Child
   - If pending requests: show status + help CTA

3) Staff (Principal/Teacher)
   - Approval Queue: list pending link requests; Approve/Deny with reason

---

## Migration Conventions
- File naming: UTC timestamps, one feature per file
  - Example: 20250911_031500_parent_linking_schema.sql
- Idempotent DDL: use CREATE TABLE IF NOT EXISTS; guard index/constraint creation
- RLS on day one: ALTER TABLE ... ENABLE ROW LEVEL SECURITY; add policies immediately
- No broad UPDATE/DELETE policies; sensitive ops via RPCs only
- Apply locally + CI before merge; keep schema snapshots in sync if used

---

## Testing Checklist
- Migrations apply cleanly on a fresh DB
- RLS denies cross-tenant access; parents cannot change status fields directly
- RPCs enforce role/capability and student-school membership
- Invite flow: code create → redeem success → approved link visible to parent
- Request flow: parent creates pending → staff approval updates status → parent sees child
- Analytics: track each funnel step; verify no PII leakage
- i18n: all UI strings externalized

---

## Rollout Plan
- Behind feature flags
- Start with QA dataset; after validation, enable for pilot schools
- Monitor logs and analytics dashboards; adjust policies as needed

This plan is authoritative for Phase 2 database and RLS work. Any deviations must be reviewed and appended here.

