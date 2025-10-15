# Database Schema - EduDash Pro Phase 1

**Version:** 1.0.0  
**Date:** 2025-09-21  
**Status:** ✅ COMPLETE

## 📋 **Overview**

This document describes the database schema for EduDash Pro Phase 1, which adds core educational entities to the existing Supabase infrastructure while maintaining full compatibility with the current system.

### 🎯 **Design Principles**

- **Backward Compatible**: Works seamlessly with existing `profiles`, `preschools`, and subscription tables
- **Security First**: Row Level Security (RLS) enforced on all tables with role-based access
- **Scalable**: Designed to handle growth from small schools to large organizations  
- **Auditable**: Comprehensive logging and soft deletes for data integrity
- **AI Ready**: Built-in AI usage tracking and tier management

## 🗃️ **Schema Overview**

### **Core Educational Entities** (5 tables)
- **`courses`** - Course/class management
- **`enrollments`** - Student-course relationships  
- **`assignments`** - Homework/tasks/projects
- **`submissions`** - Student work submissions
- **`grades`** - Instructor grading and feedback

### **AI Management** (3 tables)  
- **`ai_model_tiers`** - AI tier configurations (free, starter, premium, enterprise)
- **`user_ai_tiers`** - User AI tier assignments
- **`ai_usage`** - AI usage tracking and analytics

### **Audit & Security** (1 table)
- **`audit_logs`** - Security and activity audit trail

## 📚 **Table Definitions**

### 🎓 **Courses Table**

Primary table for course/class management.

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    course_code TEXT,
    instructor_id UUID REFERENCES profiles(id),
    organization_id UUID REFERENCES preschools(id),
    is_active BOOLEAN DEFAULT true,
    max_students INTEGER,
    join_code TEXT UNIQUE, -- Student enrollment codes
    join_code_expires_at TIMESTAMPTZ,
    start_date DATE,
    end_date DATE,
    metadata JSONB DEFAULT '{}',
    deleted_at TIMESTAMPTZ, -- Soft delete
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Features:**
- **Organization Scoped**: Each course belongs to a preschool/organization
- **Join Codes**: Students can self-enroll using generated codes
- **Soft Deletes**: Courses are archived, not permanently deleted
- **Flexible Metadata**: JSONB field for custom course properties

**Access Control:**
- **Super Admins**: Can view/manage all courses
- **Instructors**: Can create courses in their organization, manage own courses
- **Students**: Can view courses they're enrolled in

### 👥 **Enrollments Table**

Many-to-many relationship between students and courses.

```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY,
    student_id UUID REFERENCES profiles(id),
    course_id UUID REFERENCES courses(id),
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    enrollment_method TEXT, -- 'manual', 'join_code', 'admin_assigned'
    is_active BOOLEAN DEFAULT true,
    dropped_at TIMESTAMPTZ,
    drop_reason TEXT,
    UNIQUE(student_id, course_id)
);
```

**Key Features:**
- **Unique Enrollment**: One enrollment record per student per course
- **Enrollment Tracking**: Records how student joined (manual vs join code)
- **Drop Support**: Students can drop courses with reason tracking

**Access Control:**
- **Instructors**: Can manage enrollments for their courses
- **Students**: Can enroll themselves and view own enrollments

### 📝 **Assignments Table**

Homework, quizzes, projects, and other coursework.

```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    course_id UUID REFERENCES courses(id),
    assignment_type TEXT DEFAULT 'homework', -- 'quiz', 'exam', 'project'
    max_points DECIMAL(8,2) DEFAULT 100.00,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    due_at TIMESTAMPTZ,
    available_from TIMESTAMPTZ DEFAULT now(),
    available_until TIMESTAMPTZ,
    allow_late_submissions BOOLEAN DEFAULT true,
    late_penalty_percent DECIMAL(5,2) DEFAULT 0,
    max_attempts INTEGER DEFAULT 1,
    attachments JSONB DEFAULT '[]', -- File URLs from Supabase Storage
    deleted_at TIMESTAMPTZ
);
```

**Key Features:**
- **Flexible Types**: Homework, quizzes, exams, projects, labs, discussions
- **Time Controls**: Availability windows and due dates
- **Late Policy**: Configurable late submission penalties  
- **File Attachments**: Integration with Supabase Storage
- **Multiple Attempts**: Support for retakes/resubmissions

**Access Control:**
- **Instructors**: Can create/manage assignments for their courses
- **Students**: Can view assignments for enrolled courses (within availability window)

### 📄 **Submissions Table**

Student work submissions for assignments.

```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    assignment_id UUID REFERENCES assignments(id),
    student_id UUID REFERENCES profiles(id),
    content TEXT, -- Text submission
    attachments JSONB DEFAULT '[]', -- File attachments
    submission_type TEXT DEFAULT 'text', -- 'file', 'url', 'multiple'
    attempt_number INTEGER DEFAULT 1,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    is_late BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    ai_assistance_used BOOLEAN DEFAULT false,
    ai_assistance_details JSONB DEFAULT '{}',
    UNIQUE(assignment_id, student_id, attempt_number)
);
```

**Key Features:**
- **Multiple Formats**: Text, file uploads, URLs, or combinations
- **Attempt Tracking**: Support for multiple submission attempts
- **Draft Support**: Students can save work in progress
- **AI Transparency**: Track when AI assistance was used for academic integrity

**Access Control:**
- **Students**: Can create/update own submissions (within assignment deadlines)
- **Instructors**: Can view all submissions for their assignments

### 📊 **Grades Table**

Instructor grading and feedback on submissions.

```sql
CREATE TABLE grades (
    id UUID PRIMARY KEY,
    submission_id UUID REFERENCES submissions(id),
    graded_by UUID REFERENCES profiles(id),
    points_earned DECIMAL(8,2),
    points_possible DECIMAL(8,2),
    percentage DECIMAL(5,2) GENERATED ALWAYS AS ((points_earned / points_possible) * 100) STORED,
    letter_grade TEXT, -- 'A', 'B+', 'Pass', 'Fail'
    feedback TEXT,
    rubric_scores JSONB DEFAULT '{}',
    ai_assistance_used BOOLEAN DEFAULT false,
    ai_suggestions JSONB DEFAULT '{}',
    is_final BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,
    UNIQUE(submission_id)
);
```

**Key Features:**
- **Flexible Scoring**: Points-based with automatic percentage calculation
- **Letter Grades**: Optional letter grade assignment
- **Rich Feedback**: Text feedback plus structured rubric scoring
- **AI Integration**: Track AI-assisted grading with suggestions
- **Publication Control**: Instructors control when students see grades

**Access Control:**
- **Instructors**: Can create/update grades for their assignment submissions
- **Students**: Can view own published grades only

## 🤖 **AI Management Tables**

### **AI Model Tiers Table**

Configuration for different AI access levels.

```sql
CREATE TABLE ai_model_tiers (
    id UUID PRIMARY KEY,
    tier ai_model_tier, -- 'free', 'starter', 'premium', 'enterprise'
    name TEXT,
    allowed_models JSONB, -- ["claude-3-haiku", "claude-3-sonnet"]
    max_requests_per_minute INTEGER,
    max_requests_per_day INTEGER,
    max_requests_per_month INTEGER,
    features JSONB, -- {"ai_homework_helper": true}
    restrictions JSONB DEFAULT '{}'
);
```

**Pre-configured Tiers:**

| Tier | Models | Daily Limit | Features |
|------|--------|-------------|----------|
| **Free** | Haiku only | 50 | Basic homework help |
| **Starter** | Haiku + Sonnet | 500 | + Lesson generation, grading |
| **Premium** | All models | 1000 | + STEM activities, analysis |
| **Enterprise** | All models | Unlimited | + Quota management |

### **User AI Tiers Table**

Assigns AI tiers to individual users.

```sql
CREATE TABLE user_ai_tiers (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    tier ai_model_tier DEFAULT 'free',
    assigned_by UUID REFERENCES profiles(id),
    override_daily_limit INTEGER, -- NULL uses tier default
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id)
);
```

### **AI Usage Table**

Tracks all AI requests for analytics and quota enforcement.

```sql
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    organization_id UUID REFERENCES preschools(id),
    model_used TEXT,
    feature_used TEXT, -- 'lesson_generation', 'homework_help'
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    usage_date DATE DEFAULT CURRENT_DATE,
    usage_hour INTEGER DEFAULT EXTRACT(hour FROM now())
);
```

## 🛡️ **Security Model**

### **Row Level Security (RLS)**

All tables have RLS enabled with comprehensive policies:

#### **Super Admin Access**
- Full read/write access to all data across all organizations
- Can manage AI tiers and view all audit logs
- Maps to existing `super_admin` and `superadmin` roles

#### **Organization Scoped Access**  
- **Principals**: Can manage courses/assignments/grades within their organization
- **Teachers**: Can manage their own courses and related data
- Maps to existing `principal`, `principal_admin`, `teacher` roles

#### **Self-Scoped Access**
- **Students**: Can view enrolled courses, submit assignments, view own grades
- **Parents**: Can view child's data (existing functionality preserved)

### **Helper Functions**

Key functions for RBAC enforcement:

```sql
-- Check user roles
public.is_super_admin() -> BOOLEAN
public.is_admin_level() -> BOOLEAN  
public.is_instructor_level() -> BOOLEAN

-- Organization access
public.get_user_organization_id() -> UUID
public.can_access_organization(org_id UUID) -> BOOLEAN

-- AI management
public.get_user_ai_tier(user_id UUID) -> ai_model_tier
public.record_ai_usage(...) -> UUID
```

## 📈 **Performance Optimizations**

### **Strategic Indexing**

- **Relationship Lookups**: All foreign keys indexed
- **Common Queries**: Instructor courses, student enrollments, due assignments
- **Time-based Queries**: Assignment due dates, usage tracking by date
- **Composite Indexes**: Multi-column indexes for complex queries

### **Query Patterns**

**Example: Get student's active courses**
```sql
SELECT c.* FROM courses c
JOIN enrollments e ON e.course_id = c.id
WHERE e.student_id = $1 
AND e.is_active = true 
AND c.deleted_at IS NULL;
-- Uses: idx_enrollments_student_id, idx_courses_active
```

**Example: Instructor's pending grades**
```sql
SELECT s.*, a.title FROM submissions s
JOIN assignments a ON a.id = s.assignment_id
JOIN courses c ON c.id = a.course_id
LEFT JOIN grades g ON g.submission_id = s.id
WHERE c.instructor_id = $1 
AND g.id IS NULL
AND s.is_draft = false;
-- Uses: idx_courses_instructor_id, idx_grades_submission_id
```

## 🔄 **Integration with Existing System**

### **Compatibility Matrix**

| Existing Table | Phase 1 Integration | Notes |
|---------------|-------------------|--------|
| **`profiles`** | ✅ Full integration | instructor_id, student_id, graded_by references |
| **`preschools`** | ✅ Full integration | organization_id references |  
| **`subscriptions`** | ✅ Compatible | AI tiers can reference subscription data |
| **`user_entitlements`** | ✅ Compatible | Can drive AI tier assignments |

### **Existing Role Mapping**

Phase 1 schema works seamlessly with your existing 5-role system:

| Existing Role | Phase 1 Access Level | Schema Permissions |
|--------------|-------------------|-------------------|
| `super_admin` | Super Admin | Full access to all tables |
| `principal_admin` | Admin Level | Organization-scoped access |
| `principal` | Admin Level | Organization-scoped access |
| `teacher` | Instructor Level | Course-scoped access |
| `parent` | Student Level | Child-scoped access |

## 🚀 **Migration Files**

Three migration files create the complete schema:

1. **`20250921_000100_phase1_core_entities.sql`** (329 lines)
   - Core educational tables
   - Indexes and constraints
   - Utility functions and triggers

2. **`20250921_000200_phase1_ai_audit_entities.sql`** (392 lines)  
   - AI management tables
   - Audit logging system
   - Default AI tier data

3. **`20250921_000300_phase1_rls_policies.sql`** (387 lines)
   - Row Level Security policies
   - RBAC helper functions
   - Access control enforcement

**Total:** 1,108 lines of carefully crafted SQL

## ✅ **Validation**

Use the validation script to verify successful migration:

```bash
# Run against your Supabase database
psql -f scripts/validate-schema.sql
```

**Expected Results:**
- ✅ 9 tables created
- ✅ 25+ indexes created  
- ✅ 10+ functions created
- ✅ RLS enabled on all tables
- ✅ 30+ policies created
- ✅ 4 AI tiers configured
- ✅ 15+ foreign key constraints

## 🔗 **Related Documentation**

- **RBAC System**: `/docs/rbac/roles-permissions-matrix.md`
- **API Endpoints**: Will be created in Tasks 7-10  
- **Security Baseline**: `/docs/security/security-baseline.md`
- **Original RBAC Analysis**: `/docs/security/rbac_audit.md`

## 📝 **Next Steps**

With the database schema complete, Phase 1 continues with:

1. **✅ Task 3 Complete** - Database schema created
2. **🚧 Task 4** - Seed default roles and initial admin user  
3. **🚧 Task 5** - Implement authentication with role assignment
4. **🚧 Task 6** - Build RBAC authorization middleware
5. **🚧 Task 7** - Create courses CRUD endpoints

---

**Status**: ✅ **COMPLETE**  
**Ready for**: Task 4 - Seed Default Roles and Initial Admin  
**Database**: Ready for Phase 1 development  
**Security**: RLS policies active and tested