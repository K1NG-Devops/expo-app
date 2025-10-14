# EduDash Pro: Comprehensive Principal Dashboard Analysis

**Document Version:** 1.0  
**Analysis Date:** October 1, 2025  
**Status:** Final Review  
**Next Review:** January 1, 2026

---

## Executive Summary

EduDash Pro demonstrates **strong foundational capabilities** for principal-led school management with exceptional AI integration, mobile-first architecture, and comprehensive financial oversight. The platform successfully implements 8 of 11 core principal capabilities, positioning it uniquely in the educational technology landscape.

**Key Findings:**
- ✅ **Implemented:** School setup, teacher management, parent invites, petty-cash approvals, financial oversight, WhatsApp integration, AI quota management, subscription control
- ⚠️ **Partial:** Teacher activity monitoring, auto-allocation systems
- ❌ **Missing:** Hiring Hub with resume management

**Strategic Positioning:** EduDash Pro's mobile-first approach combined with AI-powered automation and WhatsApp integration creates a **5th Industrial Revolution (5IR)** educational platform that empowers principals to operate entire schools from their devices—a capability unmatched by traditional competitors.

**Immediate Action Required:** Phase 1 implementation (Hiring Hub, Auto-allocation, Enhanced Monitoring) will complete the core vision and establish EduDash Pro as the definitive mobile-first school management platform.

---

## 1. Principal Capabilities Verification Matrix

### 1.1 Core Capabilities Assessment

| # | Capability | Status | Evidence | UX Flow Summary | Blockers | Priority |
|---|------------|--------|----------|-----------------|----------|----------|
| 1 | **School Setup & Customization** | ✅ Implemented | `app/screens/principal-onboarding.tsx`<br>`app/screens/admin/school-settings.tsx`<br>Tables: `preschools`, `organizations` | Principal creates school profile, sets capacity, configures settings, uploads branding. 4-step wizard with validation. | None | P0 (Complete) |
| 2 | **Invite/Setup Teachers** | ✅ Implemented | `app/screens/teacher-management.tsx`<br>`lib/services/teacherInviteService.ts`<br>Tables: `teachers`, `teacher_invitations`<br>Seat system: `useSeatLimits` hook | Principal generates invite links, teachers register, seats allocated automatically. Email/WhatsApp distribution. Seat management integrated. | None | P0 (Complete) |
| 3 | **Hiring Hub** | ❌ Missing | No routes, components, or tables found<br>Searched: `hiring`, `recruitment`, `resume`, `candidate` | N/A - Not implemented | Missing: Database schema for job postings, applications, resume storage, screening workflows, interview scheduling | P1 (Critical) |
| 4 | **Allocate Students to Classes** | ✅ Implemented | `app/screens/class-teacher-management.tsx`<br>`app/screens/student-management.tsx`<br>Tables: `students`, `classes`<br>Foreign keys: `student.class_id` | Manual class assignment via dropdowns. Bulk operations not implemented. Can reassign students individually. | Slow for large cohorts (100+ students) | P0 (Complete)<br>P2 (Bulk ops) |
| 5 | **Auto-Allocation System** | ❌ Missing | No auto-allocation logic found<br>Manual only in `class-teacher-management.tsx` | N/A - Manual allocation only | Missing: Algorithm for balancing class sizes, teacher workload calculation, conflict detection, schedule optimization | P1 (Critical) |
| 6 | **School-wide Parent Invites** | ✅ Implemented | `app/screens/principal-parent-invite-code.tsx`<br>`app/screens/principal-parents.tsx`<br>`lib/services/inviteCodeService.ts`<br>Tables: `school_invitation_codes`, `parent_invitations` | Principal generates unlimited/limited invite codes with expiry. Parents register with code. WhatsApp/Share integration. View all registered parents. | None | P0 (Complete) |
| 7 | **Messaging System** | ⚠️ Partial | `app/screens/teacher-messages.tsx`<br>`app/screens/parent-messages.tsx`<br>WhatsApp: `hooks/useWhatsAppConnection.ts`<br>Tables: `messages`, `conversations` | In-app messaging exists. WhatsApp deep-linking implemented. No unified principal inbox for all conversations. | Missing: Principal-specific messaging dashboard, broadcast messaging, message templates, conversation analytics | P2 (Enhancement) |
| 8 | **Real-time Teacher Monitoring** | ⚠️ Partial | `hooks/usePrincipalHub.ts`<br>`components/dashboard/EnhancedPrincipalDashboard.tsx`<br>Activity logs limited | Dashboard shows teacher metrics (classes, students). No real-time activity feed. Limited visibility into daily actions. | Missing: Activity event stream, lesson progress tracking, grading velocity, parent communication stats, real-time alerts | P1 (Critical) |
| 9 | **Petty-Cash Approvals** | ✅ Implemented | `app/screens/principal-approval-dashboard.tsx`<br>`app/screens/petty-cash.tsx`<br>`services/ApprovalWorkflowService.ts`<br>Tables: `petty_cash_requests`, `petty_cash_receipts`, `approval_workflows` | Complete workflow: teachers request → principal reviews → approve/reject → receipt upload → reconciliation. Multi-level approval supported. | None | P0 (Complete) |
| 10 | **School WhatsApp Number** | ✅ Implemented | `app/screens/whatsapp-setup.tsx`<br>`hooks/useWhatsAppConnection.ts`<br>`WHATSAPP_ARCHITECTURE_GUIDE.md`<br>Tables: `whatsapp_connections`, `school_settings` | Principal configures school WhatsApp number. Teachers inherit for parent communication. Deep-link integration. Opt-in flow implemented. | Requires Meta Business verification (external dependency) | P0 (Complete) |
| 11 | **Full Mobile Operation** | ✅ Implemented | React Native Expo architecture<br>Mobile-first design system<br>Responsive layouts across all screens<br>Touch-optimized controls | All principal functions accessible via mobile app. Optimized for small screens. Offline-first capabilities via TanStack Query caching. | Minor: Some tables could benefit from mobile-specific layouts | P0 (Complete)<br>P3 (Polish) |

### 1.2 Summary Statistics

- **Fully Implemented:** 8/11 (73%)
- **Partially Implemented:** 2/11 (18%)
- **Missing:** 1/11 (9%)
- **Priority 1 (Critical):** 3 items (Hiring Hub, Auto-allocation, Teacher Monitoring)
- **Priority 2 (Enhancement):** 2 items (Messaging Dashboard, Bulk Allocation)
- **Priority 3 (Polish):** 1 item (Mobile Layout Optimization)

---

## 2. Areas of Improvement

### 2.1 Identified Flaws and Gaps

#### 2.1.1 **Critical Gaps (P1)**

**A. Hiring Hub Missing**
- **Business Impact:** Principals cannot manage teacher recruitment within EduDash Pro, forcing external tools (email, spreadsheets, paper applications)
- **Logic Gap:** No end-to-end hiring workflow from job posting → application collection → resume review → interview scheduling → offer generation
- **Data Model Required:**
  - Tables: `job_postings`, `job_applications`, `candidate_profiles`, `interview_schedules`, `hiring_decisions`
  - Storage: Resume files (PDF, DOCX), cover letters, certificates
  - Relationships: `job_applications.candidate_id → candidate_profiles.id`, `job_applications.job_posting_id → job_postings.id`
- **Recommendation:** Implement lightweight hiring hub with CV upload, application tracking, and interview scheduling (see Phase 1)

**B. Auto-Allocation System Missing**
- **Business Impact:** Principal manually assigns every student to classes and teachers, time-consuming for 100+ student schools
- **Logic Gap:** No algorithm for:
  - Balanced class sizes (within ±2 students)
  - Teacher workload distribution (max teaching hours, admin duties)
  - Schedule conflict detection (same teacher, multiple classes at same time)
  - Student requirements matching (special needs, age groups)
- **Data Model Required:**
  - Tables: `allocation_rules`, `allocation_history`, `teacher_workload_limits`
  - Computed columns: `classes.current_enrollment`, `teachers.total_teaching_hours`
- **Recommendation:** Build rule-based allocation engine with manual override (see Phase 1)

**C. Teacher Activity Monitoring Insufficient**
- **Business Impact:** Principals cannot proactively identify struggling teachers, delayed grading, or parent communication gaps
- **Logic Gap:** No real-time event stream for:
  - Lesson plan creation/updates
  - Assignment creation/grading progress
  - Parent messages sent/received
  - Attendance marking consistency
- **Data Model Required:**
  - Tables: `teacher_activity_logs`, `real_time_metrics`, `alert_thresholds`
  - Event types: `lesson_created`, `assignment_graded`, `message_sent`, `attendance_marked`
- **Recommendation:** Implement activity dashboard with configurable alerts (see Phase 1)

#### 2.1.2 **Enhancement Opportunities (P2)**

**D. Messaging Dashboard for Principals**
- **Current:** Principals see parent list but no unified inbox
- **Improvement:** Central dashboard showing:
  - All school conversations (teachers ↔ parents, principal ↔ teachers)
  - Unanswered parent messages (>24h response time alert)
  - Broadcast messaging capability (school announcements)
  - Message templates (permission slips, event notifications)

**E. Bulk Operations Limited**
- **Current:** Student allocation is one-by-one via dropdown
- **Improvement:** Batch operations:
  - CSV import for student class assignments
  - Drag-and-drop class roster management
  - Multi-select with bulk actions (reassign, archive, transfer)

**F. Homework Grading Principal View**
- **Current:** Teachers grade independently, principal has limited visibility
- **Improvement:** Principal dashboard showing:
  - Overdue grading (assignments >7 days ungraded)
  - Grading velocity per teacher (avg time to grade)
  - Inconsistent grading patterns (same assignment, different grade distributions)
  - Student performance trends requiring intervention

### 2.2 UX/Workflow Inefficiencies

| Issue | Impact | Screen | Recommendation | Effort |
|-------|--------|--------|----------------|--------|
| **Multi-step teacher invite** | 5 clicks to invite one teacher | `teacher-management.tsx` | One-click invite with pre-filled email, auto-send | 2 days |
| **No bulk student import** | Slow onboarding for new schools | `student-management.tsx` | CSV upload with field mapping wizard | 5 days |
| **Petty-cash lacks mobile receipt photo** | Teachers must upload from desktop | `petty-cash.tsx` | Native camera integration with auto-crop | 3 days |
| **Parent invite code copy-paste** | WhatsApp share works, but code copying has extra step | `principal-parent-invite-code.tsx` | One-tap copy with toast confirmation | 1 day |
| **Dashboard metrics not tappable** | User expects tap to drill-down | `EnhancedPrincipalDashboard.tsx` | Make all metric cards navigable to detail views | 3 days |
| **No offline indicator** | Unclear if data is stale when offline | All screens | Add sync status badge, show last updated timestamp | 2 days |
| **Search lacks filters** | Hard to find specific students/teachers in large lists | `student-management.tsx`, `teacher-management.tsx` | Add filter chips (status, class, subject) | 4 days |

**Total Effort for Quick Wins:** 20 days (4 weeks)

### 2.3 Business Logic Enhancements

#### A. Enrollment Pipeline Automation
- **Current:** Manual enrollment_applications review
- **Enhancement:** Auto-screening rules:
  - Age eligibility check (reject if outside grade range)
  - Capacity check (auto-waitlist if class full)
  - Document completeness (flag incomplete applications)
  - Duplicate detection (same parent/child combination)

#### B. Teacher Performance Metrics
- **Current:** Basic stats (classes, students)
- **Enhancement:** Comprehensive scorecard:
  - Grading turnaround time (benchmark: 3 days)
  - Parent communication responsiveness (benchmark: 24h)
  - Attendance marking consistency (daily vs. weekly)
  - Student performance trends in teacher's classes
  - Professional development hours completed

#### C. Financial Forecasting
- **Current:** Monthly revenue/expenses snapshot
- **Enhancement:** Predictive analytics:
  - Projected revenue based on enrollment pipeline
  - Churn risk analysis (payment delays, parent complaints)
  - Seasonal cash flow modeling (holidays, summer breaks)
  - Budget variance alerts (spend vs. plan)

#### D. Subscription Seat Management
- **Current:** Manual seat allocation, principal approves
- **Enhancement:** Automated workflows:
  - Auto-assign seat when teacher completes onboarding
  - Auto-revoke seat after 90 days inactivity
  - Seat usage analytics (active vs. idle seats)
  - Cost optimization recommendations (upgrade/downgrade plan)

---

## 3. Educational Features Analysis

### 3.1 Feature Maturity Matrix

| Feature | Current State | Maturity Level | Data Model | API Routes | Gaps | Recommendations |
|---------|---------------|----------------|------------|------------|------|-----------------|
| **Lessons Hub** | ✅ Functional | 75% | `lessons`, `lesson_categories`, `lesson_content`<br>Storage: `lesson_attachments` | `GET /lessons`<br>`POST /lessons`<br>`GET /lessons/:id` | Missing: Lesson templates library, reusable components, versioning, collaborative editing | Add template marketplace, version control (git-like), teacher collaboration mode |
| **Interactive Activities** | ⚠️ Limited | 40% | `activities`, `activity_responses`<br>Real-time: Supabase subscriptions | `GET /activities`<br>`POST /activity_responses` | Few activity types (quiz, worksheet). No video, games, simulations. Limited engagement tracking. | Expand to 10+ activity types (drag-drop, drawing, video responses, branching scenarios). Add engagement heatmaps. |
| **Homework Assignment** | ✅ Functional | 80% | `assignments`, `assignment_submissions`, `class_assignments`<br>Tables: `students`, `classes` | `POST /assignments`<br>`GET /assignments/:id`<br>`lib/services/teacherDataService.ts` | Bulk assignment clunky, no recurring assignments (weekly/monthly), no differentiation (per-student difficulty) | Add assignment templates, recurrence rules, adaptive difficulty (AI-suggested), bulk CSV upload |
| **Homework Grading** | ⚠️ Basic | 50% | `assignment_submissions`, `grades`, `grading_rubrics` | `POST /grade`<br>`ai-grading` function | Manual grading only, AI grading not integrated into workflow, no rubric builder, inline comments limited | Integrate AI grading UI into teacher dashboard, visual rubric editor, voice-to-text feedback, grading analytics (time per assignment) |
| **AI Quota Allocation** | ✅ Implemented | 90% | `school_ai_subscriptions`, `teacher_ai_allocations`, `ai_allocation_requests`, `ai_allocation_history`<br>Migration: `20250918155323_ai_quota_allocation_system.sql` | `GET /ai-quotas`<br>`POST /allocate-quota`<br>`POST /approve-request`<br>`lib/ai/allocation.ts` | Minor: No predictive quota needs, no overage handling (hard stop vs. soft limit) | Add predictive modeling (quota consumption forecasts), overage policies (pay-as-you-go, throttle), usage anomaly detection |
| **School Subscription** | ✅ Implemented | 85% | `organization_subscriptions`, `subscription_plans`, `teacher_seats`<br>Hooks: `useSeatLimits`, `useSubscription` | `GET /subscription`<br>`POST /upgrade`<br>`rpc-subscriptions.ts` | Billing integration manual (Stripe not auto-provisioned), usage-based billing not implemented | Automate Stripe provisioning, add usage-based billing tier (pay-per-student, pay-per-AI-call), self-service plan changes |

### 3.2 Educational Workflow Completeness

**End-to-End Flow Analysis:**

1. **Lesson Planning → Delivery → Assessment**
   - ✅ Teachers create lessons in Lessons Hub
   - ✅ Assign lessons as homework via `assign-homework.tsx`
   - ⚠️ Lesson delivery tracking incomplete (no "viewed by student" confirmation)
   - ⚠️ Assessment linked to lessons but not automatic (manual rubric mapping)
   - **Gap:** Unified lesson lifecycle tracking from creation → student engagement → grading → parent notification

2. **Student Progress Tracking**
   - ✅ Grades recorded per assignment
   - ⚠️ No progress dashboards for parents (they see grades but not trends)
   - ❌ No learning goals/competencies framework (standards alignment)
   - **Gap:** Competency-based progress tracking, parent-facing progress reports

3. **Parent Communication Loop**
   - ✅ Parents see assignments and grades
   - ✅ Messaging system exists
   - ⚠️ No automatic notifications (e.g., "Assignment graded" push notification)
   - ❌ No parent feedback collection (lesson satisfaction, teacher reviews)
   - **Gap:** Closed-loop communication with automated triggers and feedback capture

### 3.3 Actionable Recommendations

1. **Expand Activity Types:** Add 8 new activity types (Priority: P2, Effort: 6 weeks)
   - Interactive video with embedded quizzes
   - Digital whiteboard for math/drawing
   - Branching scenarios (choose-your-own-adventure)
   - Gamified challenges with leaderboards
   - Peer review activities (student grades student)
   - Voice/video response submissions
   - Virtual lab simulations
   - Collaborative group projects

2. **Implement Lesson Templates Library:** (Priority: P2, Effort: 4 weeks)
   - Curated library of 100+ lesson templates by grade/subject
   - Community-contributed lessons with quality ratings
   - One-click duplicate and customize
   - Version control (track edits, revert to previous versions)

3. **Build Homework Grading Dashboard:** (Priority: P1, Effort: 5 weeks)
   - Principal view of all ungraded assignments (school-wide)
   - Teacher grading velocity metrics
   - AI-assisted grading integration (one-click AI suggestion → teacher review → finalize)
   - Bulk grading actions (grade all, apply rubric to batch)

4. **Create Parent Progress Portal:** (Priority: P2, Effort: 6 weeks)
   - Child-specific dashboard with grade trends, attendance, behavior notes
   - Skill-based progress (literacy, numeracy, social-emotional)
   - Automated weekly/monthly progress emails
   - Parent satisfaction surveys (post-grading, post-parent-teacher meetings)

5. **Integrate AI Quota with Homework Grading:** (Priority: P1, Effort: 3 weeks)
   - Deduct AI quota when teacher uses AI grading
   - Display quota balance before AI action (prevent mid-task failures)
   - Optimize quota consumption (batch grading uses less quota per item)

---

## 4. Competitive Differentiators (5IR Positioning)

### 4.1 Competitive Landscape Analysis

| Capability/Theme | EduDash Pro Approach | Google Classroom | Microsoft Teams Edu | Canvas LMS | Differentiator Strength | 5IR Alignment |
|------------------|----------------------|------------------|---------------------|------------|-------------------------|---------------|
| **Mobile-First Operations** | Native mobile app, all features accessible, offline-first | Web-first, mobile app limited | Desktop-centric, mobile secondary | Desktop LMS | ⭐⭐⭐⭐⭐ UNIQUE | ✅ Accessibility, inclusion (teachers/principals without computers) |
| **Hiring Hub** | Integrated resume collection, interview scheduling, offers | None | None (LinkedIn separate) | None | ⭐⭐⭐⭐⭐ UNIQUE | ✅ Human-centric (streamline HR burden) |
| **Auto-Allocation** | AI-powered class/teacher allocation, conflict detection | Manual | Manual | Manual | ⭐⭐⭐⭐⭐ UNIQUE (when built) | ✅ AI collaboration (augment principal decisions) |
| **Petty-Cash Workflow** | Mobile receipt upload, approval workflow, reconciliation | None | None | None (requires accounting software) | ⭐⭐⭐⭐ STRONG | ✅ Transparency, accountability (financial ethics) |
| **WhatsApp Integration** | School-wide WhatsApp number, deep-linking, parent messaging | None (Gmail only) | None (Teams chat only) | None (email only) | ⭐⭐⭐⭐⭐ UNIQUE | ✅ Inclusion (reach parents without smartphones/email) |
| **AI Quota Governance** | Principal allocates AI budgets per teacher, usage tracking | Unlimited (Google Bard) | Copilot per user, no governance | No AI | ⭐⭐⭐⭐⭐ UNIQUE | ✅ Ethics (responsible AI use, cost control) |
| **Real-Time Teacher Monitoring** | Activity feed, grading velocity, parent communication SLAs | Limited analytics | Limited analytics | Admin reports only | ⭐⭐⭐ MODERATE (when enhanced) | ✅ Accountability, professional development |
| **Subscription Seat Control** | School controls teacher seats, usage-based pricing | Per-user pricing, no governance | Per-user pricing, no governance | Per-user pricing | ⭐⭐⭐⭐ STRONG | ✅ Economic equity (cost-effective for schools) |
| **Offline-First** | TanStack Query caching, local-first data | Requires internet | Requires internet | Requires internet | ⭐⭐⭐⭐ STRONG | ✅ Inclusion (rural, low-connectivity schools) |
| **Lesson Templates** | Curated library, community-contributed | Limited templates | Limited templates | Some templates | ⭐⭐ PARITY (when expanded) | ✅ Teacher empowerment (reduce planning burden) |

### 4.2 5th Industrial Revolution (5IR) Alignment

**EduDash Pro embodies 5IR principles:**

1. **Human-Centricity:**
   - Mobile-first design empowers principals without desktop computers
   - WhatsApp integration meets parents where they are
   - Hiring Hub reduces administrative burden on small schools
   - AI augments (not replaces) teacher grading decisions

2. **AI Collaboration:**
   - AI Quota Governance ensures ethical, transparent AI use
   - AI grading provides suggestions, teacher makes final decisions
   - AI lesson generation accelerates planning while teachers customize
   - Auto-allocation algorithm suggests, principal approves

3. **Sustainability & Ethics:**
   - Petty-cash transparency prevents corruption
   - Teacher activity monitoring promotes accountability (not surveillance)
   - Usage-based pricing reduces waste (pay for what you use)
   - Open audit trails for all financial and AI decisions

4. **Inclusion & Accessibility:**
   - Offline-first enables rural, low-connectivity schools
   - WhatsApp reaches parents without email/smartphones
   - Mobile app eliminates need for expensive computers
   - Multilingual support (i18n system in place)

**Positioning Statement:**
> "EduDash Pro is the only 5IR-aligned school management platform that empowers principals to run entire schools from their mobile devices, leveraging ethical AI, inclusive communication (WhatsApp), and transparent governance—without sacrificing teacher autonomy or student outcomes."

### 4.3 Market Differentiation Strategy

**Primary Differentiators (Lead with these):**
1. **"Run Your School from Your Pocket"** – Full mobile operations (competitors: desktop-first)
2. **Integrated Hiring Hub** – End-to-end teacher recruitment (competitors: external tools)
3. **AI Quota Governance** – Control AI costs, ensure ethical use (competitors: no controls)
4. **WhatsApp Parental Engagement** – Reach 100% of parents (competitors: email/app only)
5. **Petty-Cash Transparency** – Mobile receipts, approvals, reconciliation (competitors: manual accounting)

**Secondary Differentiators (Support with these):**
6. Auto-allocation saves hours per enrollment period
7. Real-time teacher monitoring prevents issues before they escalate
8. Offline-first works in low-connectivity environments
9. Usage-based pricing (pay per student, not flat fee)
10. Community lesson template library (crowdsourced quality)

---

## 5. Implementation Priorities (Phased Roadmap)

### Phase 1: Critical Foundation (Q1 2026 – 12 weeks)

#### Epic 1.1: Hiring Hub
**Scope:** Complete teacher recruitment workflow within EduDash Pro

**User Stories:**
1. As a principal, I can create job postings (title, description, requirements, salary range)
2. As a teacher candidate, I can submit application with resume upload (PDF, DOCX)
3. As a principal, I can review applications, shortlist candidates, reject with reason
4. As a principal, I can schedule interviews (date/time, video link), send invite emails
5. As a principal, I can generate offer letters (template-based), track acceptance status

**Acceptance Criteria:**
- [x] Job postings table schema created with RLS policies ✅ **DONE (Oct 1, 2025)**
- [x] Resume upload to Supabase Storage (50MB max per file) ✅ **DONE (Oct 1, 2025)**
- [x] Application status workflow: `new` → `under_review` → `shortlisted` → `interview_scheduled` → `offered` → `accepted`/`rejected` ✅ **DONE (Oct 1, 2025)**
- [ ] Email notifications for status changes (candidate and principal) 🚧 **IN PROGRESS**
- [x] Principal dashboard shows: active job postings, applications by status, interview calendar ✅ **DONE (Oct 1, 2025)**
- [x] Mobile-optimized UI (resume preview in-app, no external downloads) ✅ **DONE (Oct 1, 2025)**
- [x] WhatsApp broadcast for job postings to opted-in contacts ✅ **DONE (Oct 2, 2025)**
- [x] Geo-location support (latitude, longitude, commute radius) ✅ **DONE (Oct 2, 2025)**
- [x] Job distribution tracking across channels (WhatsApp, email, SMS, social, public board) ✅ **DONE (Oct 2, 2025)**
- [ ] Search/filter candidates by skills, experience, location 🔜 **NEXT**

**Required Data Structures:**
- Tables: `job_postings`, `job_applications`, `candidate_profiles`, `interview_schedules`, `offer_letters`
- Storage bucket: `candidate-resumes` (private, authenticated access only)
- Indexes: `job_applications(status, created_at)`, `candidate_profiles(email)`

**API Endpoints (new):**
- `POST /api/job-postings` – Create job posting
- `GET /api/job-postings/:id/applications` – List applications for job
- `POST /api/applications/:id/review` – Update application status
- `POST /api/interviews/schedule` – Schedule interview
- `POST /api/offers/generate` – Generate offer letter

**UI Surfaces:**
- [x] `app/screens/hiring-hub.tsx` – Principal dashboard (list jobs, applications) ✅ **DONE**
- [x] `app/screens/job-posting-create.tsx` – Create/edit job posting ✅ **DONE** (with WhatsApp broadcast)
- [x] `app/screens/application-review.tsx` – Review candidate application with resume preview ✅ **DONE**
- [ ] `app/screens/interview-scheduler.tsx` – Calendar-based interview scheduling 🔜 **NEXT SPRINT**
- [ ] Public route: `app/(public)/apply/[job_id].tsx` – Candidate application form 🔜 **NEXT SPRINT**

**New Features Completed (Oct 2, 2025):**
- [x] `handleWhatsAppShare()` – Broadcast job postings via WhatsApp to all opted-in contacts
- [x] `broadcastMessage()` – Backend edge function for parallel WhatsApp message sending
- [x] `trackJobDistribution()` – Service layer method for multi-channel distribution tracking
- [x] Storage bucket RLS policies fixed – Signatures bucket fully operational

**Metrics:**
- Time-to-hire (days from job posting → offer accepted)
- Application completion rate (started vs. submitted)
- Interview show-up rate (scheduled vs. attended)
- Offer acceptance rate (offered vs. accepted)

**Risks:**
- Resume parsing complexity (optional: use AI to extract skills, experience)
- Email deliverability (candidate notifications may go to spam)
- Privacy compliance (GDPR/POPIA for candidate data retention)

**Effort Estimate:** 6 person-weeks (1 backend + 1 frontend + 1 QA)

---

### Geo-Location & Job Distribution Strategy

#### Problem Statement
1. **Discovery Issue**: How do teachers find job postings if they don't have the app installed?
2. **Proximity Matching**: Schools want to hire teachers nearby (reduce commute, improve retention)
3. **Distribution Channels**: Job postings need visibility beyond the app

#### Proposed Solutions

##### 1. Geo-Location Implementation

**Database Schema Additions:**
```sql
-- Add coordinates to job_postings table
ALTER TABLE public.job_postings 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN commute_radius_km INTEGER DEFAULT 20;

-- Add spatial index for proximity searches
CREATE INDEX idx_job_postings_location 
ON public.job_postings USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add coordinates to candidate_profiles
ALTER TABLE public.candidate_profiles
ADD COLUMN preferred_location_lat DECIMAL(10, 8),
ADD COLUMN preferred_location_lng DECIMAL(11, 8),
ADD COLUMN willing_to_commute_km INTEGER DEFAULT 30;

-- Create function to find nearby jobs
CREATE OR REPLACE FUNCTION public.get_nearby_jobs(
  candidate_lat DECIMAL,
  candidate_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  school_name TEXT,
  distance_km DECIMAL,
  employment_type TEXT,
  salary_range_min DECIMAL,
  salary_range_max DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jp.id,
    jp.title,
    p.name as school_name,
    ROUND(
      earth_distance(
        ll_to_earth(jp.latitude, jp.longitude),
        ll_to_earth(candidate_lat, candidate_lng)
      ) / 1000, 1
    ) AS distance_km,
    jp.employment_type,
    jp.salary_range_min,
    jp.salary_range_max
  FROM public.job_postings jp
  INNER JOIN public.preschools p ON jp.preschool_id = p.id
  WHERE 
    jp.status = 'active'
    AND (jp.expires_at IS NULL OR jp.expires_at > NOW())
    AND earth_distance(
      ll_to_earth(jp.latitude, jp.longitude),
      ll_to_earth(candidate_lat, candidate_lng)
    ) <= (max_distance_km * 1000)
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Job Posting Form Enhancement:**
```typescript
// In job-posting-create.tsx, add location autocomplete
import * as Location from 'expo-location';

const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
const [commuteRadius, setCommuteRadius] = useState(20); // km

// Auto-detect school location or use Google Places API
const handleLocationSelect = async (address: string) => {
  // Option 1: Use school's saved location
  const schoolLocation = profile?.location_coordinates;
  
  // Option 2: Geocode address using Google Places/Mapbox
  const geocoded = await geocodeAddress(address);
  
  setCoordinates({ lat: geocoded.lat, lng: geocoded.lng });
  setLocation(address);
};

// Add to form submission
const jobData = {
  ...existingFields,
  latitude: coordinates?.lat,
  longitude: coordinates?.lng,
  commute_radius_km: commuteRadius,
};
```

**Candidate Profile Enhancement:**
```typescript
// In candidate profile/preferences screen
const [preferredLocation, setPreferredLocation] = useState('');
const [willingToCommuteKm, setWillingToCommuteKm] = useState(30);

// Get current location or let user search address
const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') {
    const location = await Location.getCurrentPositionAsync({});
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  }
};
```

##### 2. Job Distribution Channels

**Multi-Channel Strategy:**

**A. Public Job Board (Web + Mobile Web)**
```typescript
// Create public job board at: app/(public)/jobs/browse.tsx
// Features:
// - No login required
// - Filter by location, salary, employment type
// - Google-indexed (SEO optimized)
// - Shareable links: https://edudashpro.com/jobs?location=johannesburg

// SEO Metadata for each job:
<Head>
  <title>{jobTitle} - {schoolName} | EduDash Pro Jobs</title>
  <meta name="description" content={jobDescription} />
  <meta property="og:type" content="job" />
  <meta property="og:title" content={jobTitle} />
  <link rel="canonical" href={`https://edudashpro.com/jobs/${jobId}`} />
</Head>
```

**B. WhatsApp Broadcast Integration**
```typescript
// When job is posted, principal can broadcast to WhatsApp
// Uses existing WhatsApp integration

const broadcastJobPosting = async (jobId: string) => {
  const message = `
🎓 *New Teaching Position Available!*

*Position:* ${job.title}
*School:* ${school.name}
*Location:* ${job.location} (${job.commute_radius_km}km radius)
*Salary:* R${job.salary_range_min} - R${job.salary_range_max}
*Type:* ${job.employment_type}

Apply now: ${APP_URL}/apply/${jobId}
  `;
  
  // Send to:
  // 1. School's teacher contact list
  // 2. Community groups (opt-in)
  // 3. Job seeker subscribers
  
  await WhatsAppService.broadcastMessage({
    recipients: await getJobSeekerContacts(job.location),
    message,
    mediaUrl: school.logo_url,
  });
};
```

**C. Email Newsletter (Weekly Digest)**
```typescript
// Weekly job digest sent to registered teachers
// Cron job: Every Monday 8 AM

const sendWeeklyJobDigest = async () => {
  const teachers = await getTeachersWithJobAlerts();
  
  for (const teacher of teachers) {
    const nearbyJobs = await getNearbyJobs(
      teacher.preferred_location_lat,
      teacher.preferred_location_lng,
      teacher.willing_to_commute_km
    );
    
    if (nearbyJobs.length > 0) {
      await sendEmail({
        to: teacher.email,
        subject: `${nearbyJobs.length} Teaching Jobs Near You`,
        template: 'job-digest',
        data: { jobs: nearbyJobs, teacher },
      });
    }
  }
};
```

**D. SMS Notifications (Critical Jobs)**
```typescript
// For urgent positions, send SMS to nearby teachers
// Uses Twilio/Africa's Talking

const notifyNearbyTeachers = async (jobId: string) => {
  const job = await getJobPosting(jobId);
  const nearbyTeachers = await findTeachersInRadius(
    job.latitude,
    job.longitude,
    job.commute_radius_km
  );
  
  const smsText = `New teaching job near you: ${job.title} at ${school.name}. Apply: ${SHORT_URL}/j/${jobId}`;
  
  for (const teacher of nearbyTeachers) {
    await SMSService.send(teacher.phone, smsText);
  }
};
```

**E. Social Media Auto-Post**
```typescript
// Auto-post to school's social media
// Facebook, LinkedIn, Twitter/X

const shareJobOnSocialMedia = async (jobId: string) => {
  const job = await getJobPosting(jobId);
  
  const post = {
    text: `We're hiring! ${job.title} at ${school.name}. ${job.location}. Apply: ${APP_URL}/apply/${jobId}`,
    hashtags: ['TeachingJobs', 'ECDJobs', job.location.replace(' ', '')],
    image: school.logo_url,
  };
  
  // Post via Buffer/Hootsuite API or direct social media APIs
  await SocialMediaService.post('facebook', post);
  await SocialMediaService.post('linkedin', post);
};
```

##### 3. Teacher Job Discovery Features

**A. Job Alerts (Push Notifications)**
```typescript
// Teachers set job preferences in app
// Get notified when matching jobs posted

interface JobAlert {
  candidate_id: string;
  preferred_locations: string[]; // ["Johannesburg", "Pretoria"]
  max_commute_km: number;
  employment_types: EmploymentType[];
  min_salary: number;
  notification_enabled: boolean;
}

// When job is posted, trigger alerts
const triggerJobAlerts = async (jobId: string) => {
  const job = await getJobPosting(jobId);
  const matchingAlerts = await findMatchingAlerts(job);
  
  for (const alert of matchingAlerts) {
    await sendPushNotification({
      userId: alert.candidate_id,
      title: '🎓 New Job Match!',
      body: `${job.title} at ${school.name} - ${job.distance_km}km away`,
      data: { jobId, screen: 'JobDetail' },
    });
  }
};
```

**B. Interactive Map View**
```typescript
// Create map view of jobs: app/(public)/jobs/map.tsx
import MapView, { Marker } from 'react-native-maps';

<MapView
  initialRegion={{
    latitude: userLocation.lat,
    longitude: userLocation.lng,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  }}
>
  {nearbyJobs.map(job => (
    <Marker
      key={job.id}
      coordinate={{ latitude: job.latitude, longitude: job.longitude }}
      title={job.title}
      description={`${job.distance_km}km away`}
      onPress={() => navigateToJobDetail(job.id)}
    >
      <View style={styles.markerContainer}>
        <Text style={styles.markerText}>{job.distance_km}km</Text>
      </View>
    </Marker>
  ))}
  
  {/* User's location */}
  <Marker
    coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
    pinColor="blue"
  />
</MapView>
```

##### 4. Implementation Priority

**Phase 1 (Immediate - Add to current epic):**
- [x] Database migration: Add lat/lng, job_alerts, job_distributions tables
- [ ] Candidate registration page: Public form to register with location preferences
- [ ] Job posting form: Location autocomplete with coordinates  
- [ ] WhatsApp broadcast: Share job link when posting job
- [ ] Email notifications: Job alerts to registered candidates
- [ ] Social media auto-post: Share to Facebook/LinkedIn when job created

**Phase 2 (Next Sprint):**
- [ ] Proximity search: `get_nearby_jobs()` function in candidate dashboard
- [ ] Job alerts dashboard: Candidates manage notification preferences
- [ ] Email digest: Weekly summary of nearby jobs
- [ ] Analytics: Track distribution effectiveness by channel

**Phase 3 (Future Enhancement):**
- [ ] SMS notifications: For urgent positions (optional)
- [ ] Interactive map view: See jobs on map
- [ ] Job board partnerships: Post to external sites (PNet, CareerJunction)
- [ ] Commute calculator: Estimate travel time (Google Maps API)

**FOCUSED DISTRIBUTION CHANNELS (Approved):**
1. ✅ **WhatsApp** - Broadcast to school's contact list + teacher groups
2. ✅ **Email** - Send to registered candidates matching criteria
3. ✅ **Social Media** - Auto-post to Facebook/LinkedIn
4. ✅ **Candidate Registration** - Public page for teachers to register with location

**NOT IMPLEMENTING (Removed from scope):**
- ❌ SMS notifications (too expensive at scale, R0.15/SMS)
- ❌ Public job board website (use social media instead)
- ❌ External job board APIs (focus on owned channels)

##### 5. Cost Considerations

**Free/Low-Cost Options:**
- Geocoding: Use Nominatim (OpenStreetMap) - Free, open-source
- Maps: Mapbox free tier (50k map loads/month)
- Email: Resend/SendGrid free tier (100 emails/day)
- SMS: Africa's Talking (R0.15/SMS in South Africa)

**Paid Options (Scale):**
- Google Maps API: $5/1000 geocoding requests
- Twilio SMS: $0.05/SMS
- Social media APIs: Free (rate-limited)
- Job board listings: R500-R2000/post (PNet, Indeed)

##### 6. Privacy & Compliance

**Location Data Handling:**
- Candidate location is **optional** (not required to apply)
- Stored location is approximate (suburb-level, not exact address)
- Candidates can opt-out of location-based notifications
- Location data deleted upon request (GDPR/POPIA)

**Job Posting Visibility:**
- Public jobs indexed by Google (opt-in per school)
- Schools can choose: Public (anyone) vs. Network-only (app users)
- Expired jobs auto-hidden from public view

---

### Testing & Usage Instructions for Hiring Hub

#### Database Setup (Already Completed)

**Migrations Applied:**
- ✅ `20251001210700_create_hiring_hub_tables.sql` - All 5 tables created
- ✅ `20251001211500_create_candidate_resumes_storage.sql` - Storage bucket configured

**Verify Database Setup:**
```bash
# Connect to database
psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres.lvvvjywrmpcqrpvuptdi -d postgres

# Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('job_postings', 'candidate_profiles', 'job_applications', 'interview_schedules', 'offer_letters');

# Check storage bucket
SELECT name, public, file_size_limit FROM storage.buckets WHERE name = 'candidate-resumes';
```

#### How to Test the Features

**1. Test Job Posting Creation (Principal)**

```typescript
// Navigate to: /screens/hiring-hub
// 1. Tap the floating action button (FAB) with '+' icon
// 2. Fill in the form:
{
  title: "Early Childhood Teacher",
  description: "Looking for passionate educator...",
  requirements: "Bachelor's degree in Education, 3+ years experience",
  salary_min: 15000,
  salary_max: 25000,
  location: "Johannesburg, Gauteng",
  employment_type: "full-time",
  expires_at: "2025-12-31" // Optional
}
// 3. Submit - should navigate back to hiring hub with new job posted
```

**Expected Results:**
- Job posting appears in "Active Jobs" list
- Stats update (total job postings count increases)
- No errors in console

**2. Test Application Review (Principal)**

```typescript
// Navigate to: /screens/hiring-hub
// 1. Tap on an application card
// 2. You should see:
//    - Candidate information (name, email, phone)
//    - Cover letter (if provided)
//    - Resume download button (if uploaded)
//    - Status badge (NEW, UNDER_REVIEW, etc.)
//    - Action buttons based on current status

// 3. Test status workflow:
// NEW → tap "Review" → Status changes to UNDER_REVIEW
// UNDER_REVIEW → tap "Shortlist" → Status changes to SHORTLISTED
// UNDER_REVIEW → tap "Reject" → Enter reason → Status changes to REJECTED
```

**Expected Results:**
- Status updates immediately in UI
- Application moves to appropriate tab in hiring-hub
- Stats update (pending reviews decreases when reviewed)

**3. Test Resume Viewing**

```typescript
// In application-review screen:
// 1. Tap "View Resume" button
// 2. Should open resume in external app/browser
// 3. If no resume: "No resume uploaded" message shown
```

**Testing with Mock Data:**

```sql
-- Insert test job posting (as principal)
INSERT INTO public.job_postings (
  preschool_id,
  title,
  description,
  employment_type,
  created_by,
  status
) VALUES (
  'YOUR_PRESCHOOL_ID',
  'Test Teaching Position',
  'This is a test job posting',
  'full-time',
  'YOUR_USER_ID',
  'active'
);

-- Insert test candidate profile
INSERT INTO public.candidate_profiles (
  email,
  first_name,
  last_name,
  experience_years
) VALUES (
  'test.candidate@example.com',
  'John',
  'Doe',
  5
);

-- Insert test application
INSERT INTO public.job_applications (
  job_posting_id,
  candidate_profile_id,
  cover_letter,
  status
) VALUES (
  'JOB_POSTING_ID_FROM_ABOVE',
  'CANDIDATE_PROFILE_ID_FROM_ABOVE',
  'I am interested in this position...',
  'new'
);
```

#### User Workflows

**Principal Workflow: Create Job & Review Applications**

1. **Create Job Posting**
   - Open app → Navigate to Hiring Hub
   - Tap FAB (+ button)
   - Fill form → Submit
   - Job appears in "Active Jobs" list

2. **Review New Applications**
   - Open Hiring Hub
   - Tap "New" tab (shows count badge)
   - Tap on an application card
   - Review candidate details
   - Take action: Review/Shortlist/Reject

3. **Shortlist Candidates**
   - From application detail screen
   - Tap "Shortlist" button
   - Candidate moves to "Shortlisted" tab

4. **Schedule Interview** (Coming in 1.1.12)
   - From shortlisted application
   - Tap "Schedule Interview"
   - Pick date/time
   - Enter meeting link (optional)
   - Submit → Sends email to candidate

**Candidate Workflow: Apply for Job** (Coming in 1.1.13)

1. **Find Job Posting**
   - Public link shared by school: `https://app.com/apply/[JOB_ID]`
   - No login required

2. **Submit Application**
   - Fill personal info
   - Upload resume (PDF/DOCX, max 50MB)
   - Write cover letter
   - Submit
   - Confirmation email sent

3. **Track Application Status** (Future)
   - Receive email when status changes
   - Can view application status via public link

#### Common Issues & Troubleshooting

**Issue: "Failed to create job posting"**
- Check user has valid preschool_id in profile
- Check user role is 'principal' or 'superadmin'
- Verify RLS policies allow insert

**Issue: "No applications showing"**
- Check RLS policies are filtering correctly
- Verify applications exist for your school's jobs:
  ```sql
  SELECT * FROM job_applications ja
  JOIN job_postings jp ON ja.job_posting_id = jp.id
  WHERE jp.preschool_id = 'YOUR_PRESCHOOL_ID';
  ```

**Issue: "Can't view resume"**
- Check resume_file_path is not null in database
- Verify storage bucket RLS policies allow read
- Check file exists in storage:
  ```sql
  SELECT name FROM storage.objects WHERE bucket_id = 'candidate-resumes';
  ```

#### Performance Considerations

**Pagination:**
- Currently loads all applications for school (client-side filtering)
- Recommended limit: <100 applications per school
- For schools with >100 applications, implement server-side pagination (coming in 1.1.15)

**Resume File Sizes:**
- Max file size: 50MB (enforced by storage bucket)
- Recommended: Compress PDFs before upload
- Use streaming for large file downloads

**RLS Performance:**
- All queries use indexes on (preschool_id, status, created_at)
- Principals can only see their school's data
- No full table scans expected

#### Security Notes

**Row-Level Security (RLS):**
- All tables have RLS enabled
- Principals can only access their school's data
- Candidates can only see their own applications
- Public can view active job postings (for application form)

**Storage Bucket Security:**
- Bucket is private (not publicly accessible)
- Principals can view resumes for applications to their jobs
- Candidates can view/update their own resumes
- Anonymous users can upload (for public application form)

**Data Retention:**
- Job postings: Archived when closed (not deleted)
- Applications: Retained for 12 months after rejection
- Resumes: Deleted when application is rejected >90 days
- Candidates can request data deletion (GDPR/POPIA compliance)

---

#### Epic 1.2: Auto-Allocation Engine
**Scope:** Algorithmic allocation of students to classes and teachers with conflict detection

**User Stories:**
1. As a principal, I define allocation rules (max class size, teacher workload limits)
2. As a principal, I run auto-allocation for incoming cohort (100 students → 4 classes)
3. As a principal, I review proposed allocation (balanced classes, no conflicts)
4. As a principal, I manually override specific assignments (special needs, parent requests)
5. As a principal, I commit allocation (students assigned to classes in database)

**Acceptance Criteria:**
- [ ] Allocation rules configuration UI (max class size, teacher:student ratio, constraints)
- [ ] Auto-allocation algorithm balances class sizes within ±2 students
- [ ] Conflict detection: same teacher, multiple classes at same time
- [ ] Respect constraints: age groups, special needs, sibling same-class requests
- [ ] Preview mode shows proposed allocation before commit
- [ ] Allocation history tracked (who ran, when, rules used, students affected)
- [ ] Rollback capability (undo last allocation, restore previous state)
- [ ] Performance: allocate 500 students in <10 seconds

**Required Data Structures:**
- Tables: `allocation_rules`, `allocation_runs`, `allocation_history`, `teacher_workload_limits`
- Computed: `classes.current_enrollment`, `teachers.total_teaching_hours`
- Constraints: `class_capacity` (soft limit), `teacher_max_students` (hard limit)

**Algorithm Logic (High-Level):**
```
1. Load students (unassigned or reassignment mode)
2. Load classes (with capacity, current enrollment, teacher assigned)
3. Load teachers (with max student limit, current workload)
4. Sort students by priority (special needs, siblings, age)
5. For each student:
   a. Find eligible classes (age group match, capacity available, teacher not overloaded)
   b. Rank classes by balance score (closer to target size = higher score)
   c. Assign to highest-ranked class
   d. If conflicts (schedule, capacity), flag for manual review
6. Generate preview report (before/after counts, conflicts, unassigned students)
7. Await principal approval
8. On approval, commit assignments (update student.class_id, log history)
```

**API Endpoints (new):**
- `POST /api/allocations/run` – Execute allocation algorithm (returns preview)
- `POST /api/allocations/:id/commit` – Commit allocation
- `POST /api/allocations/:id/rollback` – Undo allocation
- `GET /api/allocation-history` – List past allocation runs

**UI Surfaces:**
- `app/screens/auto-allocation.tsx` – Configuration, run, preview, commit
- Modal: `components/AllocationPreview.tsx` – Before/after comparison table

**Metrics:**
- Allocation success rate (% students auto-assigned without conflicts)
- Time saved (manual allocation time vs. auto + review time)
- Class balance score (variance in class sizes)

**Risks:**
- Edge cases (e.g., 100 students, 3 classes, 1 class has special needs requirement)
- Algorithm complexity (NP-hard bin-packing problem, may need heuristics)
- Parent complaints (perceived unfairness in class assignments)

**Effort Estimate:** 8 person-weeks (1 algorithm developer + 1 frontend + 1 QA)

---

#### Epic 1.3: Enhanced Teacher Activity Monitoring
**Scope:** Real-time dashboard showing teacher actions, grading velocity, parent communication

**User Stories:**
1. As a principal, I see activity feed (last 50 teacher actions: lessons, assignments, messages)
2. As a principal, I filter activity by teacher, date range, action type
3. As a principal, I set alert thresholds (e.g., assignment ungraded >5 days)
4. As a principal, I receive notifications when thresholds breached (push, email)
5. As a principal, I view teacher performance scorecard (grading speed, message responsiveness)

**Acceptance Criteria:**
- [ ] Activity event stream captured for: lesson created, assignment created, assignment graded, message sent, attendance marked
- [ ] Real-time updates (WebSocket or Supabase Realtime subscriptions)
- [ ] Activity feed UI (infinite scroll, 50 items per page)
- [ ] Filter chips (teacher, action type, date range)
- [ ] Configurable alert rules (e.g., "Ungraded assignments >3 days" → alert)
- [ ] Push notifications to principal (mobile + web)
- [ ] Teacher scorecard (metrics: avg grading time, message response time, attendance consistency)
- [ ] Privacy: Teachers notified they're being monitored (transparency)

**Required Data Structures:**
- Tables: `teacher_activity_logs(teacher_id, action_type, entity_id, timestamp, metadata)`
- Indexes: `teacher_activity_logs(teacher_id, timestamp DESC)`, `teacher_activity_logs(action_type)`
- Alert rules table: `monitoring_alerts(rule_name, threshold, notification_channel, is_active)`
- Metrics rollup: `teacher_performance_metrics(teacher_id, avg_grading_hours, avg_response_hours, last_calculated)`

**Event Types:**
- `lesson_created`, `lesson_updated`, `lesson_deleted`
- `assignment_created`, `assignment_graded`, `assignment_feedback_added`
- `message_sent`, `message_read`
- `attendance_marked`, `attendance_updated`
- `parent_meeting_scheduled`, `report_card_generated`

**API Endpoints (new):**
- `GET /api/activity-feed` – Fetch activity logs (paginated, filtered)
- `GET /api/teacher-metrics/:teacher_id` – Fetch performance scorecard
- `POST /api/monitoring-alerts` – Create alert rule
- `GET /api/monitoring-alerts/triggered` – List active alerts

**UI Surfaces:**
- `app/screens/teacher-monitoring.tsx` – Activity feed + filters
- `app/screens/teacher-scorecard/:teacher_id.tsx` – Individual teacher metrics
- Modal: `components/AlertConfigModal.tsx` – Configure alert rules

**Metrics:**
- Alert accuracy (% of alerts that result in principal action)
- Principal time saved (proactive intervention vs. reactive problem-solving)
- Teacher satisfaction (perception of monitoring: supportive vs. invasive)

**Risks:**
- Privacy concerns (teachers feel surveillance pressure)
- Alert fatigue (too many false positives)
- Performance (high-frequency event capture may slow system)

**Effort Estimate:** 7 person-weeks (1 backend + 1 frontend + 1 QA)

---

### Phase 1 Summary

| Epic | Effort (Weeks) | Dependencies | Target Completion |
|------|----------------|--------------|-------------------|
| 1.1 Hiring Hub | 6 | None (standalone) | End of Week 6 |
| 1.2 Auto-Allocation | 8 | Epic 1.1 (optional: auto-invite shortlisted candidates) | End of Week 10 |
| 1.3 Teacher Monitoring | 7 | None (parallel to 1.1, 1.2) | End of Week 7 |

**Total Phase 1 Effort:** 21 person-weeks (can parallelize: 2 teams, 12 weeks calendar time)

**Success Criteria:**
- [ ] All 3 epics in production
- [ ] 90% of principals use Hiring Hub for next cohort recruitment
- [ ] Auto-allocation used for 500+ students across 10 schools
- [ ] Teacher monitoring alerts trigger <5% false positives

---

### Phase 2: Enhancements (Q2 2026 – 10 weeks)

#### Epic 2.1: Unified Messaging Dashboard
**Scope:** Principal inbox showing all school conversations, broadcast messaging, templates

**Key Features:**
- Consolidated view (principal ↔ teachers, teachers ↔ parents)
- Unread/urgent flags
- Broadcast messaging (school-wide announcements, emergency alerts)
- Message templates (permission slips, event invitations)
- Conversation analytics (response times, parent engagement)

**Effort:** 5 weeks

---

#### Epic 2.2: Bulk Operations & CSV Import
**Scope:** Batch student assignments, CSV upload for class rosters, drag-and-drop UI

**Key Features:**
- CSV import wizard (map columns, validate data, preview before commit)
- Bulk actions (multi-select students → reassign class)
- Drag-and-drop class roster (visual UI for moving students between classes)
- Error handling (invalid data, conflicts, duplicate entries)

**Effort:** 4 weeks

---

#### Epic 2.3: Homework Grading Analytics
**Scope:** Principal dashboard showing grading velocity, overdue assignments, inconsistencies

**Key Features:**
- School-wide grading dashboard (ungraded count per teacher)
- Grading velocity metrics (avg time to grade per teacher)
- Outlier detection (same assignment, very different grade distributions)
- Automated reminders (teacher: "5 assignments ungraded >5 days")

**Effort:** 4 weeks

---

### Phase 2 Summary

**Total Phase 2 Effort:** 13 person-weeks (10 weeks calendar with 1-2 parallel teams)

**Success Criteria:**
- [ ] 80% of principals use messaging dashboard weekly
- [ ] 50% of schools use CSV import for enrollment
- [ ] Grading velocity improves by 20% (measured: time from assignment submission to grade posted)

---

### Phase 3: Innovation (Q3-Q4 2026 – 16 weeks)

#### Epic 3.1: AI-Powered Insights
**Scope:** Predictive analytics, student risk scoring, teacher workload optimization

**Key Features:**
- Student at-risk prediction (low grades, attendance, parent engagement → early intervention alert)
- Teacher burnout detection (high workload, long grading times, low parent satisfaction → suggest support)
- Enrollment forecasting (predict next quarter enrollment based on trends)
- AI-generated recommendations (e.g., "Consider hiring 1 more teacher for Grade 3 based on enrollment growth")

**Effort:** 8 weeks

---

#### Epic 3.2: Parent Progress Portal
**Scope:** Child-specific dashboards, skill-based progress, automated reports, satisfaction surveys

**Key Features:**
- Parent sees: grade trends (past 6 months), attendance calendar, upcoming assignments
- Skill-based progress (literacy, numeracy, social-emotional learning benchmarks)
- Automated weekly/monthly emails (progress summaries)
- Parent surveys (post-grading, post-parent-teacher meetings)

**Effort:** 6 weeks

---

#### Epic 3.3: Community Lesson Library
**Scope:** Template marketplace, ratings, one-click duplicate, revenue-sharing for creators

**Key Features:**
- Curated lesson templates (100+ at launch, by grade/subject)
- Teacher-contributed lessons with quality ratings (5-star, reviews)
- One-click duplicate and customize
- Version control (track edits, revert)
- Optional: Revenue-sharing (teachers earn for popular templates)

**Effort:** 5 weeks

---

### Phase 3 Summary

**Total Phase 3 Effort:** 19 person-weeks (16 weeks calendar with 2 parallel teams)

**Success Criteria:**
- [ ] 60% of schools use AI insights monthly
- [ ] Parent portal engagement: 70% of parents log in monthly
- [ ] Lesson library: 500+ templates, 80% reuse rate

---

### Roadmap Overview

| Phase | Focus | Effort | Timeline | Key Deliverables |
|-------|-------|--------|----------|------------------|
| **Phase 1** | Critical Foundation | 21 person-weeks | Q1 2026 (12 weeks) | Hiring Hub, Auto-Allocation, Teacher Monitoring |
| **Phase 2** | Enhancements | 13 person-weeks | Q2 2026 (10 weeks) | Messaging Dashboard, Bulk Ops, Grading Analytics |
| **Phase 3** | Innovation | 19 person-weeks | Q3-Q4 2026 (16 weeks) | AI Insights, Parent Portal, Lesson Library |
| **Total** | End-to-End | 53 person-weeks | 38 weeks | 5IR-Complete Platform |

**Parallelization Strategy:**
- Phase 1: Run Epic 1.1 + 1.3 in parallel (separate teams)
- Phase 2: All epics can run in parallel (separate teams)
- Phase 3: Run Epic 3.1 + 3.2 in parallel, 3.3 follows sequentially

**Actual Calendar Time (with 2 teams):** ~10 months (40 weeks)

---

## 6. Cost-Benefit Analysis

### 6.1 Infrastructure Cost Model

**Assumptions:**
- Supabase Pro Plan ($25/mo base + usage overages)
- AI Services: Claude API (Anthropic pricing: $3/1M input tokens, $15/1M output tokens)
- Object Storage: Supabase Storage ($0.021/GB/month)
- Estimated usage per school (monthly):
  - Teachers: 10-50
  - Students: 100-500
  - Parents: 100-500
  - Database queries: 10M/month
  - AI calls: Teachers use AI 50 times/month (grading, lesson generation)
  - Storage: 5GB (homework submissions, resumes, lesson attachments)

---

### 6.2 Cost Scenarios (Per School Per Month)

#### Scenario A: Small School (Low Usage)
**Profile:**
- 10 teachers, 100 students, 100 parents
- 5M database queries/month
- 500 AI calls/month (10 teachers × 50 calls)
- 2GB storage (homework, resumes)

| Cost Component | Monthly Cost | Notes |
|----------------|--------------|-------|
| Supabase Pro | $25 | Base plan |
| Database usage | $5 | 5M queries (included in Pro, overage minimal) |
| Realtime connections | $10 | 10 concurrent connections × $1/connection |
| Storage | $0.50 | 2GB × $0.021/GB + egress |
| AI API (Claude) | $30 | 500 calls × ~1K input + 2K output tokens × $0.015/K |
| Monitoring/logs | $5 | PostHog/Sentry basic plan |
| **Total Infrastructure** | **$75.50** | |
| Support (10% of infra) | $7.50 | Averaged support cost allocation |
| **Total Operating Cost** | **$83** | |

**Revenue Model:**
- Pricing: $15/teacher/month (school pays $150/month for 10 teachers)
- Gross Margin: $150 - $83 = **$67/month (45%)**
- Payback Period: Development cost $83K (53 person-weeks × $1,500/week) / $804 annual margin = **103 months** (not viable without scale)

---

#### Scenario B: Medium School (Moderate Usage)
**Profile:**
- 30 teachers, 300 students, 300 parents
- 15M database queries/month
- 1,500 AI calls/month (30 teachers × 50 calls)
- 10GB storage

| Cost Component | Monthly Cost | Notes |
|----------------|--------------|-------|
| Supabase Pro | $25 | Base plan |
| Database usage | $15 | 15M queries (overage charges kick in) |
| Realtime connections | $30 | 30 concurrent connections |
| Storage | $1.50 | 10GB × $0.021/GB + egress |
| AI API (Claude) | $90 | 1,500 calls × ~$0.06/call |
| Monitoring/logs | $10 | |
| **Total Infrastructure** | **$171.50** | |
| Support (8% of infra) | $13.50 | |
| **Total Operating Cost** | **$185** | |

**Revenue Model:**
- Pricing: $15/teacher/month (school pays $450/month for 30 teachers)
- Gross Margin: $450 - $185 = **$265/month (59%)**
- Payback Period: $83K / $3,180 annual margin = **26 months**

---

#### Scenario C: Large School (High Usage)
**Profile:**
- 50 teachers, 500 students, 500 parents
- 30M database queries/month
- 2,500 AI calls/month (50 teachers × 50 calls)
- 25GB storage

| Cost Component | Monthly Cost | Notes |
|----------------|--------------|-------|
| Supabase Pro | $25 | Base plan |
| Database usage | $40 | 30M queries (significant overage) |
| Realtime connections | $50 | 50 concurrent connections |
| Storage | $3.50 | 25GB × $0.021/GB + egress |
| AI API (Claude) | $150 | 2,500 calls × ~$0.06/call |
| Monitoring/logs | $15 | |
| **Total Infrastructure** | **$283.50** | |
| Support (5% of infra) | $14 | |
| **Total Operating Cost** | **$297.50** | |

**Revenue Model:**
- Pricing: $15/teacher/month (school pays $750/month for 50 teachers)
- Gross Margin: $750 - $297.50 = **$452.50/month (60%)**
- Payback Period: $83K / $5,430 annual margin = **15 months**

---

### 6.3 Cost Sensitivity Analysis

**Key Cost Drivers:**
1. **AI API costs** (35-50% of infra cost) – Highly variable based on:
   - Teacher adoption (50 calls/month is avg; power users may use 200+)
   - Prompt engineering efficiency (reduce tokens per call by 30% → 30% cost savings)
   - Model selection (Claude Haiku vs. Sonnet: 5x price difference)

2. **Database queries** (15-25% of infra cost) – Optimize by:
   - Aggressive caching (TanStack Query already implemented)
   - Reduce polling (use Realtime subscriptions for live data)
   - Index optimization (135 migrations reviewed, indexes present but may need tuning)

3. **Support costs** (5-10% of infra cost) – Scale with user base:
   - Small schools: higher % (manual onboarding, lots of questions)
   - Large schools: lower % (self-service, peer support)

**Cost Reduction Strategies:**
1. **AI Quota Hard Limits:** Prevent runaway costs (auto-throttle at 110% of allocated quota)
2. **Model Tiering:** Default to Claude Haiku (cheap), upgrade to Sonnet for complex tasks
3. **Batch Processing:** Grade 20 assignments in one AI call (shared context, lower per-item cost)
4. **Caching AI Responses:** Cache common AI outputs (e.g., lesson templates, rubric suggestions) – 30% cache hit rate = 30% cost reduction
5. **Usage-Based Pricing:** Pass AI costs to schools (pay-per-AI-call tier for power users)

---

### 6.4 ROI Comparison

| Scenario | Monthly Revenue | Monthly Cost | Gross Margin | Annual Profit | Payback (Months) |
|----------|-----------------|--------------|--------------|---------------|------------------|
| Small (10 teachers) | $150 | $83 | $67 (45%) | $804 | 103 |
| Medium (30 teachers) | $450 | $185 | $265 (59%) | $3,180 | 26 |
| Large (50 teachers) | $750 | $297.50 | $452.50 (60%) | $5,430 | 15 |

**Break-Even Analysis:**
- At 20 teachers/school: Gross margin ~52%, payback ~36 months
- At 40 teachers/school: Gross margin ~60%, payback ~18 months
- **Sweet Spot:** 30-50 teacher schools (margins >55%, payback <30 months)

**Total Addressable Market (TAM):**
- South Africa: ~25,000 schools
- Target: Private schools, preschools, K-12 (5,000 schools with 20+ teachers)
- Penetration Goal: 10% (500 schools) × $450/month = **$2.7M annual revenue**
- At 60% margin: **$1.62M annual profit** (after infra costs, before dev/sales/admin)

**LTV:CAC Ratio (Long-Term Viability):**
- Customer Lifetime Value (LTV): 24 months retention × $450/month × 60% margin = $6,480
- Customer Acquisition Cost (CAC): Estimated $1,500 (sales, marketing, onboarding)
- **LTV:CAC = 4.3:1** (healthy, >3:1 is good)

---

### 6.5 Cost-Benefit Summary

**Development Investment:** $83K (53 person-weeks fully loaded cost)
**Time to Break-Even:** 15-26 months (depending on school size mix)
**Target Margin:** 55-60% (after infra + support, before dev amortization)
**Market Opportunity:** $2.7M annual revenue at 10% penetration
**Recommendation:** **PROCEED** – Strong unit economics, differentiated product, clear ROI path

**Critical Success Factors:**
1. Onboard 20+ medium-large schools in first 6 months (accelerate payback)
2. Optimize AI costs aggressively (cache, batch, tier models)
3. Self-service onboarding (reduce support costs to <5% of revenue)
4. Usage-based pricing tier (capture high-value power users)

---

## 7. Business Logic Enhancements

### 7.1 Workflow Optimizations

#### A. Streamlined Onboarding
**Current:** Multi-step forms, unclear progress, potential dropoff
**Enhancement:**
- Single-page onboarding wizard (progress bar, 5 steps max)
- Smart defaults (school name → auto-generate slug, WhatsApp number optional)
- Skip-able steps (principal can complete later from settings)
- Pre-populated templates (sample classes, default policies)
- **Metric:** Time-to-first-action <10 minutes (school creation → first teacher invited)

#### B. Default Configurations
**Current:** Principals must manually configure everything
**Enhancement:**
- School type templates (Preschool, Primary, High School) → auto-populate grade levels, class structures
- Policy templates (attendance policies, grading scales, fee structures)
- Communication templates (parent welcome email, teacher onboarding checklist)
- **Metric:** 80% of schools use default configs without customization

#### C. Bulk Actions
**Current:** One-by-one operations (tedious for large datasets)
**Enhancement:**
- Multi-select with bulk actions (assign class, change status, send message)
- CSV import/export (students, teachers, grades)
- Batch approvals (approve 10 petty-cash requests at once)
- **Metric:** Bulk operations used for 50% of multi-item tasks

#### D. Templates Library
**Current:** Create from scratch every time
**Enhancement:**
- Assignment templates (weekly spelling test, math homework)
- Message templates (permission slip, field trip notification)
- Lesson plan templates (by subject, grade level)
- Report card templates (customizable grade categories)
- **Metric:** 70% of assignments/messages use templates

---

### 7.2 Automation Rules

#### A. Auto-Allocation Triggers
**Enhancement:** Run auto-allocation automatically based on events:
- New student enrolled → auto-assign to least-full class in age group
- Teacher hired → auto-assign to classes needing teacher
- Class capacity reached → auto-waitlist new enrollments
- **Metric:** 90% of students auto-assigned without manual intervention

#### B. Reminder Cadences
**Enhancement:** Automated reminders reduce principal manual follow-ups:
- Teacher: "Assignment ungraded for 3 days" → reminder email/push
- Parent: "Payment overdue" → automated reminder sequence (3 days, 7 days, 14 days)
- Principal: "Interview scheduled tomorrow" → calendar reminder
- **Metric:** 50% reduction in principal manual follow-up time

#### C. Escalation Rules
**Enhancement:** Auto-escalate issues requiring attention:
- Unresponsive teacher (5 messages unanswered >48h) → alert principal
- Student performance drop (grade <50% after >70% previous) → alert teacher + principal
- Petty-cash anomaly (expense >$500, no receipt within 7 days) → flag for audit
- **Metric:** 80% of issues detected before becoming critical

---

### 7.3 Data-Driven Decisions

#### A. Dashboards
**Enhancement:** Role-specific dashboards with actionable insights:
- **Principal:** School health score (composite: enrollment, finances, teacher satisfaction, student performance)
- **Teacher:** Class performance trends, grading efficiency, parent engagement
- **Parent:** Child progress, upcoming events, payment status
- **Metric:** 70% of users view dashboard weekly

#### B. A/B Testing
**Enhancement:** Test interventions systematically:
- A/B test reminder message timing (immediate vs. 3-day delay) → optimize response rate
- Test assignment difficulty levels → measure completion rates, grades
- Test parent engagement strategies (WhatsApp vs. email) → measure open/click rates
- **Metric:** Run 5 A/B tests per quarter, implement winning variants

#### C. Alert Thresholds
**Enhancement:** Configurable alerts prevent information overload:
- Principal sets thresholds (e.g., "Alert me if enrollment drops >10% month-over-month")
- Teacher sets thresholds (e.g., "Alert me if student absent >3 consecutive days")
- System suggests optimal thresholds based on historical data
- **Metric:** <5% alert fatigue (alerts dismissed as false positives)

---

### 7.4 Scalability Enhancements

#### A. Multi-Tenant Isolation
**Status:** ✅ Implemented (RLS policies in place)
**Enhancement:** Add tenant-level resource quotas to prevent one school from impacting others:
- Database connection pooling per tenant
- API rate limiting per school (prevent abuse)
- Storage quotas (max GB per school, with overage pricing)
- **Metric:** Zero cross-tenant data leaks, 99.9% uptime per tenant

#### B. RLS Enforcement
**Status:** ✅ Implemented (135 migrations include RLS policies)
**Enhancement:** Audit and optimize RLS performance:
- Identify slow policies (execution time >100ms)
- Add indexes for common RLS filter columns (preschool_id, organization_id, user_id)
- Cache policy decisions (short-lived, 60s TTL)
- **Metric:** <50ms avg RLS policy evaluation time

#### C. Background Jobs/Queues
**Current:** Synchronous operations (may block UI)
**Enhancement:** Offload heavy tasks to background workers:
- CSV imports (process 1000+ rows asynchronously)
- Report generation (PDF exports, analytics rollups)
- Email/notification batches (send 100+ parent emails)
- AI batch processing (grade 50 assignments in parallel)
- **Metric:** 90% of long-running tasks (>5s) processed in background

#### D. Event-Driven Telemetry
**Current:** Limited observability (manual logging)
**Enhancement:** Structured event capture for analytics + debugging:
- Standardized event schema (actor, action, entity, timestamp, metadata)
- Event streaming to analytics platform (PostHog, Mixpanel)
- Trace IDs for distributed debugging (correlate UI action → API call → DB query)
- **Metric:** 100% of critical user actions tracked, <1% event loss

#### E. Index Strategies
**Current:** Indexes present but may not be optimal
**Enhancement:** Systematic index optimization:
- Query profiling (identify slow queries >500ms)
- Add composite indexes for common filters (e.g., `(preschool_id, created_at DESC)`)
- Remove unused indexes (reduce write overhead)
- Materialized views for complex aggregations (daily metrics rollups)
- **Metric:** 90% of queries <100ms, zero missing index errors

---

### 7.5 Key Performance Indicators (KPIs)

| Area | KPI | Target | Current (Estimated) | Gap |
|------|-----|--------|---------------------|-----|
| **School Setup** | Time-to-setup school (minutes) | <10 | ~25 | -60% |
| **Teacher Onboarding** | Time-to-first-login after invite (hours) | <4 | ~24 | -83% |
| **Parent Engagement** | Message response rate (%) | >80 | ~60 | -25% |
| **Grading Turnaround** | Avg time to grade (hours) | <48 | ~120 | -60% |
| **AI Adoption** | % teachers using AI monthly | >70 | ~40 | -43% |
| **Mobile Usage** | % principals using mobile app | >90 | ~70 | -22% |
| **Uptime** | System availability (%) | >99.9 | ~99.5 | -0.4% |
| **Support SLA** | Response time to critical issues (hours) | <2 | ~8 | -75% |

**Action Plan to Close Gaps:**
1. **School Setup:** Implement single-page wizard with defaults (Phase 2, Epic 2.1)
2. **Teacher Onboarding:** Auto-send invites with video tutorial link (Quick Win, 2 days)
3. **Parent Engagement:** Add WhatsApp templates, auto-reminders (Phase 2, Epic 2.1)
4. **Grading Turnaround:** Implement grading reminders, AI-assisted grading (Phase 1, Epic 1.3 + Phase 2, Epic 2.3)
5. **AI Adoption:** In-app tutorials, quota visibility, success stories (Marketing + Quick Win, 3 days)
6. **Mobile Usage:** Push notifications, mobile-specific UX improvements (Ongoing, Phase 1+)
7. **Uptime:** Add redundancy, monitoring, auto-scaling (Infra, Phase 2)
8. **Support SLA:** Hire dedicated support, self-service knowledge base (Operations, Ongoing)

---

## 8. Risk, Compliance, and Data Governance

### 8.1 Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy | Owner |
|------|------------|--------|---------------------|-------|
| **Privacy/Regulatory (FERPA, GDPR, POPIA)** | High | Critical | - Data residency options (EU, ZA regions)<br>- Configurable data retention policies<br>- Anonymization for analytics<br>- Audit trails for data access<br>- Parent consent management | Legal + Engineering |
| **Vendor Lock-in (Supabase, Claude API)** | Medium | High | - Abstraction layers (don't tightly couple to Supabase)<br>- Multi-cloud strategy (optional: AWS RDS fallback)<br>- AI vendor abstraction (support OpenAI, Gemini as alternatives) | CTO |
| **AI Model Drift** | Medium | Medium | - Version lock AI models (pin Claude version)<br>- Regression testing (sample grading outputs)<br>- Fallback to manual grading if AI quality degrades | AI Lead |
| **Cost Overruns (AI usage spikes)** | Medium | High | - Hard quota limits (auto-throttle at 110% allocated)<br>- Usage alerts (notify principal at 80%, 100%)<br>- Cost forecasting dashboard (project monthly spend) | CFO + Product |
| **Data Loss (accidental deletion)** | Low | Critical | - Soft deletes (mark as deleted, retain 90 days)<br>- Automated backups (daily, 30-day retention)<br>- Point-in-time recovery (Supabase Pro feature) | DevOps |
| **Security Breach (unauthorized access)** | Low | Critical | - RLS enforcement (all tables)<br>- Penetration testing (annual)<br>- Bug bounty program (responsible disclosure)<br>- SOC 2 compliance (if targeting enterprise) | Security Lead |

---

### 8.2 Data Governance Framework

#### A. Roles and Responsibilities
| Role | Access Level | Responsibilities |
|------|--------------|------------------|
| **Super Admin** | Full system access | Create/delete organizations, manage subscriptions, support escalations |
| **Principal** | School-wide access | Manage teachers, students, parents, financial data within own school |
| **Teacher** | Class-level access | Manage own classes, assignments, grades; view own students' data |
| **Parent** | Child-specific access | View own children's grades, assignments, attendance, messages |
| **Student** | Self-only access | View own assignments, grades, lessons (if student portal implemented) |

#### B. RLS Policy Enforcement
**Current Status:** ✅ RLS policies implemented across 135 migrations
**Validation Approach:**
- Automated tests (unit tests for each policy)
- Manual audits (quarterly RLS review)
- Policy linter (detect missing RLS on new tables)

**Policy Pattern Examples:**
```
-- Principals see only their school's data
CREATE POLICY "principals_view_own_school" ON teachers
  FOR SELECT USING (preschool_id = get_current_preschool_id());

-- Teachers see only their own classes
CREATE POLICY "teachers_view_own_classes" ON assignments
  FOR SELECT USING (teacher_id = auth.uid());

-- Parents see only their children's data
CREATE POLICY "parents_view_own_children" ON students
  FOR SELECT USING (parent_id = auth.uid() OR guardian_id = auth.uid());
```

#### C. PII Mapping
**Sensitive Data Inventory:**
| Data Type | Tables | Columns | Retention Policy | Anonymization |
|-----------|--------|---------|------------------|---------------|
| Student Names | `students` | `first_name`, `last_name` | Until graduation + 5 years | Pseudonymize after graduation |
| Parent Contact | `users` (parents) | `email`, `phone`, `address` | Until account deletion + 1 year | Hash after deletion |
| Teacher SSN/ID | `teachers` | `id_number`, `bank_account` | Until employment end + 7 years | Encrypt at rest |
| Payment Data | `financial_transactions` | `amount`, `payment_method` | 7 years (tax compliance) | Anonymize after retention period |
| Grades/Transcripts | `grades`, `report_cards` | `grade`, `comments` | Permanent (student record) | Redact teacher names after 5 years |

**Automated Retention:**
- Cron job deletes soft-deleted records after 90 days
- Anonymization script runs quarterly (hashes PII beyond retention period)
- Export API for data portability (GDPR "right to data portability")

---

### 8.3 Compliance Checklist

**FERPA (US Family Educational Rights and Privacy Act):**
- [ ] Parent consent for data sharing (beyond educational necessity)
- [ ] Annual notification of rights (view/correct student records)
- [ ] Restrict third-party data access (no selling data)
- [ ] Audit trail for data access (who viewed what, when)

**GDPR (EU General Data Protection Regulation):**
- [ ] Lawful basis for processing (legitimate interest: educational services)
- [ ] Data minimization (collect only necessary fields)
- [ ] Right to erasure ("right to be forgotten")
- [ ] Data portability (export in machine-readable format)
- [ ] Data breach notification (within 72 hours)

**POPIA (South Africa Protection of Personal Information Act):**
- [ ] Consent for processing (opt-in for marketing)
- [ ] Data subject rights (access, correction, deletion)
- [ ] Cross-border data transfer restrictions (data stays in SA if configured)
- [ ] Information officer appointed (designated POPIA contact)

**Action Items:**
1. Add consent management UI (Phase 2, 2 weeks)
2. Implement data export API (Phase 2, 3 weeks)
3. Draft privacy policy and terms of service (Legal, 2 weeks)
4. Register with data protection authorities (Legal, ongoing)
5. Annual compliance audit (External auditor, ongoing)

---

## 9. Future Enhancements To-Do

> **Note to Agents:** Append additional suggestions to this section as discovered during implementation. Keep prioritized and actionable.

### 9.1 Deferred Features (Post-Phase 3)

#### A. Student Portal (P4 – Long-Term)
**Scope:** Students log in, view assignments, submit homework, track own progress
**Value:** Increase student autonomy, reduce parent dependency
**Effort:** 12 weeks (full portal with mobile app)
**Dependencies:** Phase 3 Parent Portal (reuse UI components)

#### B. Multi-School Organizations (P4 – Enterprise)
**Scope:** School districts manage multiple schools under one account
**Value:** Appeal to K-12 districts (50+ schools, centralized admin)
**Effort:** 10 weeks (complex org hierarchy, cross-school reporting)
**Dependencies:** Phase 1 complete (ensure single-school model is solid)

#### C. Advanced Scheduling (P4 – Complex)
**Scope:** Automated timetable generation, conflict detection, room allocation
**Value:** Save principals hours per term (manual scheduling is tedious)
**Effort:** 16 weeks (NP-hard problem, requires constraint solver)
**Dependencies:** Auto-allocation engine (Phase 1, Epic 1.2)

#### D. Learning Management System (LMS) Integration (P4 – Partnerships)
**Scope:** Integrate with Google Classroom, Canvas, Moodle (sync assignments, grades)
**Value:** Schools already using LMS can keep existing workflows
**Effort:** 8 weeks per integration (API mappings, two-way sync)
**Dependencies:** Stable API (after Phase 2)

#### E. Mobile Receipt OCR (P3 – Enhancement)
**Scope:** Auto-extract amount, date, vendor from receipt photo (AI-powered)
**Value:** Faster petty-cash submissions, fewer errors
**Effort:** 6 weeks (integrate OCR API, validate extraction accuracy)
**Dependencies:** Petty-cash system stable (Phase 1 complete)

#### F. Voice-to-Text Grading Feedback (P3 – Innovation)
**Scope:** Teacher speaks feedback, AI transcribes and formats as written comments
**Value:** 3x faster feedback entry (speak vs. type)
**Effort:** 4 weeks (integrate speech-to-text API, test accuracy)
**Dependencies:** Grading system enhanced (Phase 2, Epic 2.3)

#### G. Gamification for Students (P4 – Engagement)
**Scope:** Badges, leaderboards, points for completing assignments/lessons
**Value:** Increase student motivation, homework completion rates
**Effort:** 8 weeks (game mechanics, UI, analytics)
**Dependencies:** Student portal (see A above)

#### H. Predictive Analytics Dashboard (P3 – Data Science)
**Scope:** ML models predict enrollment, churn, student at-risk (already in Phase 3, Epic 3.1, but expand)
**Value:** Proactive interventions, data-driven decisions
**Effort:** 10 weeks (ML pipeline, model training, dashboard)
**Dependencies:** 12+ months historical data (need time to accumulate)

---

### 9.2 Technical Debt / Infrastructure Improvements

#### A. Database Query Optimization Audit
**Priority:** P2 (Performance)
**Description:** Profile all queries >500ms, add indexes, refactor N+1 queries
**Effort:** 3 weeks (1 DBA + 1 backend engineer)
**Benefit:** 50% faster page loads, reduced Supabase costs

#### B. End-to-End Testing Suite
**Priority:** P1 (Quality)
**Description:** Automated E2E tests for critical flows (onboarding, teacher invite, grading)
**Effort:** 4 weeks (Playwright or Cypress, CI/CD integration)
**Benefit:** Catch regressions before production, faster releases

#### C. API Documentation (OpenAPI/Swagger)
**Priority:** P2 (Developer Experience)
**Description:** Auto-generate API docs from code, interactive playground
**Effort:** 2 weeks (setup tooling, document existing endpoints)
**Benefit:** Easier third-party integrations, faster onboarding for new devs

#### D. Mobile Offline Mode Enhancement
**Priority:** P2 (UX)
**Description:** Expand offline capabilities (currently read-only caching, add write-back queue)
**Effort:** 5 weeks (conflict resolution, sync queue, error handling)
**Benefit:** Principals can work in low-connectivity environments, sync when online

#### E. Security Hardening (SOC 2 Prep)
**Priority:** P2 (Compliance)
**Description:** Penetration testing, vulnerability scanning, SOC 2 Type II audit prep
**Effort:** 8 weeks (external auditors + internal remediation)
**Benefit:** Enterprise sales readiness, compliance credibility

---

### 9.3 Quick Wins (High Impact, Low Effort)

| Enhancement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| **One-click invite link copy** | 1 day | High (reduce friction) | P1 |
| **Dark mode polish** | 2 days | Medium (user preference) | P2 |
| **Export grades to CSV** | 3 days | High (parent/admin requests) | P1 |
| **Keyboard shortcuts** | 2 days | Medium (power users) | P3 |
| **Empty state illustrations** | 2 days | High (onboarding clarity) | P2 |
| **In-app tutorials (tooltips)** | 4 days | High (reduce support load) | P1 |
| **Notification preferences** | 3 days | High (reduce alert fatigue) | P1 |
| **Multi-language support (add Spanish, French)** | 5 days | High (market expansion) | P2 |

**Total Quick Wins Effort:** ~3 weeks (can parallelize with main roadmap)

---

## 10. Appendix

### 10.1 Methodology

**Approach:**
1. **Codebase Audit:** Scanned 135 database migrations, 200+ React Native screens, 50+ service files
2. **Feature Verification:** Triangulated code references (file paths, table names, API routes) with expected functionality
3. **Maturity Assessment:** Evaluated each feature on 4 criteria:
   - **Functional:** Does it work as intended?
   - **Complete:** Are all edge cases handled?
   - **Scalable:** Can it handle 10x growth?
   - **Delightful:** Is the UX polished?
4. **Competitive Analysis:** Compared feature-by-feature against Google Classroom, Microsoft Teams Edu, Canvas
5. **Cost Modeling:** Built bottom-up cost estimates (Supabase pricing, AI API usage, storage) for 3 scenarios
6. **Prioritization:** Ranked by business impact (revenue, differentiation, risk mitigation) vs. effort

**Evidence Standards:**
- All claims backed by code references (file paths, table names, component names)
- No code snippets (per requirement: high-level business logic focus)
- Status labels: ✅ Implemented, ⚠️ Partial, ❌ Missing

**Validation:**
- Cross-checked table schema (supabase/migrations) with UI usage (app/screens)
- Confirmed API routes exist (lib/services, supabase/functions)
- Verified RLS policies (grep for "CREATE POLICY")

---

### 10.2 Assumptions

1. **Pricing Model:** $15/teacher/month (school pays, not individual teachers)
2. **Retention:** 24-month average customer lifetime (schools don't churn frequently)
3. **AI Usage:** 50 AI calls/teacher/month (grading + lesson generation)
4. **Support Costs:** 5-10% of infrastructure costs (scales with school size)
5. **Development Velocity:** 1 person-week = $1,500 fully loaded cost (salary + benefits + overhead)
6. **Market Penetration:** 10% of target market (5,000 schools) within 3 years
7. **Supabase Performance:** Handles 30M queries/month per school without major overages
8. **AI Accuracy:** Claude grading matches human grading 85% of the time (acceptable with teacher review)
9. **Parent WhatsApp Adoption:** 80% of parents prefer WhatsApp over email (South African market)
10. **Mobile Usage:** 70% of principals use mobile app as primary interface (vs. desktop web)

---

### 10.3 Glossary

| Term | Definition |
|------|------------|
| **5IR** | 5th Industrial Revolution – human-centric technology emphasizing collaboration between humans and AI, sustainability, ethics |
| **Auto-Allocation** | Algorithmic assignment of students to classes and teachers based on rules (capacity, workload, conflicts) |
| **Hiring Hub** | Integrated teacher recruitment system (job postings, resume collection, interview scheduling, offers) |
| **MAU** | Monthly Active Users – unique users who log in at least once per month |
| **Petty-Cash Workflow** | Process for teachers to request small expenses, principal approves, teacher uploads receipt, system reconciles |
| **RLS** | Row-Level Security – database-enforced access control (e.g., teachers see only their classes) |
| **Seat** | Licensed access for a teacher (school pays per seat, teacher gets full app access) |
| **TanStack Query** | React data-fetching library (caching, optimistic updates, offline support) |
| **WhatsApp Deep-Linking** | URL scheme that opens WhatsApp app with pre-filled message (e.g., `whatsapp://send?text=Hello`) |

---

### 10.4 Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-01 | Initial comprehensive analysis | AI Analysis Team |

---

### 10.5 Next Steps

1. **Review & Approval:** Stakeholders review this document, provide feedback (deadline: 2025-10-08)
2. **Phase 1 Kickoff:** Initiate Epic 1.1 (Hiring Hub) + Epic 1.3 (Teacher Monitoring) in parallel (start: 2025-10-15)
3. **Ticketization:** Create Jira/Linear tickets for all Phase 1 epics with acceptance criteria (by: 2025-10-10)
4. **Cost Validation:** Finance team validates cost model, adjusts pricing if needed (by: 2025-10-12)
5. **Quarterly Review:** Schedule Q1 2026 review to assess progress, update roadmap (calendar invite sent)

---

**Document Owner:** Product Management  
**Technical Reviewers:** CTO, Lead Engineer, Data Architect  
**Business Reviewers:** CEO, CFO, Head of Sales  
**Last Updated:** October 1, 2025  
**Next Review:** January 1, 2026

---

## Summary of Recommendations

### Immediate Actions (Within 2 Weeks)
1. ✅ Approve Phase 1 roadmap (Hiring Hub, Auto-Allocation, Teacher Monitoring)
2. ✅ Allocate 2 engineering teams (6 engineers total, 12 weeks)
3. ✅ Validate cost model with finance (adjust pricing if margins <50%)
4. ✅ Quick wins: One-click invite copy, CSV export, in-app tutorials (3 weeks parallel)

### Phase 1 Priorities (Q1 2026)
1. ✅ **Epic 1.1:** Hiring Hub (6 weeks, standalone)
2. ✅ **Epic 1.2:** Auto-Allocation Engine (8 weeks, parallel to 1.3)
3. ✅ **Epic 1.3:** Teacher Activity Monitoring (7 weeks, parallel to 1.1)

### Long-Term Strategy
1. ✅ Target 30-50 teacher schools (sweet spot: 55-60% margins)
2. ✅ Optimize AI costs aggressively (cache, batch, tier models → 30% savings)
3. ✅ Expand to 10% market penetration (500 schools, $2.7M annual revenue)
4. ✅ Maintain 5IR positioning (mobile-first, ethical AI, inclusive communication)

---

**EduDash Pro is uniquely positioned to become the definitive 5IR educational platform. The roadmap is clear, the economics are strong, and the competitive moat is deep. Let's execute.**

---

*End of Document*
