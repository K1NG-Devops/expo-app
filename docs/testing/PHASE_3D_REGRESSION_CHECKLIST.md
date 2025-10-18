# Phase 3D: Regression Testing Checklist

## 🎯 Purpose

After implementing organization generalization (Phase 3A-3C), this checklist ensures that **existing preschool functionality remains intact** and no breaking changes were introduced.

## ✅ Test Categories

### 1. Authentication & User Management

- [ ] **Preschool users can login**
  - Test: Login with existing preschool teacher account
  - Expected: Successful login, redirected to teacher dashboard
  
- [ ] **Role-based access control works**
  - Test: Teacher cannot access principal-only features
  - Expected: Permission denied or feature hidden
  
- [ ] **User profiles display correctly**
  - Test: View user profile for preschool teacher
  - Expected: Shows name, role ("teacher"), organization name

### 2. Terminology Display (Critical)

- [ ] **Dashboard uses "students" not "members"**
  - Test: Open teacher dashboard
  - Expected: Headers show "Students", "Classes", not "Members", "Groups"
  
- [ ] **Navigation labels are preschool-specific**
  - Test: Check sidebar navigation
  - Expected: "My Classes", "Students", "Parents" (not generic terms)
  
- [ ] **Dash AI uses preschool terminology**
  - Test: Ask Dash "How many students do I have?"
  - Expected: Response uses "students", "classes", "teachers"

### 3. Data Fetching & Queries

- [ ] **Teacher can view their classes**
  - Test: Navigate to "My Classes"
  - Expected: List of assigned classes displays correctly
  
- [ ] **Class details show student list**
  - Test: Click on a class
  - Expected: Student roster displays with names and photos
  
- [ ] **Parent-child relationships work**
  - Test: Login as parent, view linked children
  - Expected: Children appear in "My Children" section

### 4. Dash AI Integration

- [ ] **Dash greets preschool teachers correctly**
  - Test: Open Dash AI as teacher
  - Expected: Greeting includes "teacher" or "teaching assistant"
  
- [ ] **Dash capabilities are role-appropriate**
  - Test: Ask Dash "What can you help me with?"
  - Expected: Suggests lesson planning, grading, parent communication
  
- [ ] **Context awareness includes organization type**
  - Test: Ask Dash about "my school"
  - Expected: Dash recognizes it's a preschool context

### 5. Core Features

- [ ] **Attendance tracking functional**
  - Test: Mark attendance for a class
  - Expected: Attendance saves and displays correctly
  
- [ ] **Picture of Progress uploads work**
  - Test: Upload a photo for a student
  - Expected: Photo uploads, appears in parent view
  
- [ ] **Messaging between teacher-parent works**
  - Test: Send message from teacher to parent
  - Expected: Message delivers, parent receives notification
  
- [ ] **Financial transactions (payments)**
  - Test: View payment history for a parent
  - Expected: Payment records display correctly

### 6. Database Queries (Backend)

- [ ] **Organization ID filtering works**
  - Test: Query `SELECT * FROM students WHERE organization_id = ?`
  - Expected: Returns only students from that preschool
  
- [ ] **Legacy `preschool_id` still supported**
  - Test: Query using `preschool_id` column
  - Expected: No errors, falls back gracefully
  
- [ ] **Multi-tenant isolation intact**
  - Test: Teacher A cannot see Teacher B's classes (different preschools)
  - Expected: RLS policies enforce isolation

### 7. AI Features

- [ ] **AI quota tracking works**
  - Test: Make several Dash AI requests
  - Expected: Usage tracked correctly in `ai_usage_logs`
  
- [ ] **Subscription tier limits enforced**
  - Test: Free tier user hits limit
  - Expected: Upgrade prompt appears, request blocked
  
- [ ] **AI proxy routes requests correctly**
  - Test: Send request to AI proxy Edge Function
  - Expected: Claude API responds, no errors

### 8. Mobile App (React Native)

- [ ] **App launches without crashes**
  - Test: Launch app on Android device
  - Expected: App loads, no white screen errors
  
- [ ] **Navigation works correctly**
  - Test: Navigate between screens
  - Expected: Smooth transitions, back button works
  
- [ ] **Offline mode functional**
  - Test: Turn off internet, view cached data
  - Expected: Previously loaded data still visible

### 9. Edge Cases

- [ ] **Unknown organization type fallback**
  - Test: Set organization_type to invalid value
  - Expected: Falls back to preschool defaults
  
- [ ] **Missing terminology gracefully handled**
  - Test: Remove a terminology key from config
  - Expected: Uses generic term, no crashes
  
- [ ] **Empty data states render**
  - Test: New teacher with no classes
  - Expected: "No classes yet" empty state displays

---

## 🧪 Testing Procedure

### Automated Testing
```bash
# Run Phase 3D test suite
npx tsx scripts/test-phase3-organization-system.ts

# Should output:
# ✅ Passed: 27
# ❌ Failed: 0
```

### Manual Testing (Priority)

1. **Login as preschool teacher**
   - Email: `teacher@existingpreschool.co.za`
   - Verify dashboard loads correctly

2. **Check terminology throughout app**
   - Navigate to 3-5 different screens
   - Confirm "student", "class", "teacher" used consistently

3. **Test Dash AI**
   - Open Dash Assistant
   - Ask 2-3 questions about students/classes
   - Verify responses use preschool terminology

4. **Test data isolation**
   - Login as teachers from 2 different preschools
   - Confirm they cannot see each other's data

### Database Testing
```sql
-- Verify organization type for existing preschools
SELECT id, name, organization_type, subscription_tier
FROM organizations
WHERE organization_type = 'preschool';

-- Check terminology mapping is applied correctly
SELECT 
  o.name,
  o.organization_type,
  COUNT(DISTINCT c.id) as class_count,
  COUNT(DISTINCT p.id) as student_count
FROM organizations o
LEFT JOIN classes c ON c.organization_id = o.id
LEFT JOIN profiles p ON p.organization_id = o.id AND p.role = 'student'
WHERE o.organization_type = 'preschool'
GROUP BY o.id, o.name, o.organization_type;
```

---

## 🐛 Known Issues & Workarounds

### Issue 1: TypeScript Errors in Voice Components
**Status:** Non-blocking for Phase 3D testing  
**Workaround:** Skip typecheck for now, voice features not affected by org changes

### Issue 2: Some Legacy Code Still Uses `preschool_id`
**Status:** Expected, backward compatibility maintained  
**Workaround:** Both `organization_id` and `preschool_id` are supported

---

## 📊 Test Results Template

| Test Category | Status | Notes | Blocker? |
|--------------|--------|-------|----------|
| Authentication | ✅ Pass | All login flows work | No |
| Terminology | ⚠️ Partial | One screen still shows "members" | No |
| Data Fetching | ✅ Pass | Queries return correct data | No |
| Dash AI | ✅ Pass | Greetings and context work | No |
| Core Features | ✅ Pass | All features functional | No |
| Database | ✅ Pass | Multi-tenant isolation intact | No |
| AI Features | ✅ Pass | Quota tracking works | No |
| Mobile App | ⚠️ Partial | Minor navigation lag | No |
| Edge Cases | ✅ Pass | Fallbacks work correctly | No |

---

## 🚀 Sign-off Criteria

**Phase 3D is complete when:**

- [ ] All automated tests pass (27/27)
- [ ] Manual testing shows no critical bugs
- [ ] Preschool terminology displays correctly throughout app
- [ ] Existing preschool users can login and use all features
- [ ] No data leaks between organizations
- [ ] Dash AI responds with correct terminology
- [ ] Database queries perform within acceptable limits
- [ ] Mobile app launches without crashes

**Sign-off Required From:**
- [ ] Backend Lead (Database queries)
- [ ] Frontend Lead (UI terminology)
- [ ] AI/ML Lead (Dash integration)
- [ ] QA Lead (Manual testing)

---

## 📝 Testing Notes

**Tested By:** ___________________________  
**Date:** ___________________________  
**Environment:** Development / Staging / Production  
**Build Version:** ___________________________

**Critical Issues Found:**
1. 
2. 
3. 

**Non-Critical Issues:**
1. 
2. 
3. 

**Recommendations:**
1. 
2. 
3. 

---

**Last Updated:** 2025-01-17  
**Phase:** 3D - Testing & Validation  
**Next Phase:** 5 - Dependency Injection
