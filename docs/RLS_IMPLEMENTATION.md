# RLS (Row Level Security) Implementation for EduDash

## Overview

This document describes the comprehensive Row Level Security implementation for the EduDash platform, ensuring organization-scoped data access and role-based permissions at the database level.

## 🛡️ Security Architecture

### Core Principles
1. **Organization Scoped**: All data access is limited to the user's organization
2. **Role-Based Access Control**: Permissions based on user roles (super_admin, principal_admin, teacher, parent)
3. **Seat-Based Access**: Teachers require active seats to access organization data
4. **Principle of Least Privilege**: Users can only access what they need for their role

### Database Security Layers
1. **Row Level Security (RLS) Policies** - Server-side enforcement
2. **Client-side Security Guards** - Additional validation and query building
3. **Audit Logging** - Track all permission changes and sensitive actions
4. **JWT Token Verification** - Server-side token validation

## 📋 Implemented Policies

### Helper Functions
- `auth.get_user_role()` - Get current user's role
- `auth.is_super_admin()` - Check super admin status
- `auth.is_org_admin(org_id)` - Check organization admin status
- `auth.is_org_member(org_id)` - Check organization membership
- `auth.has_active_seat(org_id)` - Check active seat status
- `auth.can_access_student_data(org_id)` - Check student data access

### Table Policies

#### Profiles Table
- **Own Profile**: Users can read/update their own profile
- **Organization Admin**: Can read/update member profiles in their org
- **Super Admin**: Can manage all profiles

#### Teachers Table  
- **Own Record**: Teachers can read their own record
- **Organization Colleagues**: Active teachers can read colleagues in same org
- **Organization Admin**: Can manage teachers in their org
- **Super Admin**: Can manage all teacher records

#### Students Table
- **Organization Admin**: Can manage students in their org
- **Active Teachers**: Can read/update students in their org (with active seat)
- **Parents**: Can only read their own children's records
- **Super Admin**: Can manage all student records

#### Classes Table
- **Organization Admin**: Can manage classes in their org
- **Active Teachers**: Can read org classes, update assigned classes
- **Parents**: Can read classes their children are enrolled in
- **Super Admin**: Can manage all classes

#### Enterprise Leads Table
- **Public Insert**: Anyone can submit leads (contact forms)
- **Super Admin Only**: Only super admins can read/manage leads
- **Organization View**: Principals can view leads for their organization name

### Subscription & Seat Management
- **Organization Scoped**: Users can only see subscriptions for their org
- **Admin Management**: Organization admins can assign/revoke seats
- **Secure Functions**: `assign_teacher_seat_secure()` and `revoke_teacher_seat_secure()`

## 🔧 Client-Side Security

### SecurityContext
```typescript
type SecurityContext = {
  userId: string;
  role: Role;
  organizationId?: string;
  capabilities: Capability[];
  seatStatus?: string;
};
```

### SecureQueryBuilder
Automatically applies role-based filters to database queries:
- Prevents cross-organization data access
- Enforces seat-based permissions
- Handles role-specific visibility rules

### SecurityGuard
Validates permissions before operations:
- `canAccess(resource, operation, orgId)` - Check access permissions
- `requireAccess()` - Throw error if access denied
- `logSecurityEvent()` - Audit trail logging

### SecureDatabase
High-level wrapper for secure database operations:
- Automatic security checks
- Organization scoping
- Audit logging
- Error handling

## 📊 Audit & Monitoring

### Audit Log Table
```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSON,
  new_values JSON,
  ip_address INET,
  user_agent TEXT
);
```

### Tracked Events
- Database access attempts
- Permission changes
- Seat assignments/revocations
- Cross-organization access attempts
- Authentication events

## 🧪 Testing

### RLS Policy Tests
The `scripts/test-rls-policies.ts` file contains comprehensive tests for:

1. **Profile Access Tests**
   - Super admin can read all profiles
   - Principal can only read org profiles
   - Teacher can only read own profile
   - Parent can only read own profile

2. **Teacher Access Tests**
   - Active teacher can read org colleagues
   - Inactive teacher can only read own record
   - Parent cannot read teacher records

3. **Student Access Tests**
   - Principal can read all org students
   - Active teacher can read org students
   - Parent can only read own children

4. **Class Access Tests**
   - Principal can read all org classes
   - Active teacher can read org classes

5. **Cross-Organization Tests**
   - Prevent access to other organization data

### Running Tests
```bash
# Run RLS policy tests
npm run test:rls

# Or run directly
npx ts-node scripts/test-rls-policies.ts
```

## 🚀 Deployment

### Migration Steps
1. Apply RLS migration: `20250910_comprehensive_rls_policies.sql`
2. Update client code to use security utilities
3. Test with different user roles
4. Monitor audit logs for policy violations

### Verification Queries
```sql
-- Test as different users
SELECT 'Profile Test' AS test, COUNT(*) FROM public.profiles;
SELECT 'Teacher Test' AS test, COUNT(*) FROM public.teachers;
SELECT 'Student Test' AS test, COUNT(*) FROM public.students;
```

## 🔒 Security Best Practices

### Database Level
- ✅ All tables have RLS enabled
- ✅ Policies follow principle of least privilege
- ✅ Server-side function validation
- ✅ Audit logging for sensitive actions
- ✅ Performance indexes for RLS queries

### Client Level
- ✅ Security context validation
- ✅ Query filtering and scoping
- ✅ Data sanitization
- ✅ Error handling and logging
- ✅ JWT token validation

### Monitoring
- ✅ Access attempt tracking
- ✅ Permission change auditing
- ✅ Cross-organization access alerts
- ✅ Performance monitoring

## 📈 Performance Considerations

### Indexes
```sql
-- Optimized indexes for RLS policy queries
CREATE INDEX idx_profiles_role_org ON profiles (role, preschool_id);
CREATE INDEX idx_org_members_user_org_status ON organization_members (user_id, organization_id, seat_status);
CREATE INDEX idx_teachers_org_user ON teachers (preschool_id, user_id);
CREATE INDEX idx_students_org_parent ON students (preschool_id, parent_id);
CREATE INDEX idx_classes_org_teacher ON classes (preschool_id, teacher_id);
```

### Query Optimization
- Use specific column selection
- Avoid unnecessary JOINs in RLS policies
- Leverage partial indexes where appropriate
- Monitor query performance with EXPLAIN

## ⚠️ Important Notes

### Security Considerations
1. RLS policies are enforced at the database level
2. Client-side security is additional validation, not primary security
3. Super admin role has unrestricted access
4. Seat status affects teacher permissions
5. Organization membership is required for most operations

### Testing Requirements
1. Test all user role combinations
2. Verify cross-organization access prevention
3. Test seat-based permission changes
4. Validate audit logging functionality
5. Performance test with large datasets

### Maintenance
1. Regularly review audit logs
2. Monitor policy performance
3. Update tests when adding new features
4. Document any policy changes
5. Review user capabilities periodically

---

## 📝 Summary

The RLS implementation provides comprehensive, multi-layered security for the EduDash platform:

- **Database-level enforcement** through RLS policies
- **Client-side validation** through security utilities  
- **Comprehensive audit trail** for compliance
- **Role-based and organization-scoped** access control
- **Performance-optimized** with appropriate indexes
- **Thoroughly tested** with automated test suite

This implementation ensures that users can only access data appropriate for their role within their organization, while providing super admins with the necessary oversight capabilities.
