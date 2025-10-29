# Bottom Navigation Testing Guide

## Testing the Bottom Nav Visibility

The bottom navigation should be **visible** on all authenticated screens and **hidden** on specific routes only.

### ✅ Should Show (Visible)

Bottom nav should appear on:
- `/screens/parent-dashboard` - Parent dashboard
- `/screens/parent-children` - Children list
- `/screens/parent-messages` - Messages
- `/screens/calendar` - Calendar
- `/screens/settings` - Settings page
- `/screens/account` - Account page ✨ (Subpage)
- `/screens/student-management` - Student management (Teacher/Principal)
- `/screens/teacher-dashboard` - Teacher dashboard
- `/screens/principal-dashboard` - Principal dashboard
- `/screens/teacher-messages` - Teacher messages
- `/screens/teacher-reports` - Reports
- Any other `/screens/*` routes (subpages)

### ❌ Should Hide (Not Visible)

Bottom nav should be hidden on:
- `/` - Landing/Root
- `/landing` - Landing page
- `/sign-in` - Sign in
- `/register` - Registration
- `/(auth)/sign-in` - Auth group sign in
- `/(auth)/register` - Auth group register
- `/onboarding/*` - All onboarding screens
- `/auth-callback` - Auth callback
- `/invite/*` - Invite screens

### 📱 Platform-Specific Behavior

- **Mobile (iOS/Android)**: Bottom nav renders at the bottom with safe area insets
- **Web**: Bottom nav is hidden (DesktopLayout sidebar is used instead)

## Quick Test Checklist

Use this checklist when testing:

1. **Parent Role**
   - [ ] Dashboard shows bottom nav with 5 tabs (Home, Children, Messages, Calendar, Settings)
   - [ ] Navigate to Account page - bottom nav still visible
   - [ ] Navigate to Settings page - bottom nav still visible
   - [ ] Tap each tab - correct screen loads
   - [ ] Active tab is highlighted correctly

2. **Teacher Role**
   - [ ] Dashboard shows bottom nav with 5 tabs (Home, Students, Messages, Calendar, Settings)
   - [ ] Navigate to student details - bottom nav still visible
   - [ ] Navigate to Settings - bottom nav still visible
   - [ ] Active tab highlighting works

3. **Principal Role**
   - [ ] Dashboard shows bottom nav with 5 tabs (Home, Students, Messages, Reports, Settings)
   - [ ] Navigate to subpages - bottom nav still visible
   - [ ] All tabs functional

4. **Auth Flow**
   - [ ] Sign in page - no bottom nav
   - [ ] Landing page - no bottom nav
   - [ ] Onboarding - no bottom nav
   - [ ] After login - bottom nav appears

5. **Theme Changes**
   - [ ] Switch to dark mode - bottom nav colors update
   - [ ] Switch to light mode - bottom nav colors update
   - [ ] Border and shadow colors correct

## Common Issues & Solutions

### Issue: Bottom nav not showing on subpages (like /screens/account)

**Cause**: Visibility logic is too restrictive.

**Solution**: The logic now uses a whitelist approach - it only hides on specific auth/landing/onboarding routes. All other routes show the bottom nav.

```typescript path=null start=null
// Correct approach
const shouldHide = 
  !pathname ||
  pathname === '/' ||
  pathname.includes('/(auth)') ||
  pathname.includes('/sign-in') ||
  pathname.includes('/register') ||
  pathname.includes('/landing') ||
  pathname.includes('/onboarding') ||
  pathname.includes('/auth-callback') ||
  pathname.includes('/invite/');
```

### Issue: Bottom nav overlaps content

**Cause**: Screen content doesn't account for bottom nav height.

**Solution**: The root layout now wraps Stack in a flex container, allowing bottom nav to sit naturally at the bottom.

```typescript path=null start=null
<View style={{ flex: 1 }}>
  <View style={{ flex: 1 }}>
    <Stack />
  </View>
  <BottomTabBar />
</View>
```

### Issue: Bottom nav shows on web

**Cause**: Platform check missing.

**Solution**: Added `Platform.OS === 'web'` check to return null on web.

### Issue: Wrong tabs for user role

**Cause**: Role filtering not working.

**Solution**: Tabs are filtered based on `profile?.role`:
```typescript path=null start=null
const visibleTabs = TAB_ITEMS.filter(
  item => !item.roles || item.roles.includes(userRole)
);
```

## Manual Testing Steps

1. **Start the development server**:
   ```bash
   npm run start
   # or
   npm run dev:android
   ```

2. **Test on physical Android device** (preferred):
   - Install the app on your device
   - Sign in as a parent
   - Navigate to dashboard - verify bottom nav shows
   - Navigate to account page - verify bottom nav still shows
   - Navigate to settings - verify bottom nav still shows
   - Sign out - verify bottom nav disappears on sign-in screen

3. **Test theme switching**:
   - Open settings
   - Switch theme (Light/Dark)
   - Verify bottom nav colors update correctly

4. **Test all roles**:
   - Sign in as parent - verify 5 tabs (Home, Children, Messages, Calendar, Settings)
   - Sign in as teacher - verify 5 tabs (Home, Students, Messages, Calendar, Settings)
   - Sign in as principal - verify 5 tabs (Home, Students, Messages, Reports, Settings)

## Debugging

If bottom nav is not showing:

1. **Check console logs**:
   ```javascript
   console.log('[BottomTabBar] pathname:', pathname);
   console.log('[BottomTabBar] userRole:', userRole);
   console.log('[BottomTabBar] visibleTabs:', visibleTabs.length);
   console.log('[BottomTabBar] Platform.OS:', Platform.OS);
   ```

2. **Check pathname**:
   - Add temporary logging to see what pathname is being evaluated
   - Verify pathname matches expected format

3. **Check role**:
   - Verify `profile?.role` is correctly set
   - Check if tabs are being filtered correctly

4. **Check platform**:
   - Make sure you're testing on mobile, not web
   - Web should show DesktopLayout sidebar instead

## Related Files

- `components/navigation/BottomTabBar.tsx` - Main component
- `app/_layout.tsx` - Integration point
- `components/layout/DesktopLayout.tsx` - Web navigation (alternative)
- `docs/features/persistent-navigation-guide.md` - Implementation guide
