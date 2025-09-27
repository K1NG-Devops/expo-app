# EduDash Pro - Operations Guide

## What This Document Covers

This comprehensive guide covers the end-to-end operations for **EduDash Pro**, focusing on the three main user roles:
- **Principal Dashboard** - School management, analytics, and administration
- **Teacher Dashboard** - Classroom management, AI tools, and parent communication  
- **Parent Dashboard** - Child monitoring, homework help, and school communication

**What is NOT covered:** Super Admin Dashboard operations are documented separately for security reasons.

---

## 1. Overview

### 1.1 Purpose and Value Proposition

EduDash Pro is a comprehensive educational management platform that empowers schools through AI-driven tools and efficient operations. The platform serves three key stakeholders:

- **Principals** get school-wide insights, financial management tools, and AI-powered analytics
- **Teachers** access AI lesson generators, automated grading, and seamless parent communication
- **Parents** track their children's progress, get homework help, and stay connected with teachers

### 1.2 Supported Roles and Platforms

**Supported Roles:**
- Principal - Full school oversight and management capabilities
- Teacher - Classroom management and AI teaching tools
- Parent - Child progress tracking and communication

**Platform Support:**
- Primary: Android mobile app (React Native/Expo)
- Secondary: iOS mobile app
- Basic: Web interface for certain features

### 1.3 High-Level User Journey

**Principal's Day:** Login → Check school metrics → Review financial reports → Analyze AI insights → Manage teacher allocations → Handle WhatsApp support requests

**Teacher's Day:** Login → View class overview → Create AI-generated lessons → Grade assignments with AI → Send parent updates → Check homework submissions

**Parent's Day:** Login → Check child's attendance → View homework assignments → Get AI homework help → Message teachers → Review school announcements

---

## 2. Role-Based Access and Permissions

### 2.1 Role Definitions

**Principal**
- School-wide analytics and reporting
- Financial management (revenue, expenses, petty cash)
- Teacher and class management
- AI insights and advanced analytics
- Seat allocation for teachers (Starter Plan+)

**Teacher** 
- Class and student management
- Assignment creation and grading
- AI teaching tools (lesson generation, auto-grading, homework helper)
- Parent communication
- Progress analysis for their classes

**Parent**
- Child progress monitoring
- Attendance and homework tracking
- AI homework helper (limited usage)
- Teacher messaging
- Event and announcement viewing

### 2.2 Access Control Model and Capabilities

The app uses a multi-layered access control system:

1. **Role-based permissions** - Core role determines base capabilities
2. **Seat status** - Active seat required for premium features
3. **Subscription tier** - Plan level affects available features
4. **Capability flags** - Fine-grained feature toggles

**Key Capability Checks:**
- `hasActiveSeat()` - Required for AI tools and advanced features
- `profile.hasCapability()` - Specific feature permissions
- `seat_status` - active/pending/inactive seat states
- `plan_tier` - subscription level enforcement

### 2.3 Seat and Subscription Enforcement

**Seat Allocations by Plan:**
- **Free Tier:** 2 seats
- **Starter Plan:** 5 seats  
- **Premium Plan:** 15 seats

**Key Rules:**
- Principal can allocate seats from Starter Plan onwards
- Users must belong to the same school for seat allocation
- Teachers need active seats for AI features
- Free tier users see ads, premium users do not

---

## 3. Principal Dashboard Operations

### 3.1 Navigation and Header

The Principal Dashboard uses a `RoleBasedHeader` with:
- **Profile avatar** (tap to access account settings)
- **School name display** with personalized greeting
- **Theme toggle** (light/dark/system)
- **Settings menu** with language options and sign out

**Key Navigation Paths:**
- Settings → `/screens/admin/school-settings`
- Account → `/screens/account`
- Language switching via dropdown modal

### 3.2 AI Insights and Analytics

**Main Analytics Banner:**
- Prominent "AI Analytics Available" banner
- Navigates to `/screens/principal-analytics`
- Requires subscription for advanced features

**Analytics Screen Features:**
- **Period Selector:** 7 days, 30 days, 90 days, Custom range
- **Tabs:** Students, Attendance, Finance, Staffing, Custom
- **Quick Stats:** Key metrics with trend indicators
- **Analytics Cards:** Advanced features marked with PRO/ACTIVE badges

**Gating Logic:**
- `hasAdvancedAnalytics` determines feature access
- Upgrade CTAs shown for restricted features
- AI insights require active subscription

### 3.3 Financial Management Tools

**Available Tools:**
1. **Financial Overview** → `/screens/financial-dashboard`
   - Revenue and expense tracking
   - Cash flow visualization
   - Budget vs actual analysis

2. **Payment History** → `/screens/financial-dashboard`
   - Transaction browsing and filtering
   - Export capabilities
   - Payment status tracking

3. **Financial Reports** → `/screens/financial-reports`
   - Detailed financial analysis
   - Custom report generation
   - Trend analysis and forecasting

4. **Petty Cash Management** → `/screens/finance/petty-cash`
   - Daily expense tracking
   - Cash on hand monitoring
   - Receipt management

### 3.4 Class & Teacher Management

**Teacher Management:**
- Navigate to `/screens/class-teacher-management`
- Assign teachers to classes
- Manage teacher-student ratios
- Allocate seats to teachers

**Operations:**
- View teacher performance metrics
- Handle teacher invitations
- Manage classroom assignments
- Monitor capacity utilization

---

## 4. Teacher Dashboard Operations

### 4.1 Class Overview and Metrics

**Dashboard Metrics:**
- **Total Students:** Across all assigned classes
- **Pending Grading:** Assignments awaiting review
- **Lessons Today:** Scheduled classes
- **Class Cards:** Individual class information with student counts

**Seat Status Indicator:**
- Active (green) - Full access to AI features
- Pending (yellow) - Limited access, pending approval
- Inactive (red) - Basic access only

### 4.2 Assignments and Grading

**Required Capabilities:**
- `create_assignments` - Create new homework/assignments
- `grade_assignments` - Grade and provide feedback
- `manage_classes` - Classroom oversight

**Workflow:**
1. Create assignment → `/screens/assign-homework`
2. View submissions → Assignment detail screens
3. Grade assignments → Manual or AI-assisted grading
4. Publish results → Students and parents notified

### 4.3 AI Tools for Teachers

**1. AI Lesson Generator** → `/screens/ai-lesson-generator`
- **Requirements:** Active seat + `ai_lesson_generation` flag enabled
- **Capabilities:** Generate curriculum-aligned lesson plans
- **Usage:** Subject input → AI creates structured lesson with objectives, activities, assessments
- **Gating:** Shows upgrade alert if seat inactive

**2. Grade Homework** → `/screens/ai-homework-grader-live`
- **Requirements:** Active seat + `ai_grading_assistance` flag enabled
- **Capabilities:** Auto-grade assignments with explanations
- **Usage:** Upload assignment → AI provides grades and feedback
- **Gating:** Alert shown for inactive seats

**3. Homework Helper** → `/screens/ai-homework-helper`
- **Requirements:** `ai_homework_helper` flag enabled
- **Capabilities:** Step-by-step problem solving assistance
- **Usage:** Student questions → AI provides educational guidance
- **Accessible:** Available to all teachers for student support

**4. Progress Analysis** → `/screens/ai-progress-analysis`
- **Requirements:** `view_class_analytics` capability
- **Capabilities:** AI-powered student progress insights
- **Usage:** Class performance analysis and recommendations

**Feature Flag Logic:**
- Features disabled if environment variables set to 'false'
- Subscription tier affects access levels
- Temporary unlocks available via rewarded ads for free tier

### 4.4 Parent Communication and WhatsApp Integration

**In-App Messaging:**
- Quick action "Message Parents" → `/screens/teacher-messages`
- Handles message threads and notifications
- Tracks read/unread status

**WhatsApp Integration:**
- `useWhatsAppConnection` hook manages connection status
- Opt-in modal for permission setup
- Quick action shows connection status
- Fallback to standard messaging if WhatsApp unavailable

---

## 5. Parent Dashboard Operations

### 5.1 Child Management and Switching

**Child Overview:**
- Multiple children supported via `ChildSwitcher` component
- Active child selection persisted in AsyncStorage
- Header subtitle shows current child (tap to cycle between children)

**Child Card Information:**
- **Status Badges:** Active (green), Late (orange), Absent (red)
- **Progress Score:** Attendance-based percentage
- **Homework Pending:** Count of unsubmitted assignments
- **Upcoming Events:** Class events and activities

**Navigation:**
- View all children → `/screens/parent-children`
- Register new child → `/screens/parent-child-registration`

### 5.2 Attendance, Homework, and Events

**Today's Overview:**
- **Attendance Status:** Present/Absent/Late with colored indicators
- **Pending Homework:** Real-time count from assignments
- **Upcoming Events:** Next 7 days of class events

**Quick Actions per Child:**
- **Attendance Button:** View detailed attendance history
- **Homework Button:** See assignments and due dates
- **Message Button:** Direct communication with teachers

### 5.3 Communication Hub

**Available Communication Tools:**
1. **Messages** → `/screens/parent-messages`
   - Direct teacher communication
   - Thread-based conversations
   - Read/unread status tracking

2. **Announcements** → `/screens/parent-announcements`
   - School-wide updates
   - Important notifications
   - Event announcements

3. **Schedule Meeting** → `/screens/parent-meetings`
   - Book parent-teacher conferences
   - Calendar integration
   - Meeting reminders

**Empty States:**
- Clear guidance when no children linked
- Registration prompts and next steps
- Error handling with retry options

---

## 6. AI Features and Limits

### 6.1 Feature Flags and Environment Variables

**Core Environment Variables:**
- `EXPO_PUBLIC_AI_ENABLED` - Master AI feature toggle
- `EXPO_PUBLIC_ENABLE_AI_FEATURES` - Secondary AI toggle

**Feature Flags (via getFeatureFlagsSync):**
- `ai_lesson_generation` - Lesson generator availability
- `ai_grading_assistance` - Auto-grading feature
- `ai_homework_help` - Homework helper access

**⚠️ Inconsistency Note:** Different screens use different conditions for AI enablement. Standardization needed.

### 6.2 Quotas, Models, and Usage Tracking

**Quota System:**
- `canUseFeature(feature, count)` - Checks available quota
- `getQuotaStatus(feature)` - Returns used/limit/remaining
- `getCombinedUsage()` - Aggregated usage statistics

**Model Selection:**
- Multiple AI models available with different costs
- User preference storage via `setPreferredModel()`
- Cost indicators: $ (low), $$ (medium), $$$ (high)

**Usage Limits by Tier:**
- **Free:** 10 AI help sessions, 5 lessons
- **Pro:** 100 AI help sessions, 50 lessons  
- **Enterprise:** Unlimited usage

### 6.3 Capability and Seat Gating

**Gating Logic Flow:**
1. Check if user has active seat (`hasActiveSeat`)
2. Verify feature capability (`profile.hasCapability`)
3. Check feature flags and environment variables
4. Enforce quota limits
5. Show appropriate UI (enabled/upgrade required/disabled)

**Upgrade Paths:**
- In-app purchase prompts
- Subscription management
- Seat allocation requests (for teachers)

---

## 7. Communication Systems

### 7.1 In-App Messaging

**Message Flow:**
1. **Parent Initiation:** Child card "Message" button → Teacher contact
2. **Teacher Response:** Notification → Reply via teacher messages
3. **Thread Management:** Conversations grouped by participant
4. **Status Tracking:** Read/unread indicators

**Error Handling:**
- Network connectivity checks
- Retry mechanisms for failed sends
- Offline message queuing
- Clear error messaging with retry options

### 7.2 WhatsApp Connection and Opt-in

**Setup Flow:**
1. User sees WhatsApp quick action in dashboard
2. Tap opens `WhatsAppOptInModal` for permissions
3. Connection status tracked via `useWhatsAppConnection`
4. Fallback to standard messaging if setup fails

**Principal Support Integration:**
- WhatsApp contact banner in principal dashboard
- Direct link to support via WhatsApp
- Fallback phone number if WhatsApp unavailable
- Business hours and response time expectations

---

## 8. Financial Management

### 8.1 Financial Dashboard and Reports

**Financial Dashboard** (`/screens/financial-dashboard`):
- **Overview Charts:** Revenue trends, expense categories
- **Cash Flow:** Monthly income vs expenses
- **Budget Tracking:** Planned vs actual spending
- **Key Metrics:** Total revenue, outstanding payments, monthly growth

**Financial Reports** (`/screens/financial-reports`):
- **Custom Date Ranges:** Flexible reporting periods
- **Export Options:** PDF, CSV, Excel formats
- **Report Types:** P&L, Cash Flow, Budget Analysis
- **Automated Insights:** AI-powered financial recommendations

### 8.2 Petty Cash and Payment Tracking

**Petty Cash System** (`/screens/finance/petty-cash`):
- **Daily Transactions:** Quick expense entry
- **Receipt Management:** Photo capture and storage
- **Category Tracking:** Organized expense classification
- **Balance Monitoring:** Real-time cash on hand

**Payment History:**
- **Transaction Browsing:** Searchable payment records
- **Status Tracking:** Pending, completed, failed payments
- **Proof of Payment (POP):** Upload and verification system
- **Reconciliation Tools:** Match payments to invoices

---

## 9. Analytics and Reporting

### 9.1 Key Metrics and Visualization

**Principal Analytics Dashboard:**
- **Period Selection:** Flexible date ranges (7/30/90 days, custom)
- **Metric Categories:** Students, Attendance, Finance, Staffing
- **Trend Indicators:** Green (up), red (down), gray (neutral) arrows
- **Quick Stats Grid:** Key performance indicators with comparisons

**Metric Examples:**
- Student enrollment trends
- Attendance rates by class
- Teacher utilization metrics
- Revenue per student
- Parent engagement scores

### 9.2 AI-Powered Insights and Upgrade Gating

**Advanced Analytics Features:**
- **Predictive Analytics:** Student outcome predictions
- **Anomaly Detection:** Unusual patterns and alerts
- **Resource Optimization:** Efficiency recommendations
- **Custom Dashboards:** Personalized metric views

**Gating Implementation:**
- **PRO Badge:** Shown on premium features
- **ACTIVE Badge:** Displayed when feature unlocked
- **Upgrade CTAs:** Clear paths to subscription upgrade
- **Feature Previews:** Limited demos to encourage upgrades

---

## 10. Subscription, Seats, and Capabilities

### 10.1 Plan Structure and Seat Counts

**Available Plans:**
- **Free Tier:** 2 seats, basic features, ads enabled
- **Starter Plan:** 5 seats, core AI features, teacher management
- **Premium Plan:** 15 seats, full AI suite, advanced analytics

### 10.2 Principal Seat Allocation

**Allocation Rules:**
- **Minimum Plan:** Starter required for seat allocation
- **School Constraint:** Users must belong to same school
- **Allocation Interface:** Teacher management screen
- **Status Tracking:** Active, pending, inactive seat states

**Workflow:**
1. Principal navigates to teacher management
2. Views teacher list with seat status indicators
3. Assigns/revokes seats via action buttons
4. System validates school membership and quota
5. Teachers receive notification of seat changes

### 10.3 Capability Enforcement

**Capability System:**
- **Seat Requirements:** Premium features require active seats
- **Feature Flags:** Environmental controls for feature availability
- **Graceful Degradation:** Limited functionality when capabilities missing
- **Clear Messaging:** Users understand access limitations and upgrade paths

---

## 11. Technical Architecture Overview

### 11.1 Core Frameworks and Navigation

**Technology Stack:**
- **Frontend:** React Native with Expo SDK 53
- **Navigation:** Expo Router with app directory structure
- **State Management:** React Query with AsyncStorage persistence
- **Backend:** Supabase (PostgreSQL with Edge Functions)

**Key Navigation Patterns:**
- Role-based route protection
- Deep linking support
- Back button behavior varies by screen type
- Dashboard screens hide back buttons (main destinations)

### 11.2 Contexts, Hooks, and Services

**React Contexts:**
- `AuthContext` - User authentication and profile management
- `SubscriptionContext` - Plan and seat management
- `ThemeContext` - Light/dark theme switching
- `AdsContext` - Advertisement management for free tier

**Custom Hooks:**
- `useTeacherDashboard()` - Teacher dashboard data management
- `useWhatsAppConnection()` - WhatsApp integration status
- `useHomeworkGenerator()` - AI homework assistance
- `useDashboardData()` - General dashboard data loading

**Core Services:**
- `assertSupabase()` - Database connection management
- `track()` - Analytics event tracking
- `createCheckout()` - Payment processing
- `getFeatureFlagsSync()` - Feature flag management

### 11.3 Feature Flags and Remote Services

**Feature Flag System:**
- Runtime feature toggling
- Environment-based overrides
- A/B testing support
- Gradual rollout capabilities

**Remote Services:**
- **AI Gateway:** Secure AI model access via Edge Functions
- **Payment Processing:** Stripe integration for subscriptions
- **Analytics:** PostHog for usage tracking
- **Push Notifications:** Expo notifications for alerts

### 11.4 Internationalization and Theming

**Language Support:**
- **Primary:** English (en)
- **Supported:** Afrikaans (af), Spanish (es), Sesotho (st), Zulu (zu)
- **System:** `useTranslation()` hook with namespace support
- **Fallbacks:** Default values for missing translations

**Theme System:**
- **Modes:** Light, Dark, System (follows device)
- **Dynamic Colors:** Role-based color schemes
- **Accessibility:** High contrast support and color-blind friendly
- **Persistence:** User preference saved across sessions

---

## 12. Troubleshooting and FAQs

### Common Issues

**Q: AI features not working for teachers**
A: Check seat status (must be active), verify feature flags enabled, ensure subscription plan supports AI features

**Q: Parent can't see their children**
A: Verify parent-child relationship established in database, check school assignment matches, ensure student records are active

**Q: WhatsApp integration not connecting**  
A: Check device permissions, verify WhatsApp app installed, ensure proper opt-in flow completed

**Q: Financial reports showing incorrect data**
A: Verify date range selection, check data sync status, ensure proper school/tenant filtering

**Q: Analytics showing "upgrade required"**
A: Confirm subscription plan supports advanced analytics, check seat allocation, verify payment status

### Performance Issues

**Slow Dashboard Loading:**
- Check internet connectivity
- Verify Supabase connection status
- Clear app cache and reload
- Check for pending app updates

**High Data Usage:**
- Review image/file upload settings
- Check background sync frequency
- Monitor AI feature usage (quota consumption)

---

## 13. Changelog

### Recent Updates

**Version 1.0.0 (Current)**
- Initial release with Principal, Teacher, and Parent dashboards
- AI-powered lesson generation and homework assistance
- Multi-language support (5 languages)
- WhatsApp integration for support and communication
- Comprehensive analytics and financial management
- Role-based access control with seat management

### Upcoming Features

**Next Release:**
- Enhanced AI models and capabilities
- Advanced parent engagement tools
- Expanded financial reporting
- Mobile app performance optimizations
- Additional language support

---

**Document Version:** 1.0  
**Last Updated:** September 2024  
**Maintained By:** EduDash Pro Development Team

For technical implementation details, see the codebase documentation in `/docs/`.  
For Super Admin operations, see `SUPERADMIN-OPS.md` (restricted access).