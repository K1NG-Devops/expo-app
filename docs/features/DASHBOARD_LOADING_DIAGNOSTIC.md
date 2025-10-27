# Teacher Dashboard Loading Issue Diagnostic

## Symptoms
- Teacher dashboard shows gray placeholder cards
- No metrics/data visible
- Appears stuck in loading/skeleton state

## Root Causes & Solutions

### 1. Teacher Has No Preschool Assigned

**Check in Supabase Dashboard:**
```sql
SELECT id, email, first_name, last_name, role, preschool_id 
FROM profiles 
WHERE role = 'teacher' 
AND email = 'YOUR_TEACHER_EMAIL';
```

**Expected**: `preschool_id` should have a UUID value  
**If NULL**: Teacher needs to be assigned to a preschool

**Fix:**
```sql
UPDATE profiles 
SET preschool_id = 'YOUR_PRESCHOOL_UUID'
WHERE email = 'YOUR_TEACHER_EMAIL';
```

### 2. No Classes Assigned to Teacher

**Check:**
```sql
SELECT c.id, c.name, c.grade_level,
       (SELECT COUNT(*) FROM class_students WHERE class_id = c.id) as student_count
FROM classes c
WHERE c.teacher_id = 'YOUR_TEACHER_USER_ID'
  AND c.preschool_id = 'YOUR_PRESCHOOL_UUID';
```

**If empty**: Create a class for the teacher

**Fix:**
```sql
INSERT INTO classes (preschool_id, teacher_id, name, grade_level)
VALUES (
  'YOUR_PRESCHOOL_UUID',
  'YOUR_TEACHER_USER_ID',
  'Grade R - Morning Class',
  'Grade R'
);
```

### 3. No Students in Database

**Check:**
```sql
SELECT COUNT(*) as student_count
FROM students
WHERE preschool_id = 'YOUR_PRESCHOOL_UUID'
  AND status = 'active';
```

**If 0**: Add test students

**Fix:**
```sql
INSERT INTO students (preschool_id, first_name, last_name, date_of_birth, grade_level)
VALUES 
  ('YOUR_PRESCHOOL_UUID', 'Test', 'Student 1', '2019-01-15', 'Grade R'),
  ('YOUR_PRESCHOOL_UUID', 'Test', 'Student 2', '2019-03-22', 'Grade R'),
  ('YOUR_PRESCHOOL_UUID', 'Test', 'Student 3', '2019-05-10', 'Grade R');
```

### 4. RLS Policy Blocking Teacher Access

**Check RLS policies:**
```sql
-- Check if teacher can read classes
SELECT * FROM classes 
WHERE teacher_id = 'YOUR_TEACHER_USER_ID';

-- Check if teacher can read students
SELECT * FROM students 
WHERE preschool_id = 'YOUR_PRESCHOOL_UUID';
```

**If blocked**: RLS policies may be too restrictive

**Fix**: Review RLS policies in `supabase/migrations/` for `classes` and `students` tables

### 5. App Caching Issue

**On Device:**
1. Force close app completely
2. Clear app cache (Settings → Apps → EduDash Pro → Storage → Clear Cache)
3. Reopen app and sign in again

**Or OTA update to clear cached data:**
```bash
eas update --branch production --message "Cache bust: Force dashboard data refresh"
```

### 6. Network/Supabase Connection Issue

**Check Supabase status:**
```bash
curl -I https://lvvvjywrmpcqrpvuptdi.supabase.co/rest/v1/
```

**Expected**: `HTTP/2 200` or `HTTP/2 401` (auth required)  
**If timeout**: Network or Supabase issue

**On Device**: Check internet connectivity and try toggling WiFi/mobile data

---

## Quick Fix Script

Run this in Supabase SQL Editor to ensure teacher has data to display:

```sql
-- Replace these with your actual values
DO $$
DECLARE
  v_preschool_id UUID := 'YOUR_PRESCHOOL_UUID';
  v_teacher_email TEXT := 'teacher@example.com';
  v_teacher_user_id UUID;
  v_class_id UUID;
BEGIN
  -- Get teacher user ID
  SELECT id INTO v_teacher_user_id 
  FROM auth.users 
  WHERE email = v_teacher_email;
  
  -- Assign teacher to preschool
  UPDATE profiles 
  SET preschool_id = v_preschool_id
  WHERE id = v_teacher_user_id;
  
  -- Create a class if none exist
  INSERT INTO classes (preschool_id, teacher_id, name, grade_level)
  VALUES (v_preschool_id, v_teacher_user_id, 'Grade R - Morning', 'Grade R')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_class_id;
  
  -- Add test students if none exist
  INSERT INTO students (preschool_id, first_name, last_name, date_of_birth, grade_level)
  SELECT 
    v_preschool_id,
    'Test Student ' || generate_series,
    'Lastname ' || generate_series,
    CURRENT_DATE - INTERVAL '5 years' - (generate_series || ' days')::INTERVAL,
    'Grade R'
  FROM generate_series(1, 10)
  WHERE NOT EXISTS (
    SELECT 1 FROM students WHERE preschool_id = v_preschool_id LIMIT 1
  );
  
  -- Link students to class
  INSERT INTO class_students (class_id, student_id)
  SELECT v_class_id, id 
  FROM students 
  WHERE preschool_id = v_preschool_id
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Setup complete for teacher: %', v_teacher_email;
END $$;
```

---

## Testing After Fix

1. **Force close app** completely
2. **Reopen and sign in** as teacher
3. **Pull down to refresh** on dashboard
4. **Expected**: See metrics populated:
   - Total Students: ~10
   - Classes Active: ~1
   - Assignments Pending: ~0 (until assignments created)
   - Upcoming Lessons: ~1

---

## Prevention

**Before onboarding teachers**:
1. Ensure preschool exists in `preschools` table
2. Assign teacher to preschool during registration
3. Create at least one class for teacher
4. Add sample students for testing

**Monitoring**:
- Add Sentry error tracking for failed dashboard data fetches
- Add analytics event for "dashboard_load_empty_state"
- Add user-friendly error message instead of gray placeholders

---

## Code Improvements Needed

### 1. Better Empty State Handling

**Current** (shows gray boxes):
```typescript
// Fallback to mock data
value: dashboardData?.totalStudents || '24'
```

**Better**:
```typescript
if (loading) return <SkeletonLoader />;
if (error) return <ErrorState error={error} onRetry={refresh} />;
if (!dashboardData || dashboardData.totalStudents === 0) {
  return <EmptyState message="No data available. Please contact admin." />;
}
```

### 2. Add Loading Skeleton Component

Create `components/dashboard/DashboardSkeleton.tsx`:
```typescript
export const DashboardSkeleton = () => (
  <View style={styles.container}>
    <SkeletonPlaceholder>
      <View style={styles.metricCard} />
      <View style={styles.metricCard} />
      <View style={styles.actionCard} />
    </SkeletonPlaceholder>
  </View>
);
```

### 3. Add Error Boundary

Wrap dashboard in error boundary to catch render errors:
```typescript
<ErrorBoundary fallback={<DashboardErrorState />}>
  <TeacherDashboardWrapper />
</ErrorBoundary>
```

---

## Related Files

- `components/dashboard/NewEnhancedTeacherDashboard.tsx` - Main dashboard
- `hooks/useDashboardData.ts` - Data fetching logic
- `components/dashboard/TeacherDashboardWrapper.tsx` - Wrapper with loading state
- `docs/security/RLS_POLICIES.md` - Row-level security documentation

---

## Support Commands

**Check teacher data via Supabase CLI:**
```bash
supabase db query "SELECT * FROM profiles WHERE role='teacher' LIMIT 5;"
```

**Force refresh OTA update:**
```bash
eas update --branch production --message "Force dashboard refresh"
```

**Check device logs:**
```bash
npx react-native log-android | grep -i "dashboard\|error"
```
