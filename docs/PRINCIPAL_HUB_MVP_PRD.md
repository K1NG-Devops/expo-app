# Principal Hub MVP - Product Requirements Document

**Version**: 1.0  
**Date**: 2025-01-12  
**Status**: READY FOR IMPLEMENTATION  

## Executive Summary

The Principal Hub MVP provides school principals with a comprehensive management dashboard featuring real-time analytics, teacher oversight, financial reporting, and collaborative tools. This MVP focuses on essential functionality that delivers immediate value while establishing the foundation for advanced features.

## Target Users

- **Primary**: School Principals and Principal Administrators
- **Secondary**: Super Admins (for oversight and configuration)
- **Tertiary**: Teachers (read-only access to relevant metrics)

## Core User Stories

### UC-1: Principal Dashboard Overview
**As a principal**, I want to see school performance at-a-glance so that I can make informed management decisions.

**Acceptance Criteria**:
- [ ] Real-time metrics: enrollment, attendance, teacher performance, financial health
- [ ] Quick action buttons for common tasks (approve applications, review reports)
- [ ] Activity feed showing recent school events and alerts
- [ ] Mobile-optimized display with pull-to-refresh

### UC-2: Teacher Management & Oversight
**As a principal**, I want to monitor and manage my teaching staff so that I can ensure quality education delivery.

**Acceptance Criteria**:
- [ ] Teacher performance dashboard with metrics (attendance, lesson completion, student feedback)
- [ ] Ability to assign classes and manage teacher schedules
- [ ] Communication tools for announcements and direct messaging
- [ ] Professional development tracking and recommendations

### UC-3: Financial & Operations Management
**As a principal**, I want to track school finances and operations so that I can ensure efficient resource allocation.

**Acceptance Criteria**:
- [ ] Financial dashboard: revenue, expenses, budget variance
- [ ] Enrollment pipeline and application management
- [ ] Resource allocation tracking (classrooms, materials, equipment)
- [ ] Compliance and regulatory reporting

### UC-4: Student & Parent Communication
**As a principal**, I want to communicate effectively with students and parents so that I can maintain strong school community relationships.

**Acceptance Criteria**:
- [ ] Announcement system with targeted messaging (by class, grade, or school-wide)
- [ ] Parent feedback collection and response management
- [ ] Student behavior tracking and intervention alerts
- [ ] Event management and calendar coordination

## Technical Requirements

### API Data Needs

#### Core Data Models
```sql
-- Already covered in comprehensive schema migration:
-- organizations, preschools, users, teachers, students, classes
-- homework_assignments, homework_submissions, resources

-- Additional tables needed for Principal Hub:
CREATE TABLE principal_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT[] NOT NULL, -- ['teachers', 'parents', 'students']
  target_classes UUID[], -- specific class IDs if applicable
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('tuition', 'fee', 'expense', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  description TEXT,
  student_id UUID REFERENCES public.students(id),
  category TEXT, -- 'tuition', 'supplies', 'utilities', etc.
  payment_method TEXT,
  transaction_date DATE NOT NULL,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teacher_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id),
  metric_date DATE NOT NULL,
  lessons_planned INTEGER DEFAULT 0,
  lessons_delivered INTEGER DEFAULT 0,
  student_attendance_rate DECIMAL(5,2),
  assignment_grading_turnaround_days DECIMAL(4,2),
  parent_feedback_score DECIMAL(3,2), -- 1-5 scale
  professional_development_hours DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Required API Endpoints

1. **GET /api/principal/dashboard**
   - Returns aggregated school metrics, recent activity, pending actions
   - Includes enrollment trends, financial summary, teacher performance overview

2. **GET /api/principal/teachers**
   - Returns teacher list with performance metrics and status
   - Supports filtering by performance, subject, class assignment

3. **POST /api/principal/announcements**
   - Creates new school announcement
   - Supports scheduling and audience targeting

4. **GET /api/principal/financial/summary**
   - Returns financial overview with revenue, expenses, projections
   - Includes enrollment-based revenue forecasting

5. **GET /api/principal/students/pipeline**
   - Returns application pipeline and enrollment status
   - Includes waiting lists and application approval queue

### Capability Gating & RLS Checks

#### RBAC Permissions Required
```typescript
// Principal Hub capabilities
const PRINCIPAL_HUB_CAPABILITIES = [
  'access_principal_hub',         // Basic hub access
  'view_school_analytics',        // Dashboard metrics
  'manage_teachers',              // Teacher oversight
  'manage_announcements',         // Communication tools
  'view_financial_reports',       // Financial dashboard
  'manage_student_applications',  // Enrollment management
  'manage_school_settings',       // Configuration access
] as const;

// RLS Helper Updates Needed
// Add to existing has_role_in_preschool function:
const principalRoles = ['principal', 'principal_admin', 'super_admin'];
```

#### Progressive Feature Rollout
```typescript
// Feature flags for Principal Hub
const PRINCIPAL_HUB_FEATURES = {
  basic_dashboard: true,           // Always enabled for principals
  teacher_management: true,        // MVP feature
  financial_reporting: false,     // Phase 2 (enable per org)
  advanced_analytics: false,      // Phase 3 (Premium tier only)
  meeting_room: false,            // Phase 4 (Enterprise feature)
} as const;
```

## Implementation Phases

### Phase 1: Core Dashboard (Week 1)
- [ ] Principal dashboard with basic metrics
- [ ] Teacher list view with basic information
- [ ] Simple announcement creation
- [ ] Mobile-responsive layout

**Definition of Done**:
- Dashboard loads under 2 seconds
- All metrics update in real-time via Supabase Realtime
- Mobile layout passes accessibility tests
- TypeScript compilation clean

### Phase 2: Management Tools (Week 2)
- [ ] Teacher performance tracking
- [ ] Student application pipeline
- [ ] Financial summary dashboard
- [ ] Announcement scheduling and targeting

**Definition of Done**:
- All CRUD operations working with proper RLS
- Performance metrics accurately calculated
- Financial data matches enrollment records
- Announcements delivered to correct audiences

### Phase 3: Advanced Features (Week 3)
- [ ] Communication tools (messaging, notifications)
- [ ] Resource allocation management
- [ ] Compliance reporting
- [ ] Integration with parent/teacher dashboards

**Definition of Done**:
- Cross-platform notifications working
- Resource conflicts detected and prevented
- Reports export to PDF/CSV
- Feature flags control access appropriately

## Rollout Gates & Success Criteria

### Quality Gates
1. **Security**: All RLS policies tested and validated
2. **Performance**: Page load times < 2 seconds
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Mobile**: Responsive design on all device sizes
5. **Data Integrity**: Financial calculations verified against test data

### Success Metrics
- **Adoption**: >80% of principals log in weekly within first month
- **Engagement**: Average session duration >5 minutes
- **Task Completion**: >90% success rate for core workflows
- **Performance**: <1% error rate for data operations
- **Feedback**: Net Promoter Score >7/10 from principal users

### Rollout Strategy
1. **Alpha** (Week 1): Internal testing with 2-3 test principals
2. **Beta** (Week 2): Limited rollout to 10 pilot schools
3. **GA** (Week 3): Full rollout with feature flags enabled
4. **Optimization** (Week 4): Performance tuning and feedback integration

## Risk Mitigation

### Technical Risks
- **Database Performance**: Pre-optimize queries, implement caching
- **RLS Complexity**: Thorough testing with test accounts per role
- **Real-time Updates**: Fallback to polling if WebSocket fails
- **Mobile Performance**: Progressive loading, lazy routes

### Business Risks
- **User Adoption**: Comprehensive onboarding flow and training materials
- **Data Accuracy**: Validation rules and reconciliation processes
- **Compliance**: Regular audit trails and data retention policies

## Dependencies

### External Dependencies
- Supabase Realtime for live updates
- PostHog for feature flag management
- Sentry for error monitoring
- PDF generation library for reports

### Internal Dependencies
- Comprehensive database schema (✅ Complete)
- RBAC system (✅ Complete) 
- AI Gateway for intelligent insights (🟡 In Progress)
- Mobile app infrastructure (✅ Complete)

### Data Dependencies
- Historical student enrollment data
- Teacher performance baselines
- Financial transaction history
- Parent contact information

## Next Steps

1. **Immediate** (This week): Complete database migrations for Principal Hub tables
2. **Week 1**: Begin Phase 1 implementation with core dashboard
3. **Week 2**: User testing with pilot principals for feedback
4. **Week 3**: Feature flag rollout and performance optimization

---

**Prepared by**: EduDash Development Team  
**Approved by**: [Pending Principal User Research]  
**Next Review**: 2025-01-19
