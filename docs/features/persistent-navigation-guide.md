# Persistent Navigation & Search Icon Guide

## Overview

This document describes the implementation of persistent bottom navigation across all mobile screens and the standardization of search icon placement on the right side of input fields.

## Changes Made

### 1. Persistent Bottom Navigation (Mobile Only)

**File**: `components/navigation/BottomTabBar.tsx`

A new persistent bottom navigation component has been added that:
- ✅ Displays across all authenticated screens
- ✅ Automatically filters tabs based on user role (parent, teacher, principal)
- ✅ Highlights active tab based on current route
- ✅ Hidden on web (DesktopLayout handles navigation there)
- ✅ Hidden on auth/onboarding screens
- ✅ Uses safe area insets for proper spacing on notched devices
- ✅ Theme-aware with proper colors and shadows

**Role-Based Tabs**:

**Parent**:
- Home (Dashboard)
- Children
- Messages
- Calendar
- Settings

**Teacher**:
- Home (Dashboard)
- Students
- Messages
- Calendar
- Settings

**Principal**:
- Home (Dashboard)
- Students
- Messages
- Reports
- Settings

**Integration**: Added to root layout (`app/_layout.tsx`) so it appears on all screens automatically.

### 2. Search Icon on Right Side

**Design Standard**: All search inputs now have the search icon on the RIGHT side instead of the left.

**New Component**: `components/ui/SearchInput.tsx`

A reusable search input component with:
- Search icon on the right
- Optional clear button (when text is entered)
- Theme-aware styling
- Proper accessibility

**Usage Example**:

```typescript path=null start=null
import { SearchInput } from '@/components/ui/SearchInput';

// In your component
<SearchInput
  value={searchQuery}
  onChangeText={setSearchQuery}
  placeholder="Search students..."
  showClearButton
  onClear={() => setSearchQuery('')}
/>
```

**Updated Screens**:
- `app/screens/student-management.tsx` - Search icon moved to right

## Migration Guide for Other Screens

To update existing search inputs to follow the new pattern:

### Before (Icon on Left):
```typescript path=null start=null
<View style={styles.searchContainer}>
  <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
  <TextInput
    style={styles.searchInput}
    placeholder="Search..."
    value={search}
    onChangeText={setSearch}
  />
</View>
```

### After (Icon on Right):
```typescript path=null start=null
<View style={styles.searchContainer}>
  <TextInput
    style={styles.searchInput}
    placeholder="Search..."
    value={search}
    onChangeText={setSearch}
  />
  {search ? (
    <TouchableOpacity onPress={() => setSearch('')} style={styles.searchIcon}>
      <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  ) : null}
  <Ionicons name="search-outline" size={20} color={theme.textSecondary} style={styles.searchIcon} />
</View>
```

### Or use the SearchInput component:
```typescript path=null start=null
import { SearchInput } from '@/components/ui/SearchInput';

<SearchInput
  value={search}
  onChangeText={setSearch}
  placeholder="Search..."
  showClearButton
  onClear={() => setSearch('')}
/>
```

## Files Modified

### New Files:
- `components/navigation/BottomTabBar.tsx` - Persistent bottom navigation
- `components/ui/SearchInput.tsx` - Reusable search input component
- `docs/features/persistent-navigation-guide.md` - This documentation

### Modified Files:
- `app/_layout.tsx` - Added BottomTabBar integration
- `app/screens/student-management.tsx` - Updated search icon position
- `app/screens/account.tsx` - Enhanced sign-out button visibility

## Screens That Need Update

The following screens may have search inputs that need icon repositioning:

```bash
# Search for all screens with search inputs
app/screens/activity-detail.tsx
app/screens/parent-claim-child.tsx
app/screens/financial-transactions.tsx
app/screens/students-detail.tsx
app/screens/teacher-management.tsx
components/lessons/LessonsHub.tsx
app/screens/teachers-detail.tsx
app/screens/lessons-search.tsx
components/superadmin/EnhancedUserManagement.tsx
components/dashboard/ParentDashboard.tsx
components/ai/DashCommandPalette.tsx
```

**Recommendation**: Gradually migrate these screens to use the new `SearchInput` component for consistency.

## Testing Checklist

- [x] Bottom navigation appears on all authenticated mobile screens
- [x] Bottom navigation hidden on auth/onboarding screens
- [x] Bottom navigation hidden on web (desktop layout shown instead)
- [x] Active tab correctly highlighted based on route
- [x] Role-based tabs display correctly for parent, teacher, principal
- [x] Search icon positioned on right in updated screens
- [x] Clear button appears when search has text
- [x] Theme changes properly update navigation colors
- [x] Safe area insets properly handled on notched devices
- [ ] Test on iOS (iPhone with notch)
- [ ] Test on Android (various screen sizes)
- [ ] Test all role types (parent, teacher, principal, super_admin)

## Known Issues & Future Improvements

### Known Issues:
- None currently

### Future Improvements:
1. Add badge counts to tabs (e.g., unread messages count)
2. Add haptic feedback on tab press
3. Animate tab transitions
4. Add "More" tab if user has access to additional features
5. Consider adding a center FAB button for primary actions (e.g., "Add Student")

## See Also

- [WARP.md](../../WARP.md) - Project development guidelines
- [UI Components Guide](../governance/ui-components.md) - Component design standards (if exists)
- [Navigation Patterns](../governance/navigation-patterns.md) - App navigation architecture (if exists)
