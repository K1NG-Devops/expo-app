# Hybrid Onboarding Strategy: Preschools + K-12 Schools

## Overview
This document outlines the new onboarding flow to support the hybrid system where:
- **Existing Schools**: Can onboard and get subscriptions assigned by superadmins
- **New Schools**: Complete self-service onboarding with subscription selection
- **School Types**: Both preschools and K-12 schools supported seamlessly

## Current State Analysis

### ✅ What Works Now:
- Principal onboarding creates schools and invites teachers
- Subscription setup handles free/paid/enterprise plans  
- Superadmin can create subscriptions for any school
- Payment integration with PayFast works well

### ❌ What Needs Enhancement:
- No way to onboard existing schools that aren't in the system yet
- Subscription creation is separate from school registration
- No clear path for K-12 schools vs preschools during onboarding
- Missing school verification/validation process

---

## Proposed New Onboarding Flow

### 🏢 **Flow A: New School Self-Registration**
*For schools that want to create their own account*

```
1. School Registration
   ├─ School Type Selection (Preschool | K-12 School)
   ├─ Basic Info (Name, Address, Contact, Grade Levels)
   ├─ Principal/Admin Account Creation  
   └─ Verification (Email/Phone/Document Upload)

2. Subscription Selection
   ├─ View Plans Based on School Type
   ├─ Choose Plan (Free Trial → Paid)
   ├─ Payment Setup (if paid plan)
   └─ Subscription Activation

3. Initial Setup
   ├─ Invite Initial Teachers/Staff
   ├─ Configure Classes/Grades
   ├─ Import Student Lists (optional)
   └─ Choose Starter Templates

4. Dashboard Access
   └─ Redirect to appropriate dashboard
```

### 🎯 **Flow B: Existing School Onboarding via Superadmin**
*For schools that superadmins want to add to the system*

```
1. Superadmin Creates School Record
   ├─ School Type (Preschool | K-12)
   ├─ Basic Info Entry
   ├─ Initial Subscription Assignment
   └─ Principal Account Creation

2. Principal Invitation & Activation
   ├─ Email Invitation Sent to Principal
   ├─ Principal Sets Password & Profile
   ├─ Reviews/Confirms School Info
   └─ Accepts Terms & Subscription

3. School Setup Completion
   ├─ Invite Teachers/Staff
   ├─ Configure Classes/Grades  
   ├─ Import Student Data
   └─ System Orientation

4. Dashboard Access
   └─ Full system access granted
```

### 🔄 **Flow C: School Type Migration**
*For existing preschools wanting to expand to K-12*

```
1. Expansion Request
   ├─ Current Subscription Review
   ├─ Additional Grade Level Selection
   ├─ Capacity Planning (seats, teachers)
   └─ Subscription Upgrade Calculation

2. Plan Migration
   ├─ Automatic Enterprise Plan Recommendation
   ├─ Custom Pricing (if needed)
   ├─ Data Migration Planning
   └─ Training Schedule

3. System Expansion
   ├─ Additional Teacher Onboarding
   ├─ Grade-Level Configuration
   ├─ Advanced Feature Activation
   └─ Go-Live Planning
```

---

## Technical Implementation

### 🛠 **Database Schema Updates**

```sql
-- Enhanced school identification
ALTER TABLE preschools ADD COLUMN IF NOT EXISTS school_type VARCHAR(20) DEFAULT 'preschool';
ALTER TABLE preschools ADD COLUMN IF NOT EXISTS grade_levels TEXT[];
ALTER TABLE preschools ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE preschools ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE preschools ADD COLUMN IF NOT EXISTS onboarding_flow VARCHAR(50); -- 'self_service' | 'superadmin_invite' | 'migration'

-- School verification tracking  
CREATE TABLE IF NOT EXISTS school_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES preschools(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- 'email', 'phone', 'document', 'manual'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'failed'
  verification_data JSONB,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 🔧 **New RPC Functions**

```sql
-- Enhanced school registration for self-service
CREATE OR REPLACE FUNCTION register_new_school(
  p_school_name TEXT,
  p_school_type VARCHAR(20),
  p_grade_levels TEXT[],
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_address TEXT,
  p_principal_email TEXT,
  p_principal_name TEXT,
  p_selected_plan_id UUID
) RETURNS JSON;

-- Superadmin school onboarding
CREATE OR REPLACE FUNCTION superadmin_onboard_school(
  p_school_data JSONB,
  p_principal_data JSONB,
  p_subscription_data JSONB
) RETURNS JSON;

-- School verification management
CREATE OR REPLACE FUNCTION verify_school(
  p_school_id UUID,
  p_verification_type VARCHAR(50),
  p_verification_data JSONB
) RETURNS JSON;
```

### 📱 **Updated Screen Structure**

```
app/screens/onboarding/
├── school-type-selection.tsx          # Choose Preschool vs K-12
├── school-registration.tsx            # Basic school info + verification
├── subscription-selection-enhanced.tsx # Plans based on school type
├── principal-setup.tsx                # Principal account creation
├── initial-configuration.tsx          # Classes, teachers, students
└── onboarding-complete.tsx            # Welcome & next steps

app/screens/super-admin/
├── school-onboarding-wizard.tsx       # Superadmin school creation flow
├── pending-verifications.tsx          # Review school verification requests
└── onboarding-management.tsx          # Track onboarding progress
```

---

## User Experience Improvements

### 🎨 **For New Schools:**
- **Clear Path Selection**: Immediate choice between Preschool and K-12 
- **School Type Advantages**: Show features specific to each type
- **Guided Setup**: Step-by-step wizard with progress tracking
- **Flexible Trials**: 30-day trials with easy upgrade paths
- **Verification Help**: Clear docs on what verification is needed

### 👑 **For Superadmins:**
- **Bulk School Import**: CSV/Excel upload for multiple schools
- **Verification Queue**: Dedicated screen for reviewing school applications
- **Custom Onboarding**: Ability to customize onboarding flow per school
- **Progress Tracking**: Dashboard showing onboarding completion rates
- **Direct Communication**: Built-in messaging with schools during onboarding

### 🏫 **For Existing Schools:**
- **Migration Assistant**: Help transition from other platforms
- **Data Import Tools**: Bulk import of students, teachers, classes
- **Training Resources**: Videos, guides, webinars
- **Gradual Rollout**: Phase implementation by grade level or department
- **Success Metrics**: Track adoption and usage during transition

---

## Migration Strategy

### Phase 1: Foundation (Current → Enhanced)
1. ✅ Update database schema for school types
2. ✅ Create enhanced RPC functions  
3. ✅ Build new onboarding screens
4. ✅ Update subscription logic for school types
5. ✅ Test with pilot schools

### Phase 2: Superadmin Tools
1. Build superadmin onboarding wizard
2. Create verification management system
3. Add bulk import capabilities
4. Implement progress tracking
5. Create training resources

### Phase 3: Production Rollout
1. Migrate existing schools to new system
2. Launch new school registration process
3. Train superadmin team on new tools
4. Monitor onboarding success rates
5. Iterate based on feedback

---

## Success Metrics

### 📊 **Onboarding KPIs:**
- Time to complete onboarding (target: <30 minutes)
- Onboarding completion rate (target: >85%)
- Teacher invitation acceptance rate (target: >70%)
- Subscription conversion rate (trial → paid) (target: >40%)
- Time to first active use (target: <7 days)

### 🎯 **Business KPIs:**
- New school sign-ups per month
- Revenue per onboarded school
- Customer satisfaction scores
- Support ticket volume during onboarding
- Feature adoption rates by school type

---

## Risk Mitigation

### ⚠️ **Potential Issues:**
1. **Complex Verification**: Manual verification creates bottleneck
   - *Solution*: Automated verification where possible, clear SLAs
2. **School Type Confusion**: Users unsure which type to choose  
   - *Solution*: Clear definitions, examples, and wizard guidance
3. **Subscription Complexity**: Too many plan options overwhelm users
   - *Solution*: School-type specific plan filtering and recommendations
4. **Data Migration Errors**: Issues importing existing school data
   - *Solution*: Robust validation, rollback procedures, support escalation

### 🛡️ **Technical Safeguards:**
- Database constraints prevent invalid school configurations
- RPC functions include comprehensive input validation
- Onboarding state is saved at each step (resume capability)
- Audit logs track all onboarding actions
- Rollback procedures for failed onboardings

---

## Conclusion

This hybrid onboarding strategy provides:
- **Flexibility**: Multiple onboarding paths for different school needs
- **Scalability**: Supports growth from preschools to large K-12 systems  
- **Control**: Superadmins can manage the process while allowing self-service
- **Quality**: Verification ensures only legitimate schools join the platform
- **Success**: Clear metrics and support throughout the process

The implementation can be done incrementally, allowing us to learn and iterate while maintaining the current working system for existing schools.