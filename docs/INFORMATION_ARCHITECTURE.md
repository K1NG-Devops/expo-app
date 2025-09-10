# Information Architecture & UX Flows
## EduDash Role-Based Dashboards & Principal Hub

### Overview
This document defines the complete information architecture and user experience flows for EduDash's role-based interface system, covering SuperAdmin, Principal/Admin, Teacher, and Parent personas, plus the collaborative Principal Hub.

---

## Core Design Principles

### 1. Role-Based Access Control (RBAC)
- **Authentication State**: No back arrow when signed in (per rule)
- **Role Detection**: Post-login profile fetch determines dashboard route
- **Capability Flags**: Fine-grained permissions beyond basic roles
- **Org Scoping**: All data restricted to user's organization context

### 2. Mobile-First UX Patterns
- **Keyboard Awareness**: Content shifts up when forms/inputs focus (per rule)
- **Touch Targets**: Minimum 44pt touch areas for accessibility
- **Bottom Navigation**: Persistent role-based tabs for core functions
- **Contextual FABs**: Action buttons for primary workflows per screen

### 3. Offline-First Architecture
- **Cache Strategy**: Recent assignments, resources, and metrics cached locally
- **Loading States**: Skeleton screens and progressive content loading
- **Error Handling**: Graceful degradation with retry mechanisms

---

## Persona Definitions & Goals

### SuperAdmin
**Primary Goals:**
- Monitor global platform health and usage
- Manage enterprise sales pipeline
- Oversee billing and subscription tiers
- Control feature flags and rollouts

**Secondary Goals:**
- Analyze cross-tenant metrics and trends
- Support escalation handling
- System configuration and maintenance

### Principal/Admin
**Primary Goals:**
- Monitor school performance and teacher activity
- Access Principal Meeting Room for collaboration
- Manage resources and AI tool usage
- Oversee seat assignments and billing

**Secondary Goals:**
- Generate reports for stakeholders
- Configure school-level settings
- Contact sales for upgrades

### Teacher
**Primary Goals:**
- Create and manage assignments with AI assistance
- Grade student work efficiently
- Build lesson plans and STEM activities
- Access teaching resources and materials

**Secondary Goals:**
- Communicate with parents
- Track student progress
- Professional development resources

### Parent
**Primary Goals:**
- Monitor child's academic progress
- Help with homework using AI assistance
- Communicate with teachers
- Review assignments and grades

**Secondary Goals:**
- Advocate for school to adopt enterprise features
- Access educational resources for home learning

---

## Navigation Architecture

### Global Navigation Rules
- **No Back Arrow**: When user is authenticated (per rule)
- **Role-Based Routing**: Post-login redirect to appropriate dashboard
- **Persistent Bottom Tabs**: Core functions always accessible
- **Header Actions**: Context-sensitive tools and sign-out

### Bottom Navigation by Role

#### SuperAdmin Tabs
1. **Dashboard** (home icon) - Global overview
2. **Tenants** (building icon) - Organization management  
3. **Sales** (chart icon) - Leads and pipeline
4. **Settings** (gear icon) - Platform configuration

#### Principal/Admin Tabs
1. **Dashboard** (home icon) - School metrics
2. **Hub** (video icon) - Principal Meeting Room
3. **Teachers** (users icon) - Staff management
4. **Resources** (folder icon) - Content library
5. **Settings** (gear icon) - School configuration

#### Teacher Tabs
1. **Dashboard** (home icon) - Classes overview
2. **AI Tools** (wand icon) - Lesson/grading/STEM generators
3. **Assignments** (clipboard icon) - Create and manage
4. **Resources** (folder icon) - Teaching materials
5. **Messages** (chat icon) - Parent communication

#### Parent Tabs
1. **Dashboard** (home icon) - Child progress
2. **Homework** (book icon) - AI homework helper
3. **Messages** (chat icon) - Teacher communication
4. **Calendar** (calendar icon) - School events
5. **Settings** (gear icon) - Account preferences

---

## Screen Wireframes & User Flows

### SuperAdmin Dashboard
```
┌─────────────────────────────────────────┐
│ 🏠 Tenants 📊 Settings ⚙️           [•••]│ ← No back arrow
├─────────────────────────────────────────┤
│ Global Platform Overview                │
├─────────────────────────────────────────┤
│ 📊 Active Tenants: 247                 │
│ 💰 Monthly Revenue: $45,200            │
│ 🚨 Critical Issues: 2                  │
│ 📈 AI Usage Cost: $12,340              │
├─────────────────────────────────────────┤
│ Recent Alerts                           │
│ • High error rate in AI Gateway         │
│ • New enterprise lead: Lincoln School   │
├─────────────────────────────────────────┤
│ Feature Flag Status                     │
│ • 🟢 AI Gateway: 100%                   │
│ • 🟡 Principal Hub: 25%                 │
│ • 🔴 STEM Generator: 5%                 │
├─────────────────────────────────────────┤
│ Quick Actions                           │
│ [Contact Sales] [System Status] [Logs]  │
└─────────────────────────────────────────┘
```

### Principal/Admin Dashboard  
```
┌─────────────────────────────────────────┐
│ 🏠 Hub 🎥 Teachers 👥 Resources 📁 [•••] │
├─────────────────────────────────────────┤
│ Lincoln Elementary - Principal Hub      │
├─────────────────────────────────────────┤
│ 👥 Teachers: 24    📚 Classes: 186      │
│ 🎓 Students: 420   💡 AI Usage: $240    │
├─────────────────────────────────────────┤
│ Quick Access                            │
│ [📹 Join Meeting Room] [📊 Weekly Report]│
├─────────────────────────────────────────┤
│ Teacher Activity (This Week)            │
│ • Ms. Johnson: 12 assignments, 98% on-time│
│ • Mr. Davis: 8 assignments, AI lesson +3 │
│ • Mrs. Smith: 15 assignments, parent comm│
├─────────────────────────────────────────┤
│ School Performance                      │
│ 📈 Assignment completion: 89%           │
│ ⭐ Average grade: B+ (3.4 GPA)          │
│ 🚀 AI tool adoption: 67%                │
├─────────────────────────────────────────┤
│ [Upgrade to Premium] [Contact Sales]    │
└─────────────────────────────────────────┘
```

### Teacher Dashboard
```
┌─────────────────────────────────────────┐
│ 🏠 AI ✨ Assignments 📋 Resources 📁 [•••]│
├─────────────────────────────────────────┤
│ Welcome back, Ms. Johnson               │
├─────────────────────────────────────────┤
│ Today's Classes                         │
│ • 📘 Math 3A (9:00 AM) - 24 students    │
│ • 📗 Math 3B (1:30 PM) - 22 students    │
│ • 📙 Advanced Math (3:00 PM) - 18 students│
├─────────────────────────────────────────┤
│ Pending Reviews                         │
│ • 📝 Fractions Quiz (18 submissions)    │
│ • 📊 Word Problems HW (12 submissions)   │
├─────────────────────────────────────────┤
│ AI Tool Shortcuts                       │
│ [🎯 Generate Lesson] [🧪 STEM Activity]  │
│ [📊 Create Rubric] [❓ Make Quiz]        │
├─────────────────────────────────────────┤
│ Resource Library                        │
│ • 📑 Grade 3 Math Standards             │
│ • 🎥 Fraction Video Series              │
│ • 📋 Assessment Templates               │
├─────────────────────────────────────────┤
│ 💡 Upgrade to Premium for advanced AI   │
│              [Learn More]               │
└─────────────────────────────────────────┘
```

### Parent Dashboard
```
┌─────────────────────────────────────────┐
│ 🏠 Homework 📚 Messages 💬 Calendar 📅 [•••]│
├─────────────────────────────────────────┤
│ Emma's Progress - Grade 3               │
├─────────────────────────────────────────┤
│ Recent Assignments                      │
│ • ✅ Math: Fractions Practice (A-)       │
│ • ⏳ Science: Plant Life Cycle (Due Fri) │
│ • 📝 Reading: Book Report (In Progress)  │
├─────────────────────────────────────────┤
│ AI Homework Helper                      │
│ 💡 Usage: 8/10 sessions this month      │
│ [📸 Photo Math Problem] [💭 Ask AI]      │
├─────────────────────────────────────────┤
│ Teacher Messages                        │
│ • Ms. Johnson: "Emma did great in math!"│
│ • Mr. Davis: "Please review spelling..."│
├─────────────────────────────────────────┤
│ Upcoming Events                         │
│ • Parent-Teacher Conf (Oct 15)          │
│ • Science Fair Projects Due (Oct 22)    │
├─────────────────────────────────────────┤
│ 🎯 Help your school get Premium features│
│           [Contact Principal]           │
└─────────────────────────────────────────┘
```

---

## Principal Hub (Real-Time Collaboration)

### Meeting Room Interface
```
┌─────────────────────────────────────────┐
│ 🎥 Lincoln Elementary Principal Hub     │
├─────────────────────────────────────────┤
│ 📹 [Ms. Chen] [Mr. Rodriguez] [Dr. Park] │
│                                         │
│    [Your Video Feed]                    │
│                                         │
├─────────────────────────────────────────┤
│ Tools: [🎨 Whiteboard] [📝 Notes] [📁 Files]│
├─────────────────────────────────────────┤
│ Chat & Participants (12)                │
│ • Principal Chen: "Let's review Q3..."  │
│ • Vice Principal Rodriguez: "Data shows"│
│ • [Type message...]                     │
├─────────────────────────────────────────┤
│ [🔇 Mute] [📹 Video] [🎙️ Share] [📱 More]│
└─────────────────────────────────────────┘
```

### Pre-Meeting Lobby
```
┌─────────────────────────────────────────┐
│ 🎥 Principal Hub - Weekly Planning      │
├─────────────────────────────────────────┤
│ Scheduled for Today 2:30 PM            │
│ Host: Principal Chen                    │
│ Expected: 8 participants                │
├─────────────────────────────────────────┤
│ Agenda                                  │
│ • Q3 Performance Review                 │
│ • Budget Planning for Q4                │
│ • New Teacher Onboarding               │
│ • Parent Engagement Initiatives        │
├─────────────────────────────────────────┤
│ Pre-loaded Resources                    │
│ 📊 Q3 Performance Dashboard            │
│ 💰 Budget Template                     │
│ 📋 Onboarding Checklist               │
├─────────────────────────────────────────┤
│ Meeting Settings                        │
│ ☑️ Record this meeting                  │
│ ☑️ Allow screen sharing                 │
│ ⬜ Require lobby approval               │
├─────────────────────────────────────────┤
│           [Join Meeting Room]           │
└─────────────────────────────────────────┘
```

---

## AI Integration Flows

### AI Lesson Generator (Teacher)
```
Flow: Teacher Dashboard → AI Tools → Generate Lesson

1. Select Subject & Grade
   ┌─────────────────────┐
   │ 📚 Subject: Math    │
   │ 🎓 Grade: 3rd       │
   │ ⏱️ Duration: 45 min │
   │ 🎯 Topic: Fractions │
   └─────────────────────┘

2. Learning Context
   ┌─────────────────────┐
   │ Class Context       │
   │ • 24 students       │
   │ • Mixed abilities   │
   │ • Visual learners   │
   │ Available Materials │
   │ • Fraction circles  │
   │ • Manipulatives     │
   │ • Interactive board │
   └─────────────────────┘

3. AI Streaming Response
   ┌─────────────────────┐
   │ Generating lesson...│
   │ ██████████▓▓▓▓ 75%  │
   │                     │
   │ # Fraction Basics   │
   │ **Objective**: Std. │
   │ **Materials**: Frac.│
   │ **Warm-up**: (5min) │
   │ Students will...    │
   │ [Stop] [Regenerate] │
   └─────────────────────┘

4. Review & Customize  
   ┌─────────────────────┐
   │ Generated Lesson Plan│
   │ [Edit] [Save] [PDF] │
   │                     │
   │ ✨ Standard Aligned │
   │ 📊 Assessment Rubric│
   │ 🏠 Homework Included │
   │                     │
   │ [Create Assignment] │
   │ [Add to Resources]  │
   └─────────────────────┘
```

### AI Homework Helper (Parent)
```
Flow: Parent Dashboard → Homework → Photo/Ask AI

1. Problem Input
   ┌─────────────────────┐
   │ 📸 Take Photo       │
   │ 💭 Type Question    │
   │ 📁 Upload File      │
   │                     │
   │ Subject: Math       │
   │ Child: Emma (Grade 3)│
   └─────────────────────┘

2. AI Analysis
   ┌─────────────────────┐
   │ Analyzing problem...│
   │                     │
   │ 📊 Detected: Division│
   │ 🎯 Grade Level: 3rd │
   │ 📚 Topic: Word Prob.│
   │                     │
   │ Processing...       │
   └─────────────────────┘

3. Guided Help (Not Answers)
   ┌─────────────────────┐
   │ 💡 Let's think step │
   │    by step together │
   │                     │
   │ First, what are we  │
   │ trying to find?     │
   │                     │
   │ 🔍 Hint: Look for   │
   │ key words like      │
   │ "total" or "each"   │
   │                     │
   │ [Next Step] [More Help]│
   └─────────────────────┘
```

---

## Monetization & Upgrade Flows

### Subscription Tiers Display
```
┌─────────────────────────────────────────┐
│ 📊 Current Plan: Free                   │
├─────────────────────────────────────────┤
│ AI Usage This Month                     │
│ • Homework Help: 8/10 remaining         │
│ • Lesson Generation: 3/5 remaining      │
│ • Grading Assist: 2/3 remaining         │
├─────────────────────────────────────────┤
│ ⚡ Upgrade to unlock:                   │
│ • Unlimited AI assistance              │
│ • Advanced lesson templates            │
│ • Priority support                     │
│ • Detailed analytics                   │
├─────────────────────────────────────────┤
│ [Upgrade to Premium $29/month]          │
│ [Contact Sales for Enterprise]         │
└─────────────────────────────────────────┘
```

### Contact Sales Flow (Principal)
```
Flow: Principal Dashboard → Contact Sales

1. Lead Capture Form
   ┌─────────────────────┐
   │ 📞 Contact Sales    │
   │                     │
   │ School: [Lincoln El.]│
   │ Size: [400 students]│
   │ Role: [Principal]   │
   │ Email: [principal@] │
   │ Phone: [555-0123]   │
   │                     │
   │ Needs:              │
   │ ☑️ Advanced AI tools │
   │ ☑️ Analytics suite   │
   │ ☐ Custom integrations│
   │                     │
   │ Message:            │
   │ [Need demo by Nov 15]│
   │                     │
   │ [Submit Request]    │
   └─────────────────────┘

2. Confirmation & Next Steps
   ┌─────────────────────┐
   │ ✅ Request Sent!    │
   │                     │
   │ Our education team  │
   │ will contact you    │
   │ within 24 hours.    │
   │                     │
   │ Meanwhile:          │
   │ 📅 Schedule Demo    │
   │ 📊 ROI Calculator   │
   │ 📋 Feature Comparison│
   │                     │
   │ Reference: #ED-2024-│
   │           0847      │
   └─────────────────────┘
```

---

## Accessibility & Performance

### Accessibility Standards
- **Touch Targets**: Minimum 44pt for all interactive elements
- **Color Contrast**: WCAG AA compliant (4.5:1 ratio minimum)
- **Screen Readers**: Semantic markup with proper ARIA labels
- **Keyboard Navigation**: Full app navigable via external keyboard
- **Text Size**: Support for system font size scaling

### Performance Optimizations
- **Loading States**: Skeleton screens during data fetch
- **Image Optimization**: WebP format with fallbacks
- **Caching Strategy**: 
  - Recent assignments cached 24h
  - Resources cached 7d
  - User profile cached until logout
- **Offline Support**: Core functionality available without network

### Error States
- **Network Errors**: Retry mechanisms with exponential backoff
- **API Errors**: User-friendly messages with contact support
- **Quota Limits**: Clear upgrade paths when limits reached
- **Server Errors**: Graceful degradation with cached data

---

## Technical Implementation Notes

### State Management
- **Authentication**: Context provider for user session
- **Role Detection**: Cached after login with refresh on app start
- **Feature Flags**: PostHog integration for gradual rollouts
- **Offline Sync**: SQLite local storage with sync queue

### Navigation Stack
```typescript
// Root navigation structure
App Layout
├── Auth Stack (when not signed in)
│   ├── Sign In
│   ├── Sign Up
│   └── Password Reset
└── Main Stack (when signed in, no back arrows)
    ├── SuperAdmin Stack
    │   ├── Dashboard (tabs: Global, Tenants, Sales, Settings)
    │   └── Detail Screens
    ├── Principal Stack  
    │   ├── Dashboard (tabs: Overview, Hub, Teachers, Resources, Settings)
    │   └── Meeting Room (full screen)
    ├── Teacher Stack
    │   ├── Dashboard (tabs: Classes, AI Tools, Assignments, Resources, Messages)
    │   └── AI Workflows (streaming interfaces)
    └── Parent Stack
        ├── Dashboard (tabs: Progress, Homework, Messages, Calendar, Settings)
        └── AI Homework Helper
```

### Design System Tokens
```typescript
// Role-based color schemes
const RoleColors = {
  superadmin: { primary: '#ff0080', secondary: '#ff8000' },
  principal: { primary: '#8000ff', secondary: '#00f5ff' },  
  teacher: { primary: '#ff0080', secondary: '#ff8000' },
  parent: { primary: '#00f5ff', secondary: '#0080ff' },
} as const;

// Component tokens
const ComponentTokens = {
  dashboardCard: {
    background: DesignSystem.colors.surface,
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: DesignSystem.spacing.md,
  },
  bottomTab: {
    height: 60,
    background: DesignSystem.colors.background,
    activeColor: role => RoleColors[role].primary,
    inactiveColor: DesignSystem.colors.text.secondary,
  },
} as const;
```

---

## Success Metrics & Testing

### Key Performance Indicators
- **Authentication Success Rate**: >99% login completion
- **Role Routing Accuracy**: 100% correct dashboard after login  
- **AI Tool Usage**: Track adoption rates by role and tier
- **Upgrade Conversion**: Monitor free → paid conversion funnels
- **Session Persistence**: Measure successful app restart logins

### A/B Testing Framework
- **Dashboard Layouts**: Test card arrangements by role
- **Upgrade CTAs**: Test messaging and placement
- **AI Tool Discovery**: Test different entry points
- **Navigation Patterns**: Bottom tabs vs side drawer

### Quality Assurance
- **Device Testing**: Android devices across screen sizes
- **Role Switching**: Test rapid role changes and permissions
- **Offline Scenarios**: Test app behavior without network
- **Performance**: Monitor render times and memory usage
- **Error Handling**: Simulate API failures and rate limits

---

This information architecture provides a comprehensive foundation for implementing the role-based dashboard system with clear user flows, accessibility considerations, and technical implementation guidance.
