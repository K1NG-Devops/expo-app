# EduDash Pro - Developer Cheat Sheet

> **Quick Reference Guide for Development Without AI**  
> Last Updated: 2025-10-18  
> Version: 1.0.2

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start Commands](#quick-start-commands)
3. [Project Structure](#project-structure)
4. [Key Concepts](#key-concepts)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Database Schema](#database-schema)
7. [Common Development Patterns](#common-development-patterns)
8. [Navigation & Routing](#navigation--routing)
9. [State Management](#state-management)
10. [AI Features](#ai-features)
11. [Authentication Flow](#authentication-flow)
12. [Common Tasks](#common-tasks)
13. [Troubleshooting](#troubleshooting)
14. [Important Files Reference](#important-files-reference)

---

## Project Overview

### What is EduDash Pro?

**EduDash Pro** is a comprehensive educational management system for South African preschools (ages 3-7). It's a React Native + Expo app targeting iOS, Android, and web.

### Core Value Proposition
- Multi-tenant SaaS platform (each preschool = isolated tenant)
- Role-based access control (5 roles: super_admin, principal, teacher, parent, student)
- AI-powered assistant (Dash) for lesson planning, grading, and communication
- WhatsApp integration for parent communication
- CAPS curriculum alignment (South African education standards)
- Financial management, attendance tracking, and analytics

### Tech Stack Summary
```
Frontend:     React Native 0.79.5 + Expo SDK 53
Language:     TypeScript 5.8
Navigation:   Expo Router (file-based, Stack navigation)
State:        React Query (@tanstack/react-query)
Backend:      Supabase (PostgreSQL + Real-time + Auth + Storage)
AI:           Claude API (via custom AI gateway)
Payments:     RevenueCat (subscriptions)
Analytics:    PostHog + Sentry
Ads:          Google Mobile Ads
```

---

## Quick Start Commands

### Development
```bash
# Install dependencies
npm install

# Start dev server (development build)
npm start
# or with cache clearing
npm run start:clear

# Open on Android (requires dev build)
npm run open:android

# Full dev workflow (start + open Android)
npm run dev:android

# Run on specific platforms
npm run android   # Android native build
npm run ios       # iOS native build
npm run web       # Web version
```

### Testing & Validation
```bash
# TypeScript type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check

# Tests
npm test
npm run test:watch
npm run test:coverage
```

### Database & Backend
```bash
# Inspect remote database
npm run inspect-db
npm run inspect-db-full

# Apply RLS policies
npm run setup-rls

# SQL linting
npm run lint:sql
npm run fix:sql
```

### Building
```bash
# Android production builds
npm run build:android:aab      # AAB for Play Store
npm run build:android:apk      # APK for testing
npm run build:android:preview  # Preview build (local)

# EAS builds (cloud)
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## Project Structure

```
edudashpro/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Landing page
│   ├── (auth)/                  # Auth screens group
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (parent)/                # Parent role screens
│   ├── screens/                 # Main app screens
│   │   ├── attendance.tsx
│   │   ├── parent-dashboard.tsx
│   │   ├── teacher-dashboard.tsx
│   │   ├── principal-dashboard.tsx
│   │   ├── ai-lesson-generator.tsx
│   │   └── ...111 more screens
│   └── admin-dashboard.tsx
│
├── components/                   # Reusable React components
│   ├── ai/                      # AI-related components
│   │   ├── DashAssistant.tsx   # Main AI assistant
│   │   ├── DashVoiceInput.tsx  # Voice input component
│   │   └── VoiceRecorderSheet.tsx
│   ├── auth/                    # Authentication components
│   ├── dashboard/               # Dashboard components
│   ├── ui/                      # UI components (buttons, cards, etc.)
│   └── ...
│
├── lib/                         # Core business logic & utilities
│   ├── supabase.ts             # Supabase client initialization
│   ├── database.types.ts       # Generated database types
│   ├── ai/                     # AI logic & gating
│   │   ├── allocation.ts       # AI usage allocation
│   │   ├── subscription-gating.ts
│   │   └── lessonGenerator.ts
│   ├── auth/                   # Auth services
│   │   ├── AuthService.ts
│   │   └── useAuth.ts
│   ├── rbac/                   # Role-based access control
│   │   ├── roles-permissions.json
│   │   └── validate.ts
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Service layer (API wrappers)
│   ├── utils/                  # Utility functions
│   └── constants/              # App constants
│       └── edudash-features.ts # Feature catalog
│
├── services/                    # Service classes
│   ├── DashAIAssistant.ts     # Main AI assistant service
│   ├── DashTaskAutomation.ts  # Task automation
│   ├── LessonsService.ts      # Lesson management
│   └── ...44 services
│
├── contexts/                    # React contexts
│   ├── AuthContext.tsx         # Authentication state
│   ├── ThemeContext.tsx        # Theme/dark mode
│   ├── SubscriptionContext.tsx # Subscription state
│   └── ...
│
├── hooks/                       # Custom hooks
│   ├── useAI.ts               # AI integration hook
│   ├── useDashboardData.ts    # Dashboard data
│   ├── useFeatureFlags.ts     # Feature flags
│   └── ...20 hooks
│
├── constants/                   # App-wide constants
│   ├── Colors.ts
│   └── ...
│
├── assets/                      # Static assets
│   ├── branding/
│   ├── sounds/
│   └── locales/                # i18n translations
│
├── db/                         # Database migration scripts
├── migrations/                 # SQL migrations
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
│
├── app.json                    # Expo app config (static)
├── app.config.js              # Dynamic Expo config
├── eas.json                   # EAS Build configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── babel.config.js            # Babel config
```

---

## Key Concepts

### 1. Multi-Tenancy
**Every query MUST filter by `preschool_id`**

```typescript
// ✅ CORRECT - Tenant-safe
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('preschool_id', user.preschool_id);

// ❌ WRONG - Cross-tenant leak!
const { data } = await supabase
  .from('students')
  .select('*');  // Returns ALL students from ALL schools!
```

**Why it matters:**
- Each preschool is a separate tenant
- RLS (Row Level Security) enforces at database level
- Never query without preschool_id filter
- Security breach if violated

### 2. Role-Based Access Control (RBAC)

**5 Core Roles:**
```typescript
type UserRole = 
  | 'super_admin'  // Platform admin (all access)
  | 'principal'    // School owner/manager
  | 'teacher'      // Class teacher
  | 'parent'       // Student parent/guardian
  | 'student'      // Learner (limited)
```

**Permission Checking:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { profile, permissions } = useAuth();
  
  // Check role
  if (profile.hasRole('teacher')) {
    // Teacher-only UI
  }
  
  // Check permission
  if (permissions.can('manage_courses')) {
    // Show manage courses button
  }
  
  // Check capability
  if (profile.hasCapability('ai_lesson_tools')) {
    // Show AI features
  }
}
```

### 3. Subscription Tiers

**4 Tiers:**
- `free` - Trial (20 AI requests/day, 10 students)
- `starter` - Basic features (100 AI requests/day)
- `premium` - Full features (500 AI requests/day)
- `enterprise` - Unlimited (2000 AI requests/day)

**Feature Gating:**
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function PremiumFeature() {
  const { tier, hasFeature } = useSubscription();
  
  if (!hasFeature('ai_lesson_generator')) {
    return <UpgradePrompt />;
  }
  
  return <AILessonGenerator />;
}
```

### 4. File-Based Routing (Expo Router)

**Routes are generated from file structure:**
```
app/
  index.tsx              → /
  (auth)/
    sign-in.tsx         → /sign-in
  screens/
    attendance.tsx      → /screens/attendance
  [id].tsx             → /123 (dynamic route)
```

**Navigation:**
```typescript
import { router } from 'expo-router';

// Navigate forward
router.push('/screens/attendance');

// Navigate with params
router.push({ 
  pathname: '/screens/student-detail', 
  params: { id: '123' } 
});

// Go back
router.back();

// Replace (no back navigation)
router.replace('/parent-dashboard');
```

---

## User Roles & Permissions

### Role Hierarchy

```
Level 4: super_admin (platform-wide access)
Level 3: principal (organization-wide access)
Level 2: teacher (class-level access)
Level 1: parent/student (self-access only)
```

### Common Permissions by Role

**Super Admin:**
- All permissions
- Manage organizations
- View system logs
- Manage AI quotas
- Access all dashboards

**Principal:**
- Manage school settings
- Manage teachers & students
- View financial reports
- Create announcements
- Approve expenses
- Manage classes
- View all attendance/grades

**Teacher:**
- Manage own classes
- Mark attendance
- Record grades
- Create lesson plans
- Message parents
- View student profiles
- Use AI tools (if tier allows)

**Parent:**
- View own children
- View attendance & grades
- Message teachers
- Upload proof of payment
- View announcements
- Limited AI help

**Student:**
- View own profile
- View own attendance
- View own grades

### Permission Reference

See `lib/rbac/roles-permissions.json` for complete matrix.

**Key permissions:**
- `manage_users` - Create/edit users
- `manage_courses` - CRUD courses
- `grade_assignments` - Enter grades
- `view_student_progress` - View analytics
- `use_ai_lesson_tools` - Access AI lesson generator
- `access_admin_dashboard` - Admin UI access

---

## Database Schema

### Core Tables

**preschools** (Organizations/Tenants)
```typescript
{
  id: uuid (PK)
  name: string
  subscription_tier: 'free' | 'starter' | 'premium' | 'enterprise'
  owner_id: uuid (FK -> users)
  created_at: timestamp
  settings: jsonb
}
```

**users** (All user accounts)
```typescript
{
  id: uuid (PK, = auth.users.id)
  email: string
  role: 'super_admin' | 'principal' | 'teacher' | 'parent' | 'student'
  preschool_id: uuid (FK -> preschools)
  first_name: string
  last_name: string
  avatar_url: string
  capabilities: string[] // e.g. ['ai_lesson_tools']
  seat_status: 'active' | 'invited' | 'inactive'
}
```

**students** (Learners)
```typescript
{
  id: uuid (PK)
  preschool_id: uuid (FK -> preschools)
  class_id: uuid (FK -> classes)
  first_name: string
  last_name: string
  date_of_birth: date
  parent_ids: uuid[] // Array of user IDs
  medical_info: jsonb
}
```

**classes** (Class/grade groupings)
```typescript
{
  id: uuid (PK)
  preschool_id: uuid (FK -> preschools)
  name: string // e.g. "Grade R - Blue"
  teacher_id: uuid (FK -> users)
  age_group: string
  capacity: integer
}
```

**attendance** (Daily attendance)
```typescript
{
  id: uuid (PK)
  preschool_id: uuid (FK -> preschools)
  student_id: uuid (FK -> students)
  date: date
  status: 'present' | 'absent' | 'late' | 'excused'
  notes: text
}
```

**grades** (Assessment results)
```typescript
{
  id: uuid (PK)
  preschool_id: uuid (FK -> preschools)
  student_id: uuid (FK -> students)
  assessment_id: uuid (FK -> assessments)
  score: numeric
  feedback: text
  graded_by: uuid (FK -> users)
}
```

**messages** (In-app messaging)
```typescript
{
  id: uuid (PK)
  preschool_id: uuid (FK -> preschools)
  sender_id: uuid (FK -> users)
  recipient_id: uuid (FK -> users)
  content: text
  read_at: timestamp
  thread_id: uuid
}
```

**conversation_history** (Dash AI chat history)
```typescript
{
  id: uuid (PK)
  preschool_id: uuid (FK -> preschools)
  user_id: uuid (FK -> users)
  messages: jsonb[] // Array of {role, content}
  context: jsonb
  created_at: timestamp
}
```

### RLS (Row Level Security)

**All tables have RLS enabled.**

Example RLS policy (students table):
```sql
-- Teachers/principals can see students in their preschool
CREATE POLICY "Users can view students in their preschool"
ON students FOR SELECT
USING (
  preschool_id = (SELECT preschool_id FROM users WHERE id = auth.uid())
);

-- Parents can only see their own children
CREATE POLICY "Parents can view own children"
ON students FOR SELECT
USING (
  auth.uid() = ANY(parent_ids)
);
```

---

## Common Development Patterns

### 1. Fetching Data (React Query)

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function useStudents() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['students', profile.preschool_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(*)')
        .eq('preschool_id', profile.preschool_id)
        .order('last_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile.preschool_id, // Only run if we have preschool_id
  });
}

// Usage in component
function StudentList() {
  const { data: students, isLoading, error } = useStudents();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <FlatList 
      data={students}
      renderItem={({ item }) => <StudentCard student={item} />}
    />
  );
}
```

### 2. Mutations (Create/Update/Delete)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateStudent() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (studentData: NewStudent) => {
      const { data, error } = await supabase
        .from('students')
        .insert({
          ...studentData,
          preschool_id: profile.preschool_id, // Always add tenant ID!
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate students query to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['students', profile.preschool_id] 
      });
    },
  });
}

// Usage
function AddStudentForm() {
  const createStudent = useCreateStudent();
  
  const handleSubmit = async (formData) => {
    try {
      await createStudent.mutateAsync(formData);
      router.back();
    } catch (error) {
      showError(error.message);
    }
  };
  
  return <Form onSubmit={handleSubmit} />;
}
```

### 3. Role-Based Rendering

```typescript
import { useAuth } from '@/contexts/AuthContext';

function Dashboard() {
  const { profile, permissions } = useAuth();
  
  // Simple role check
  if (profile.hasRole('parent')) {
    return <ParentDashboard />;
  }
  
  if (profile.hasRole('teacher')) {
    return <TeacherDashboard />;
  }
  
  if (profile.hasRole('principal')) {
    return <PrincipalDashboard />;
  }
  
  // Or use switch
  switch (profile.role) {
    case 'parent':
      return <ParentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'principal':
      return <PrincipalDashboard />;
    case 'super_admin':
      return <AdminDashboard />;
    default:
      return <ErrorScreen />;
  }
}

// Conditional features
function QuickActions() {
  const { permissions } = useAuth();
  
  return (
    <View>
      {permissions.can('manage_courses') && (
        <Button onPress={() => router.push('/screens/create-lesson')}>
          Create Lesson
        </Button>
      )}
      
      {permissions.can('grade_assignments') && (
        <Button onPress={() => router.push('/screens/grades')}>
          Enter Grades
        </Button>
      )}
    </View>
  );
}
```

### 4. AI Integration Pattern

```typescript
import { useAI } from '@/hooks/useAI';

function LessonGenerator() {
  const { generate, isLoading, error } = useAI();
  
  const handleGenerate = async () => {
    try {
      const lesson = await generate({
        prompt: 'Create a Grade R math lesson about counting',
        feature: 'lesson_generation',
        model: 'sonnet', // or 'haiku' or 'opus'
      });
      
      // lesson.content contains the generated lesson
      console.log(lesson);
    } catch (error) {
      if (error.message.includes('quota')) {
        showUpgradeModal();
      }
    }
  };
  
  return (
    <Button onPress={handleGenerate} loading={isLoading}>
      Generate Lesson
    </Button>
  );
}
```

### 5. Subscription Gating

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function PremiumFeature() {
  const { tier, hasFeature, openUpgradeModal } = useSubscription();
  
  const handleUse = () => {
    if (!hasFeature('ai_lesson_generator')) {
      openUpgradeModal('ai_lesson_generator');
      return;
    }
    
    // Use the feature
    proceedWithFeature();
  };
  
  return (
    <View>
      <Text>AI Lesson Generator</Text>
      {tier === 'free' && <Badge>Premium Only</Badge>}
      <Button 
        onPress={handleUse}
        disabled={tier === 'free'}
      >
        Generate Lesson
      </Button>
    </View>
  );
}
```

---

## Navigation & Routing

### File-Based Routes

**Expo Router** uses file structure for routes:

```
app/
  index.tsx                    → /
  _layout.tsx                  → Layout wrapper
  (auth)/
    _layout.tsx               → Auth group layout
    sign-in.tsx               → /sign-in
  screens/
    attendance.tsx            → /screens/attendance
    [studentId].tsx           → /screens/123 (dynamic)
```

### Navigation Methods

```typescript
import { router } from 'expo-router';

// Push (can go back)
router.push('/screens/attendance');

// With params
router.push({
  pathname: '/screens/student-detail',
  params: { id: student.id }
});

// Replace (can't go back)
router.replace('/parent-dashboard');

// Go back
router.back();

// Go to specific route
router.navigate('/screens/attendance');

// Dismiss modals
router.dismiss();
```

### Getting Params

```typescript
import { useLocalSearchParams } from 'expo-router';

function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // Use id to fetch student
  const student = useStudent(id);
  
  return <StudentProfile student={student} />;
}
```

### Protected Routes

Routes are protected in `app/_layout.tsx`:

```typescript
// In _layout.tsx
function LayoutContent() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  useEffect(() => {
    if (!loading && !user && !isPublicRoute(pathname)) {
      router.replace('/sign-in');
    }
  }, [user, loading, pathname]);
  
  // Render routes
}
```

---

## State Management

### Global State (React Context)

**AuthContext** - User authentication & profile
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { 
  user,           // Supabase user
  session,        // Supabase session
  profile,        // Enhanced user profile
  permissions,    // Permission checker
  loading,        // Auth loading state
  refreshProfile, // Refresh user data
  signOut,        // Sign out function
} = useAuth();
```

**SubscriptionContext** - Subscription state
```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

const { 
  tier,           // Current tier (free/starter/premium/enterprise)
  hasFeature,     // (featureId) => boolean
  aiQuota,        // Remaining AI requests
  openUpgradeModal, // Show upgrade prompt
} = useSubscription();
```

**ThemeContext** - Theme/dark mode
```typescript
import { useTheme } from '@/contexts/ThemeContext';

const { 
  theme,          // 'light' | 'dark'
  colors,         // Color palette
  toggleTheme,    // Toggle dark mode
} = useTheme();
```

### Server State (React Query)

**Query Client** is set up in `lib/query/queryClient.tsx`.

**Common patterns:**
```typescript
// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['students', preschoolId],
  queryFn: fetchStudents,
});

// Create/update/delete
const mutation = useMutation({
  mutationFn: createStudent,
  onSuccess: () => {
    queryClient.invalidateQueries(['students']);
  },
});

// Optimistic updates
const updateMutation = useMutation({
  mutationFn: updateStudent,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['students']);
    const prev = queryClient.getQueryData(['students']);
    queryClient.setQueryData(['students'], (old) => [...old, newData]);
    return { prev };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['students'], context.prev);
  },
});
```

---

## AI Features

### Dash AI Assistant

**Core AI Service:** `services/DashAIAssistant.ts`

**Features:**
- Conversational AI (Claude-powered)
- Voice input & output
- Context-aware (knows current screen, user role, preschool data)
- Task automation (can navigate, create records)
- Lesson generation, grading assistance, parent messaging

**Usage:**
```typescript
import { DashAIAssistant } from '@/services/DashAIAssistant';

const dash = DashAIAssistant.getInstance();

// Send message
const response = await dash.sendMessage({
  message: 'Help me create a lesson plan',
  context: {
    screen: 'lesson-planning',
    role: 'teacher',
    metadata: { subject: 'math' }
  }
});

// Voice input
const transcription = await dash.processVoiceInput(audioBlob);
```

### AI Allocation System

**Path:** `lib/ai/allocation.ts`

**Controls:**
- Usage tracking (requests per hour/day)
- Quota enforcement
- Tier-based limits
- Model selection (haiku/sonnet/opus)

**Check quota:**
```typescript
import { checkAIQuota } from '@/lib/ai/allocation';

const canUse = await checkAIQuota({
  userId: user.id,
  preschoolId: user.preschool_id,
  feature: 'lesson_generation',
});

if (!canUse) {
  showUpgradePrompt();
}
```

### AI Features by Tier

| Feature | Free | Starter | Premium | Enterprise |
|---------|------|---------|---------|------------|
| Requests/day | 20 | 100 | 500 | 2000 |
| Models | haiku | haiku, sonnet | all | all |
| Lesson Generator | ❌ | ✅ | ✅ | ✅ |
| AI Grading | ❌ | ✅ | ✅ | ✅ |
| Voice Input | ❌ | ❌ | ✅ | ✅ |
| Homework Help | ❌ | ❌ | ✅ | ✅ |

---

## Authentication Flow

### Sign In Process

```
1. User enters email/password
   ↓
2. Call supabase.auth.signInWithPassword()
   ↓
3. Session created (stored in SecureStore)
   ↓
4. AuthContext fetches user profile
   ↓
5. Profile includes role, preschool_id, capabilities
   ↓
6. Redirect to role-specific dashboard
   - parent → /(parent)/home
   - teacher → /screens/teacher-dashboard
   - principal → /screens/principal-dashboard
```

### Sign Up Process

```
1. User selects role
   ↓
2. User fills registration form
   ↓
3. Call supabase.auth.signUp()
   ↓
4. Trigger creates user profile in 'users' table
   ↓
5. Email verification sent
   ↓
6. User verifies email
   ↓
7. Profile activated, sign in
```

### Protected Routes

All routes except `/sign-in`, `/sign-up`, `/landing` require authentication.

**Implementation:** `app/_layout.tsx` checks auth status and redirects.

### Biometric Authentication

**Optional feature** for quick sign-in.

```typescript
import { BiometricAuthService } from '@/services/BiometricAuthService';

const biometric = BiometricAuthService.getInstance();

// Check if available
const isAvailable = await biometric.isAvailable();

// Authenticate
const result = await biometric.authenticate('Sign in to EduDash Pro');
if (result.success) {
  // Proceed with sign in
}
```

---

## Common Tasks

### 1. Add a New Screen

1. Create file in `app/screens/`
   ```typescript
   // app/screens/my-new-screen.tsx
   import React from 'react';
   import { View, Text } from 'react-native';
   
   export default function MyNewScreen() {
     return (
       <View>
         <Text>My New Screen</Text>
       </View>
     );
   }
   ```

2. Navigate to it
   ```typescript
   router.push('/screens/my-new-screen');
   ```

### 2. Add Role Protection

```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function AdminOnlyScreen() {
  const { profile } = useAuth();
  
  if (!profile.hasRole('super_admin')) {
    return <UnauthorizedScreen />;
  }
  
  return <AdminContent />;
}
```

### 3. Create a New Database Query

1. Define TypeScript type (use generated types from `lib/database.types.ts`)
2. Create custom hook
   ```typescript
   // hooks/useAttendance.ts
   export function useAttendance(date: string) {
     const { profile } = useAuth();
     
     return useQuery({
       queryKey: ['attendance', profile.preschool_id, date],
       queryFn: async () => {
         const { data, error } = await supabase
           .from('attendance')
           .select('*, students(*)')
           .eq('preschool_id', profile.preschool_id)
           .eq('date', date);
         
         if (error) throw error;
         return data;
       },
     });
   }
   ```

3. Use in component
   ```typescript
   const { data: attendance } = useAttendance('2025-10-18');
   ```

### 4. Add Feature Flag

1. Add to `lib/featureFlags.ts`
   ```typescript
   export const FEATURES = {
     NEW_FEATURE: 'new_feature',
   };
   ```

2. Check in code
   ```typescript
   import { useFeatureFlags } from '@/hooks/useFeatureFlags';
   
   const { isEnabled } = useFeatureFlags();
   
   if (isEnabled(FEATURES.NEW_FEATURE)) {
     // Show new feature
   }
   ```

### 5. Add AI Capability

1. Update subscription tier in `lib/constants/edudash-features.ts`
2. Add capability check
   ```typescript
   if (profile.hasCapability('my_new_ai_feature')) {
     // Allow access
   }
   ```

### 6. Internationalization (i18n)

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('common.welcome')}</Text>
  );
}
```

**Add translations:** `assets/locales/en/translation.json`

---

## Troubleshooting

### Build Issues

**Problem:** TypeScript errors on build  
**Solution:** Build skips typecheck (see `package.json` line 71). Fix errors when time permits.

**Problem:** "Cannot find module"  
**Solution:** 
```bash
rm -rf node_modules
npm install
```

**Problem:** Android build fails  
**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
```

### Runtime Issues

**Problem:** White screen on app start  
**Solution:** Check console for errors. Often auth or env variable issue.

**Problem:** "preschool_id is null"  
**Solution:** User profile not loaded. Check AuthContext.

**Problem:** Query returns empty  
**Solution:** RLS policy blocking access. Check user role/permissions.

**Problem:** AI requests failing  
**Solution:** Check quota, tier, and API key in env vars.

### Database Issues

**Problem:** RLS policy blocking my query  
**Solution:** Add user to correct role or update RLS policy in Supabase.

**Problem:** Foreign key constraint error  
**Solution:** Check that referenced records exist before inserting.

---

## Important Files Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `app.json` | Static Expo configuration |
| `app.config.js` | Dynamic Expo config (env-based) |
| `eas.json` | EAS Build profiles (dev/preview/production) |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript compiler options |
| `babel.config.js` | Babel transpiler config |
| `metro.config.js` | Metro bundler config |

### Key Source Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, providers, auth guard |
| `lib/supabase.ts` | Supabase client initialization |
| `lib/database.types.ts` | Generated DB types (DO NOT EDIT) |
| `contexts/AuthContext.tsx` | Authentication state |
| `lib/rbac/roles-permissions.json` | Permission matrix |
| `lib/constants/edudash-features.ts` | Feature catalog |
| `services/DashAIAssistant.ts` | Main AI assistant service |
| `lib/ai/allocation.ts` | AI usage tracking/limits |

### Services

| Service | Purpose |
|---------|---------|
| `DashAIAssistant.ts` | AI conversation and task automation |
| `DashTaskAutomation.ts` | Automated task execution |
| `LessonsService.ts` | Lesson CRUD operations |
| `OrganizationService.ts` | Preschool/org management |
| `BiometricAuthService.ts` | Fingerprint/Face ID |
| `NotificationService.ts` | Push notifications |
| `SMSService.ts` | SMS via Twilio |
| `GoogleCalendarService.ts` | Calendar integration |

### Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Current user, profile, permissions |
| `useAI()` | AI request wrapper |
| `useSubscription()` | Subscription tier, features |
| `useFeatureFlags()` | Feature flag checks |
| `useDashboardData()` | Dashboard stats |
| `useLessonGenerator()` | AI lesson generation |

---

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Start dev server
npm run start:clear

# 4. Open on device/emulator
npm run open:android
# or
npm run ios
```

### Before Committing

```bash
# 1. Format code
npm run format

# 2. Lint
npm run lint

# 3. Type check (optional, build will skip)
npm run typecheck

# 4. Commit
git add .
git commit -m "feat: add new feature"
git push
```

### Testing on Device

```bash
# Build development client (one-time)
eas build --profile development --platform android

# Install on device
# Download APK from EAS and install

# Run dev server
npm start

# Scan QR code with dev client
```

---

## Environment Variables

### Required Variables

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx

# App Config
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_TENANT_SLUG=your-school

# AI Features
EXPO_PUBLIC_AI_ENABLED=true
EXPO_PUBLIC_AI_GATEWAY_URL=https://xxx
```

### Optional Variables

```bash
# AdMob
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-xxx
EXPO_PUBLIC_ENABLE_ADS=true

# RevenueCat
EXPO_PUBLIC_REVENUECAT_ANDROID_SDK_KEY=xxx

# Analytics
EXPO_PUBLIC_POSTHOG_KEY=xxx
EXPO_PUBLIC_SENTRY_DSN=xxx

# WhatsApp
EXPO_PUBLIC_WHATSAPP_API_ENABLED=true
```

See `.env.example` for complete list.

---

## Quick Reference: Component Patterns

### Screen Template

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function MyScreen() {
  const { profile } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['myData', profile.preschool_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('my_table')
        .select('*')
        .eq('preschool_id', profile.preschool_id);
      return data;
    },
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Screen</Text>
      {/* Content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

### List with Pull-to-Refresh

```typescript
import { FlatList, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function StudentList() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents,
  });
  
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <StudentCard student={item} />}
      refreshControl={
        <RefreshControl 
          refreshing={isLoading}
          onRefresh={refetch}
        />
      }
    />
  );
}
```

---

## Resources

### Documentation
- Expo Docs: https://docs.expo.dev/
- React Native: https://reactnative.dev/
- Supabase: https://supabase.com/docs
- React Query: https://tanstack.com/query/latest

### Internal Docs
- See `docs/` folder for detailed guides
- `docs/deployment/` - Deployment guides
- `docs/development/` - Development practices
- `docs/features/` - Feature documentation

### Helpful Commands Quick Reference

```bash
# Development
npm start                    # Start dev server
npm run open:android        # Open on Android
npm run web                 # Run web version

# Code Quality
npm run lint                # Check linting
npm run format              # Format code
npm run typecheck           # Check types

# Database
npm run inspect-db          # View DB structure
npm run setup-rls           # Apply RLS policies

# Building
npm run build:android:apk   # Build APK
eas build --platform android --profile production

# Cleaning
rm -rf node_modules && npm install  # Clean install
npx expo prebuild --clean            # Clean native folders
```

---

**Last Updated:** 2025-10-18  
**Version:** 1.0.2  
**Maintainer:** EduDash Pro Development Team

For questions or issues, check `docs/` or create a GitHub issue.
