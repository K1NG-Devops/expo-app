# Hybrid Onboarding Testing & Validation Guide

## 📋 Implementation Summary

We have successfully implemented a comprehensive hybrid onboarding strategy for EduDash Pro that supports three distinct flows:

### ✅ **Completed Components**

1. **Database Schema Enhancements**
   - Enhanced `preschools` table with school_type, grade_levels, verification_status
   - Created `school_verifications` table for verification tracking
   - Added `onboarding_progress` table for flow management
   - Enhanced subscription plans with school type filtering

2. **Secure RPC Functions**
   - `register_new_school()` - Self-service school registration
   - `superadmin_onboard_school()` - Admin-managed school creation
   - `verify_school()` - School verification management  
   - `get_onboarding_status()` - Progress tracking

3. **User Interface Components**
   - School type selection screen with detailed options
   - Enhanced school registration with multi-step wizard
   - Updated subscription setup with school type filtering
   - Superadmin onboarding wizard for manual school creation
   - Enhanced existing principal onboarding flow

---

## 🧪 Testing Guide

### **Flow 1: Self-Service School Registration**

#### Prerequisites
- Clean database state (or test environment)
- No existing user account for test emails

#### Test Steps
1. **School Type Selection**
   ```
   Navigation: /screens/school-type-selection
   ✓ Verify all three school types are displayed (Preschool, K-12, Hybrid)
   ✓ Verify detail views work for each type
   ✓ Verify selection persistence
   ✓ Verify navigation to school registration
   ```

2. **School Registration Wizard**
   ```
   Navigation: /screens/school-registration
   Step 1 - School Details:
   ✓ School name validation
   ✓ School type display matches selection
   ✓ Grade level options change based on school type
   ✓ Form validation and persistence
   
   Step 2 - Contact Information:
   ✓ Email validation
   ✓ Phone number validation
   ✓ Optional address field
   
   Step 3 - Principal Information:
   ✓ Principal name validation
   ✓ Principal email validation (login email)
   ✓ Registration summary display
   ✓ Final registration submission
   ```

3. **Database Verification**
   ```sql
   -- Check school was created with correct data
   SELECT 
     name, 
     school_type, 
     grade_levels, 
     verification_status,
     onboarding_flow
   FROM preschools 
   WHERE name = 'Test School Name';
   
   -- Check verification record exists
   SELECT * FROM school_verifications 
   WHERE school_id = (SELECT id FROM preschools WHERE name = 'Test School Name');
   
   -- Check onboarding progress
   SELECT * FROM onboarding_progress 
   WHERE school_id = (SELECT id FROM preschools WHERE name = 'Test School Name');
   ```

#### Expected Results
- School record created with `onboarding_flow = 'self_service'`
- Verification record created with pending email verification
- Onboarding progress tracker initialized
- Audit log entry created

---

### **Flow 2: Superadmin-Managed School Creation**

#### Prerequisites
- Logged in as superadmin user
- Access to superadmin screens

#### Test Steps
1. **Superadmin Wizard Access**
   ```
   Navigation: /screens/super-admin/school-onboarding-wizard
   ✓ Verify superadmin access control
   ✓ Verify non-superadmin users are blocked
   ```

2. **School Creation Wizard**
   ```
   Step 1 - School Information:
   ✓ School name validation
   ✓ School type selection (Preschool/K-12/Hybrid)
   ✓ Grade level selection based on type
   ✓ Contact information fields
   ✓ Admin notes field
   
   Step 2 - Principal Information:
   ✓ Principal name validation
   ✓ Principal email validation
   ✓ Principal account setup information
   
   Step 3 - Subscription Setup:
   ✓ Toggle subscription creation
   ✓ Plan selection filtered by school type
   ✓ Seat configuration
   ✓ Auto-activate option
   
   Step 4 - Review & Create:
   ✓ All information summary
   ✓ Final creation process
   ✓ Success confirmation with options
   ```

3. **Database Verification**
   ```sql
   -- Check school creation
   SELECT 
     name,
     school_type,
     grade_levels,
     verification_status,
     onboarding_flow
   FROM preschools 
   WHERE onboarding_flow = 'superadmin_invite';
   
   -- Check subscription if created
   SELECT * FROM subscriptions 
   WHERE school_id IN (
     SELECT id FROM preschools WHERE onboarding_flow = 'superadmin_invite'
   );
   ```

#### Expected Results
- School record with `verification_status = 'manual_override'`
- School record with `onboarding_flow = 'superadmin_invite'`
- Optional subscription record if configured
- Comprehensive audit log entry

---

### **Flow 3: Enhanced Principal Onboarding**

#### Prerequisites
- Logged in as principal user
- School not yet fully configured

#### Test Steps
1. **Type Selection Step**
   ```
   Navigation: /screens/principal-onboarding
   ✓ Initial school type selection
   ✓ Type persistence across steps
   ✓ Appropriate messaging for each type
   ```

2. **Enhanced Onboarding Flow**
   ```
   Step 2 - School Details:
   ✓ School information based on selected type
   ✓ Type-specific labels and hints
   
   Step 3 - Teacher Invites:
   ✓ Same functionality as before
   
   Step 4 - Templates:
   ✓ Same functionality as before
   
   Step 5 - Subscription (if enabled):
   ✓ Optional subscription selection
   ✓ Plan recommendations
   
   Step 6 - Review:
   ✓ Complete summary including school type
   ✓ Final setup completion
   ```

#### Expected Results
- Enhanced onboarding experience with school type context
- Proper step navigation and flow
- Integration with existing functionality

---

### **Flow 4: Subscription Plan Filtering**

#### Test Steps
1. **Plan Filtering by School Type**
   ```
   Navigation: /screens/subscription-setup
   ✓ Plans filtered based on school's type
   ✓ Recommended plans highlighted
   ✓ School type information displayed
   ✓ Plan compatibility indicators
   ```

2. **Database Integration**
   ```sql
   -- Check subscription plans have school_types array
   SELECT name, tier, school_types FROM subscription_plans;
   ```

#### Expected Results
- Plans filtered appropriately for school type
- Recommended badges for optimal plans
- Clear school type context

---

## 🔧 Database Validation Queries

### Schema Verification
```sql
-- Verify preschools table enhancements
\d preschools;

-- Should include new columns:
-- school_type, grade_levels, verification_status, onboarding_completed_at, 
-- onboarding_flow, contact_email, contact_phone, physical_address, registration_notes

-- Verify new tables exist
\d school_verifications;
\d onboarding_progress;

-- Verify subscription_plans enhancement
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'subscription_plans' AND column_name = 'school_types';
```

### Data Integrity Checks
```sql
-- Check school type values
SELECT DISTINCT school_type FROM preschools;
-- Should return: preschool, k12_school, hybrid

-- Check onboarding flow values  
SELECT DISTINCT onboarding_flow FROM preschools;
-- Should return: self_service, superadmin_invite, migration, legacy

-- Check RLS policies are in place
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('school_verifications', 'onboarding_progress');
```

---

## 📊 Performance Testing

### Load Testing Scenarios
1. **Concurrent Registrations**
   - Test multiple schools registering simultaneously
   - Verify database performance under load
   - Check audit log performance

2. **Large Data Sets**
   - Test with schools having many grade levels
   - Test with complex subscription configurations
   - Verify query performance with filtering

### Monitoring Points
- RPC function execution time
- Database query performance
- UI responsiveness during multi-step flows
- Memory usage during form persistence

---

## 🛡️ Security Validation

### Access Control Testing
1. **RPC Function Security**
   ```sql
   -- Test unauthorized access to superadmin functions
   SELECT superadmin_onboard_school('{}', '{}', NULL);
   -- Should fail for non-superadmin users
   ```

2. **Row Level Security**
   ```sql
   -- Verify schools can only see their own verification records
   SELECT * FROM school_verifications; -- Should be filtered by RLS
   ```

3. **Input Validation**
   - Test SQL injection attempts in all form fields
   - Test XSS prevention in text fields
   - Verify email validation works correctly

---

## 🚀 Production Deployment Checklist

### Pre-Deployment
- [ ] All migrations successfully applied
- [ ] RPC functions created and tested
- [ ] RLS policies verified
- [ ] Performance benchmarks met
- [ ] Security audit completed

### Post-Deployment Verification
- [ ] Health check endpoints responding
- [ ] Database connections stable  
- [ ] All three onboarding flows accessible
- [ ] Analytics tracking correctly
- [ ] Error logging functional

### Rollback Plan
- [ ] Database backup created
- [ ] Migration rollback scripts prepared
- [ ] Feature flags ready for quick disable
- [ ] Monitoring alerts configured

---

## 🐛 Common Issues & Solutions

### Database Issues
**Issue**: Migration fails due to existing data
**Solution**: Update existing records before adding constraints

**Issue**: RLS policy conflicts
**Solution**: Drop conflicting policies before creating new ones

### UI Issues  
**Issue**: School type not persisting between steps
**Solution**: Check AsyncStorage implementation and error handling

**Issue**: Subscription plans not filtering
**Solution**: Verify school_types array is properly populated

### Performance Issues
**Issue**: Slow RPC function execution
**Solution**: Add database indexes on frequently queried columns

**Issue**: UI lag during form submission
**Solution**: Implement loading states and optimize validation

---

## 📈 Success Metrics

### Technical Metrics
- Registration completion rate > 85%
- Average onboarding time < 10 minutes
- Error rate < 5%
- Database query response time < 200ms

### Business Metrics
- New school sign-ups increase
- Subscription conversion rate improvement
- User satisfaction scores
- Support ticket reduction

---

## 🔄 Future Enhancements

### Phase 2 Improvements
1. **Email Verification System**
   - Implement actual email sending
   - Add verification token validation
   - Build verification UI screens

2. **Advanced Analytics**
   - Onboarding funnel analysis
   - School type performance metrics
   - Conversion optimization

3. **Enhanced Superadmin Tools**
   - Bulk school import from CSV
   - Advanced filtering and search
   - Automated school verification

### Phase 3 Features
1. **API Integration**
   - External school directory integration
   - Government database verification
   - Third-party LMS migration tools

2. **Advanced Personalization**
   - School type-specific dashboards
   - Customized feature rollouts
   - Intelligent plan recommendations

---

This comprehensive testing guide ensures the hybrid onboarding system is thoroughly validated across all flows and edge cases. The implementation provides a solid foundation for supporting both preschools and K-12 schools while maintaining security, performance, and user experience standards.