# JWT Claims Structure for EduDash Pro
**Version:** 1.0  
**Date:** 2025-09-19  
**Status:** Implementation Ready

## Overview

This document defines the standardized JWT claims structure passed from the application to PostgreSQL for Row Level Security (RLS) policy evaluation. The claims are injected via Supabase's `request.jwt.claims` setting and accessed through custom auth helper functions.

## Core JWT Claims Structure

```json
{
  "iss": "supabase",
  "sub": "user-uuid-from-auth-users",
  "aud": "authenticated",
  "role": "super_admin|principal|teacher|parent",
  "org_id": "organization-uuid",
  "user_id": "profile-uuid-from-public-users",
  "capabilities": ["capability1", "capability2", "..."],
  "teacher_id": "teacher-uuid-if-applicable",
  "parent_id": "parent-uuid-if-applicable",
  "seat_status": "active|inactive|pending|revoked",
  "plan_tier": "free|starter|premium|enterprise",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## Claim Definitions

### Standard Supabase Claims

#### `iss` (Issuer)
- **Type:** String  
- **Value:** `"supabase"`  
- **Description:** Token issuer identifier

#### `sub` (Subject)
- **Type:** UUID String  
- **Value:** User ID from `auth.users` table  
- **Description:** Authenticated user identifier from Supabase Auth

#### `aud` (Audience)
- **Type:** String  
- **Value:** `"authenticated"`  
- **Description:** Target audience for the token

#### `iat` (Issued At)
- **Type:** Unix Timestamp  
- **Description:** Token issuance time

#### `exp` (Expiration)
- **Type:** Unix Timestamp  
- **Description:** Token expiration time

### EduDash Pro Custom Claims

#### `role` (Required)
- **Type:** String  
- **Values:** `"super_admin"`, `"principal"`, `"principal_admin"`, `"teacher"`, `"parent"`  
- **Description:** User's primary role in the system  
- **Source:** `users.role` or `profiles.role`

#### `org_id` (Required for non-super_admin)
- **Type:** UUID String  
- **Description:** Organization/school identifier  
- **Source:** `users.organization_id` or `preschools.id`  
- **Notes:** NULL for super_admin users

#### `user_id` (Required)
- **Type:** UUID String  
- **Description:** User profile ID from the `users` table  
- **Source:** `users.id`  
- **Notes:** May differ from `sub` (auth.users.id)

#### `capabilities` (Required)
- **Type:** Array of Strings  
- **Description:** List of capabilities/permissions for the user  
- **Source:** Computed from role + subscription tier + seat status  
- **Example:** `["view_dashboard", "manage_classes", "ai_lesson_generation"]`

#### `teacher_id` (Optional)
- **Type:** UUID String  
- **Description:** Teacher profile ID if user has teaching role  
- **Source:** `teachers.id` or `users.id` where role = 'teacher'  
- **When Present:** For users with teacher or principal roles

#### `parent_id` (Optional)
- **Type:** UUID String  
- **Description:** Parent profile ID if user has parent role  
- **Source:** `parents.id` or `users.id` where role = 'parent'  
- **When Present:** For users with parent role

#### `seat_status` (Required)
- **Type:** String  
- **Values:** `"active"`, `"inactive"`, `"pending"`, `"revoked"`  
- **Description:** User's seat activation status  
- **Source:** `subscription_seats.status` or computed value

#### `plan_tier` (Required)
- **Type:** String  
- **Values:** `"free"`, `"starter"`, `"premium"`, `"enterprise"`  
- **Description:** Organization's subscription tier  
- **Source:** `subscriptions.plan` or `preschools.subscription_tier`

## Claims Population Logic

### At Authentication Time

```typescript
// Pseudo-code for claims population
async function generateClaims(authUserId: string): Promise<JWTClaims> {
  // Get user profile
  const user = await getUserProfile(authUserId);
  
  // Get organization details
  const org = await getOrganization(user.organization_id);
  
  // Compute capabilities
  const capabilities = await getUserCapabilities(
    user.role, 
    org?.subscription_tier, 
    user.seat_status
  );
  
  return {
    sub: authUserId,
    role: user.role,
    org_id: user.organization_id,
    user_id: user.id,
    capabilities: capabilities,
    teacher_id: user.role === 'teacher' ? user.id : null,
    parent_id: user.role === 'parent' ? user.id : null,
    seat_status: user.seat_status || 'active',
    plan_tier: org?.subscription_tier || 'free',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };
}
```

### Claims Refresh Strategy

1. **On Login:** Full claims generation and JWT issuance
2. **On Role Change:** Force token refresh with new claims  
3. **On Seat Status Change:** Force token refresh with updated capabilities
4. **On Subscription Change:** Force token refresh for entire organization
5. **Periodic Refresh:** Standard Supabase token refresh (every 1 hour)

## Database Helper Functions

These functions are created in the database to safely access JWT claims:

```sql
-- Core JWT access
CREATE OR REPLACE FUNCTION app_auth.jwt() RETURNS JSONB;
CREATE OR REPLACE FUNCTION app_auth.role() RETURNS TEXT;
CREATE OR REPLACE FUNCTION app_auth.user_id() RETURNS UUID;
CREATE OR REPLACE FUNCTION app_auth.org_id() RETURNS UUID;

-- Capabilities
CREATE OR REPLACE FUNCTION app_auth.capabilities() RETURNS TEXT[];
CREATE OR REPLACE FUNCTION app_auth.has_cap(cap TEXT) RETURNS BOOLEAN;

-- Role checks
CREATE OR REPLACE FUNCTION app_auth.is_super_admin() RETURNS BOOLEAN;
CREATE OR REPLACE FUNCTION app_auth.is_principal() RETURNS BOOLEAN;
CREATE OR REPLACE FUNCTION app_auth.is_teacher() RETURNS BOOLEAN;
CREATE OR REPLACE FUNCTION app_auth.is_parent() RETURNS BOOLEAN;

-- Relationship IDs
CREATE OR REPLACE FUNCTION app_auth.teacher_id() RETURNS UUID;
CREATE OR REPLACE FUNCTION app_auth.parent_id() RETURNS UUID;

-- Utility functions
CREATE OR REPLACE FUNCTION app_auth.can_access_org(p_org UUID) RETURNS BOOLEAN;
```

## Security Considerations

### Claim Validation

1. **Server-Side Only:** Claims are populated server-side, never trust client-provided role information
2. **Signature Verification:** All JWTs are signed and verified by Supabase
3. **Expiration Enforcement:** Tokens have reasonable expiration times
4. **Capability Validation:** Capabilities are computed from authoritative data sources

### Data Privacy

1. **Minimal Claims:** Only include necessary information for RLS evaluation
2. **No PII:** Avoid including sensitive personal information in claims
3. **Organization Scoping:** Ensure org_id always matches user's actual organization
4. **Audit Trail:** Log all claim modifications and privilege escalations

### Performance Optimization

1. **Caching:** Claims can be cached for the token lifetime
2. **Batch Updates:** When updating multiple users, batch claim refreshes
3. **Lazy Loading:** Don't include expensive computations in real-time claim generation

## Implementation Requirements

### Backend Changes Required

1. **JWT Generation Enhancement:**
   ```typescript
   // Enhance existing JWT generation to include custom claims
   const customClaims = await generateEduDashClaims(user.id);
   const jwt = supabase.auth.admin.generateAccessToken(user.id, customClaims);
   ```

2. **Claim Population Service:**
   ```typescript
   // Service to populate claims from database
   class ClaimsService {
     async populateClaimsForUser(userId: string): Promise<EduDashClaims>;
     async refreshClaimsForOrganization(orgId: string): Promise<void>;
     async invalidateClaimsForUser(userId: string): Promise<void>;
   }
   ```

3. **Role Change Handlers:**
   ```typescript
   // Trigger claim refresh on critical changes
   async function onRoleChange(userId: string, newRole: string) {
     await claimsService.refreshClaimsForUser(userId);
     await supabase.auth.admin.invalidateSession(userId);
   }
   ```

### Database Changes Required

1. **Helper Functions:** Create all app_auth schema functions
2. **RLS Policies:** Update policies to use app_auth.* functions
3. **Performance Indexes:** Ensure queries using claims are optimized

## Testing Strategy

### Unit Tests
- Test claim generation for each role type
- Test capability computation logic
- Test claim validation functions

### Integration Tests  
- Test end-to-end authentication flow with claims
- Test RLS policy evaluation with various claim combinations
- Test claim refresh scenarios

### Security Tests
- Test claim tampering resistance  
- Test privilege escalation scenarios
- Test cross-organization access attempts

## Validation Checklist

- [ ] Claims are populated from authoritative database sources
- [ ] Super admin claims allow cross-organizational access
- [ ] Principal claims are properly scoped to organization
- [ ] Teacher claims include appropriate relationship IDs
- [ ] Parent claims include appropriate relationship IDs
- [ ] Capabilities array matches role + subscription + seat status
- [ ] Claims refresh properly on role/seat/subscription changes
- [ ] Database helper functions safely parse claims
- [ ] RLS policies correctly use helper functions
- [ ] Performance is acceptable under load
- [ ] Security audit passes for claim integrity

---

## Migration Path

1. **Phase 1:** Create database helper functions
2. **Phase 2:** Enhance JWT generation with custom claims
3. **Phase 3:** Update RLS policies to use claims
4. **Phase 4:** Test and validate all scenarios
5. **Phase 5:** Deploy to production with monitoring

This JWT claims structure provides the foundation for secure, performance-optimized Row Level Security policies that align with EduDash Pro's sophisticated RBAC system.