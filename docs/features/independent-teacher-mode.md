# Independent Teacher Mode

**Status**: Design Proposal  
**Target**: Phase 5 (Weeks 2-4)  
**Priority**: Medium  

## Problem Statement

Teachers who want to use EduDash Pro but whose schools don't have or want institutional accounts face a barrier to adoption. We need a way for individual teachers to access the platform independently while maintaining revenue and multi-tenant architecture integrity.

## Business Context

### Current Limitations
- Teachers can only use the app if invited by a principal
- Schools must create an organization account first
- Individual teachers have no direct path to adoption
- Lost revenue from teachers willing to pay individually

### Target Users
1. **Independent tutors** - Not affiliated with any school
2. **Progressive teachers** - Want to try before convincing their school
3. **Substitute teachers** - Work across multiple schools
4. **Homeschool educators** - Teaching small groups or own children
5. **Teachers at schools unwilling to adopt** - Want personal productivity tools

## Solution Design

### Freemium Model for Independent Teachers

#### Account Types

**1. Independent Teacher (Free Tier)**
- Personal workspace (NOT tied to organization)
- Up to 10 students max
- Basic features: attendance, simple notes, calendar
- Limited AI: 10 queries/month
- No parent access portal
- No admin/principal features
- Must create personal "organization" (hidden from UI as such)

**2. Independent Teacher Pro ($9.99/month)**
- Personal workspace
- Up to 50 students
- Full AI capabilities (500 queries/month)
- Voice assistant access
- Parent portal links (read-only for parents)
- Advanced analytics
- Export capabilities

**3. School Organization Account (existing)**
- Full multi-teacher collaboration
- Unlimited students (per plan tier)
- Principal dashboards
- Parent portals
- Team features

### Technical Implementation

#### Database Schema Changes

```sql
-- Add account_type to organizations table
ALTER TABLE organizations 
ADD COLUMN account_type TEXT CHECK (account_type IN ('school', 'independent_teacher', 'enterprise')) DEFAULT 'school';

-- Add student_limit to organizations
ALTER TABLE organizations 
ADD COLUMN student_limit INTEGER DEFAULT NULL; -- NULL = unlimited (school accounts)

-- Update existing records
UPDATE organizations SET account_type = 'school' WHERE account_type IS NULL;
```

#### Onboarding Flow Changes

**New Teacher Signup Flow:**
```
1. Teacher lands on app → "Sign Up"
2. Choice screen:
   - "Join my school" (existing flow - requires invite code)
   - "Start as independent teacher" (new flow)
   
3a. Join School Path (existing):
   - Enter invite code
   - Complete profile
   - Join organization
   
3b. Independent Path (new):
   - Complete profile
   - Auto-create personal organization:
     * account_type = 'independent_teacher'
     * subscription_plan = 'free' (initially)
     * student_limit = 10
     * name = "[Teacher Name]'s Workspace"
   - Skip principal/admin features
   - Show upgrade prompt for Pro features
```

#### RBAC Updates

```typescript
// lib/rbac.ts

export type AccountType = 'school' | 'independent_teacher' | 'enterprise';

export interface Organization {
  id: string;
  account_type: AccountType;
  subscription_plan: SubscriptionTier;
  student_limit: number | null;
}

function getCapabilitiesForIndependentTeacher(
  org: Organization
): Capability[] {
  const base: Capability[] = [
    'view_own_students',
    'create_students', // with limit check
    'edit_own_students',
    'view_attendance',
    'record_attendance',
    'view_calendar',
    'create_events',
  ];

  // Pro tier adds AI and advanced features
  if (org.subscription_plan === 'pro' || org.subscription_plan === 'premium') {
    base.push(
      'use_ai_assistant',
      'use_voice_commands',
      'share_parent_links',
      'export_data',
      'view_analytics'
    );
  }

  return base;
}

// Update main capability granting function
export function getCapabilitiesForUserInOrganization(
  user: Profile,
  org: Organization,
  membership?: OrganizationMember
): Capability[] {
  
  // Independent teacher flow
  if (org.account_type === 'independent_teacher') {
    return getCapabilitiesForIndependentTeacher(org);
  }

  // Existing school flow...
  // ...
}
```

#### Student Limit Enforcement

```typescript
// services/student-service.ts

export async function createStudent(data: CreateStudentInput): Promise<Student> {
  // Get organization
  const org = await getOrganization(data.organization_id);
  
  // Check student limit for independent teachers
  if (org.account_type === 'independent_teacher' && org.student_limit) {
    const currentCount = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('preschool_id', org.id);
      
    if (currentCount.count >= org.student_limit) {
      throw new Error(
        `Student limit reached (${org.student_limit}). Upgrade to Pro for up to 50 students.`
      );
    }
  }
  
  // Create student...
}
```

#### UI/UX Changes

**1. Dashboard Adaptations**
```typescript
// components/dashboard/TeacherDashboard.tsx

const isIndependent = org?.account_type === 'independent_teacher';

// Hide features not applicable to independent teachers:
{!isIndependent && (
  <TeacherCollaborationPanel />
)}

// Show upgrade prompts for free tier
{isIndependent && org.subscription_plan === 'free' && (
  <UpgradePromptCard 
    feature="AI Assistant"
    message="Unlock unlimited AI with Pro"
    ctaText="Upgrade to Pro"
  />
)}
```

**2. Settings Screen**
```typescript
// Show account type and upgrade options
<View>
  <Text>Account Type: Independent Teacher (Free)</Text>
  <Text>Students: 3 / 10</Text>
  <Button onPress={handleUpgrade}>Upgrade to Pro ($9.99/mo)</Button>
</View>
```

**3. Onboarding Choice Screen**
```typescript
// app/screens/teacher-signup-choice.tsx

<View>
  <Text>How would you like to use EduDash Pro?</Text>
  
  <TouchableOpacity onPress={() => router.push('/teacher-invite-code')}>
    <Text>🏫 Join My School</Text>
    <Text>I have an invite code from my principal</Text>
  </TouchableOpacity>
  
  <TouchableOpacity onPress={() => router.push('/independent-teacher-signup')}>
    <Text>👤 Start as Independent Teacher</Text>
    <Text>Use on my own (free to start)</Text>
  </TouchableOpacity>
</View>
```

### Migration Path: Independent → School

When an independent teacher later joins a school:

```typescript
// services/teacher-transition-service.ts

export async function transitionToSchoolAccount(params: {
  teacherId: string;
  schoolInviteToken: string;
}): Promise<void> {
  // 1. Accept school invite
  const invite = await TeacherInviteService.accept({
    token: params.schoolInviteToken,
    authUserId: params.teacherId,
    email: teacher.email
  });
  
  // 2. Offer to migrate students
  const hasStudents = await checkForStudents(params.teacherId);
  
  if (hasStudents) {
    // Prompt: "Would you like to transfer your students to [School Name]?"
    // Options: Transfer, Keep Separate, Review Later
  }
  
  // 3. Update profile to point to school org
  await supabase
    .from('profiles')
    .update({ organization_id: invite.school_id })
    .eq('id', params.teacherId);
    
  // 4. Archive personal workspace (don't delete - keep data)
  await supabase
    .from('organizations')
    .update({ is_archived: true })
    .eq('id', personalOrgId);
}
```

### Revenue Model

#### Pricing Tiers

| Feature | Free | Pro ($9.99/mo) | School (Custom) |
|---------|------|----------------|-----------------|
| Students | 10 max | 50 max | Unlimited |
| AI Queries | 10/month | 500/month | Based on plan |
| Voice Assistant | ❌ | ✅ | ✅ |
| Parent Portal | ❌ | ✅ (read-only) | ✅ (full) |
| Analytics | Basic | Advanced | Enterprise |
| Support | Email | Priority | Dedicated |

#### Payment Integration

Use Supabase Edge Function + Stripe:
```typescript
// supabase/functions/create-subscription/index.ts

Deno.serve(async (req) => {
  const { teacher_id, plan } = await req.json();
  
  // Create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: 'price_IndependentTeacherPro' }],
    metadata: { teacher_id, account_type: 'independent_teacher' }
  });
  
  // Update organization
  await supabase
    .from('organizations')
    .update({ 
      subscription_plan: 'pro',
      student_limit: 50
    })
    .eq('id', orgId);
    
  return new Response(JSON.stringify({ success: true }));
});
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Add `account_type` and `student_limit` columns to organizations
- [ ] Update RBAC logic for independent teachers
- [ ] Create migration for existing data

### Phase 2: Signup Flow (Week 2)
- [ ] Build choice screen (join school vs independent)
- [ ] Create independent teacher onboarding
- [ ] Auto-create personal workspace logic
- [ ] Test complete flow

### Phase 3: Feature Restrictions (Week 2-3)
- [ ] Implement student limit checks
- [ ] Hide inapplicable features for independent teachers
- [ ] Add upgrade prompts for free tier
- [ ] Build settings/account management screen

### Phase 4: Payment Integration (Week 3)
- [ ] Set up Stripe integration
- [ ] Create subscription Edge Function
- [ ] Build upgrade flow UI
- [ ] Test payment webhook handling

### Phase 5: Migration Path (Week 4)
- [ ] Build transition service
- [ ] Create student migration UI
- [ ] Test independent → school transition
- [ ] Handle edge cases (data conflicts, etc.)

## Success Metrics

- **Adoption**: 100+ independent teacher signups in first month
- **Conversion**: 20% convert from free → Pro within 30 days
- **Retention**: 70% monthly active after signup
- **Revenue**: $500/month from independent Pro subscriptions
- **Transition**: 10% eventually join school accounts

## Open Questions

1. **Should independent teachers access parent features?**
   - Proposal: Yes for Pro tier, read-only parent links
   
2. **How to handle archived personal workspaces?**
   - Proposal: Keep for 90 days, then soft-delete
   
3. **Can teachers switch back to independent after joining school?**
   - Proposal: Yes, but must recreate workspace (don't auto-restore)
   
4. **Pricing for South African market?**
   - USD: $9.99/month
   - ZAR: R179/month (~$10 at current rates)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cannibalizes school sales | Position as "try before school buy-in" |
| Support burden from free users | Limit free support to email only |
| Data migration issues | Thorough testing, keep backups |
| Payment processing in SA | Use Stripe (supports ZAR) |
| Student limit circumvention | Server-side validation, RLS policies |

## References

- RBAC system: `lib/rbac.ts`
- Onboarding: `app/screens/principal-onboarding.tsx`
- Teacher invites: `lib/services/teacherInviteService.ts`
- Subscription plans: `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md`
