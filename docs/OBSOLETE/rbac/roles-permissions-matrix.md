# Roles and Permissions Matrix - EduDash Pro Phase 1

**Version:** 1.0.0  
**Last Updated:** 2025-09-21  
**Status:** ✅ ACTIVE  

## 📋 **Overview**

This document defines the Role-Based Access Control (RBAC) system for EduDash Pro Phase 1. It establishes three core roles that map to your existing 5-role system while providing a simplified foundation for development.

### 🎯 **Design Goals**
- **Beginner-friendly**: Simple 3-role hierarchy for Phase 1
- **Scalable**: Compatible with existing 5-role system
- **Secure**: Clear permission boundaries and scope restrictions
- **Flexible**: Easy to extend with additional roles/permissions

## 🏗️ **Role Hierarchy**

```
Admin (Level 4)     ── Global system access
    │
Instructor (Level 2) ── Organization-scoped access
    │  
Student (Level 1)   ── Self-scoped access
```

## 👥 **Role Definitions**

### 🔴 **Admin (Level 4)**
- **Scope**: Global (cross-organizational)
- **Primary Users**: Platform administrators, super admins
- **Core Purpose**: System administration and management
- **Maps To Existing**: `super_admin`, `principal_admin`

**Key Capabilities:**
- Manage all users, courses, and organizations
- Access billing and subscription management
- View system logs and audit trails
- Manage AI quotas and tiers
- Full administrative dashboard access

**Example Use Cases:**
- Platform maintenance and monitoring
- Managing multiple schools/organizations
- Billing and subscription operations
- Security auditing and compliance

### 🟡 **Instructor (Level 2)**
- **Scope**: Organization-scoped
- **Primary Users**: Teachers, school administrators  
- **Core Purpose**: Course delivery and student management
- **Maps To Existing**: `teacher`, `principal`

**Key Capabilities:**
- Create and manage courses
- Manage student enrollments
- Create assignments and grade submissions
- Generate join codes for course enrollment
- Use AI teaching tools (lesson generation, grading assistance)
- Access instructor dashboard

**Example Use Cases:**
- Teaching a math course
- Creating weekly assignments
- Grading student submissions
- Monitoring class progress
- Using AI to generate lesson plans

### 🟢 **Student (Level 1)**
- **Scope**: Self-scoped  
- **Primary Users**: Students, learners
- **Core Purpose**: Learning and assignment submission
- **Maps To Existing**: `student`, `parent` (for homework help)

**Key Capabilities:**
- Enroll in courses using join codes
- Submit assignments and view own grades
- Communicate with instructors
- Use AI homework helper (limited)
- View own progress and analytics
- Access student dashboard

**Example Use Cases:**
- Enrolling in a new course
- Submitting homework assignments
- Checking grades and feedback
- Getting AI help with homework
- Messaging instructors with questions

## 📊 **Permission Categories**

### 🔧 **User Management**
- `manage_users`: Create, update, delete user accounts (Admin only)

### 📚 **Course Management** 
- `manage_courses`: Create, update, delete courses (Admin, Instructor)
- `manage_enrollments`: Add/remove students from courses (Admin, Instructor)
- `view_courses`: View course information (All authenticated users)

### 📝 **Assignments**
- `manage_assignments`: Create, update, delete assignments (Admin, Instructor)
- `grade_assignments`: Grade and provide feedback (Admin, Instructor) 
- `submit_assignments`: Submit work for assignments (Student)
- `view_own_submissions`: View own assignment submissions (Student)
- `view_own_grades`: View own grades and feedback (Student)

### 💬 **Communication**
- `communicate_with_students`: Send messages to students (Admin, Instructor)
- `communicate_with_instructors`: Send messages to instructors (Student)

### 📈 **Analytics**
- `view_student_progress`: View progress for enrolled students (Admin, Instructor)
- `view_own_progress`: View own progress and analytics (Student)

### 🤖 **AI Features**
- `manage_ai_quotas`: Allocate and manage AI usage quotas (Admin)
- `manage_ai_tiers`: Configure AI tier access and restrictions (Admin)
- `use_ai_lesson_tools`: Use AI for lesson planning (Admin, Instructor)
- `use_ai_grading_tools`: Use AI for grading assistance (Admin, Instructor)
- `use_ai_homework_helper`: Use AI for homework help (Student, limited)

### 🖥️ **Dashboard Access**
- `access_admin_dashboard`: Access administrator tools (Admin)
- `access_instructor_dashboard`: Access instructor tools (Instructor)
- `access_student_dashboard`: Access student tools (Student)

### ⚙️ **Administration** *(Admin Only)*
- `manage_organizations`: Create, update, delete organizations
- `manage_billing`: Manage billing and payment information
- `manage_subscriptions`: Manage subscription plans
- `view_system_logs`: View system logs and audit trails
- `manage_roles`: Assign and modify user roles
- `view_audit_logs`: View security and audit logs

## 🔒 **Security Model**

### **Scope Restrictions**
Each role operates within a specific scope:

| Role | Scope | Access Level |
|------|-------|-------------|
| **Admin** | Global | All organizations, users, and data |
| **Instructor** | Organization | Only their organization's courses and students |
| **Student** | Self | Only their own data and enrolled courses |

### **Resource Filtering**
Access to resources is automatically filtered based on role and relationships:

- **Instructors** can only see:
  - Courses they created or are assigned to teach
  - Students enrolled in their courses
  - Submissions for their assignments

- **Students** can only see:
  - Courses they are enrolled in
  - Their own submissions and grades
  - Instructors of their enrolled courses

### **Hierarchy Rules**
1. **Level Inheritance**: Higher-level roles inherit permissions from lower levels
2. **Scope Enforcement**: Permissions are automatically scoped to prevent unauthorized access
3. **Relationship Validation**: Access requires proper relationships (enrollment, course ownership, etc.)

## 📋 **Permission Matrix**

| Permission Category | Admin | Instructor | Student |
|-------------------|-------|------------|---------|
| **User Management** | ✅ Full | ❌ None | ❌ None |
| **Course Management** | ✅ Full | ✅ Scoped | 👁️ View Only |
| **Assignments** | ✅ Full | ✅ Create/Grade | ✅ Submit Only |
| **Communication** | ✅ Full | ✅ With Students | ✅ With Instructors |
| **AI Features** | ✅ Manage | ✅ Use Tools | ✅ Homework Helper |
| **Analytics** | ✅ All Data | ✅ Student Progress | 👁️ Own Progress |
| **Administration** | ✅ Full | ❌ None | ❌ None |

**Legend:** ✅ Full Access | 👁️ Read Only | ❌ No Access

## 🔄 **Mapping to Existing System**

Our 3-role Phase 1 system maps cleanly to your existing 5-role system:

| Phase 1 Role | Existing Roles | Migration Strategy |
|-------------|---------------|-------------------|
| **Admin** | `super_admin`, `principal_admin` | Direct mapping |
| **Instructor** | `teacher`, `principal` | Role-based assignment |
| **Student** | `student`, `parent` | Context-based assignment |

## 🚀 **Implementation Notes**

### **Database Integration**
The permissions system integrates with your existing database schema:
- Uses existing `profiles` table for user roles
- Leverages `organizations` table for scope restrictions
- Maintains compatibility with current RLS policies

### **Code Integration**
```typescript
// Example usage in API endpoints
import { hasPermission, getUserRole } from '@/lib/rbac';

// Check if user can manage courses
if (!hasPermission(userId, 'manage_courses')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}

// Get user's role and scope
const userRole = await getUserRole(userId);
const userScope = userRole.scope; // 'global', 'organization', or 'self'
```

### **API Endpoint Patterns**
```
GET /courses           # Students: enrolled courses, Instructors: own courses, Admin: all
POST /courses          # Instructors and Admin only
GET /courses/:id       # Based on relationship and role
PUT /courses/:id       # Course owner or Admin only
DELETE /courses/:id    # Course owner or Admin only
```

## ✅ **Acceptance Criteria Met**

- ✅ **roles-permissions.json exists** - Machine-readable format created
- ✅ **Core permissions defined** - All required permissions documented  
- ✅ **Roles reviewed** - Three-role hierarchy established
- ✅ **Linked from documentation** - This document serves as primary reference

## 🔗 **Related Files**

- **Machine-readable format**: `/lib/rbac/roles-permissions.json`
- **Implementation code**: `/lib/rbac/` (to be created in next tasks)
- **Database schema**: `/migrations/` (to be created in Task 3)
- **Existing RBAC analysis**: `/docs/security/rbac_audit.md`

## 📝 **Next Steps**

With the roles and permissions matrix complete, the next tasks will:

1. **Task 3**: Create database schema and migrations for these roles
2. **Task 4**: Seed default roles and create initial admin user
3. **Task 5**: Implement authentication with role assignment
4. **Task 6**: Build RBAC authorization middleware using this matrix

---

**Status**: ✅ **COMPLETE**  
**Ready for**: Task 3 - Database Schema Creation  
**Reviewed by**: Development Team  
**Approved**: 2025-09-21