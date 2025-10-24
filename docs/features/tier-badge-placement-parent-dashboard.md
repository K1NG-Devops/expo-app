# Tier Badge Placement - Parent Dashboard

**Date**: 2025-01-24  
**Status**: ✅ Implemented  
**Version**: Option 2 (Inline Subtitle Placement)

## Overview

This document describes the implementation of tier status badge visibility in the Parent Dashboard, allowing parents to see their subscription tier (free, starter, premium, enterprise) at all times without scrolling.

## Design Decision

### Three Options Evaluated

#### Option 1: Header Right (next to theme toggle)
```
┌─────────────────────────────────────────────────┐
│ 🌅 Good morning, Lerato! 👋    [Free 🔖] [🌙]  │
│ Managing Sarah Johnson                          │
└─────────────────────────────────────────────────┘
```
**Pros**: Highest visibility, always above the fold  
**Cons**: Crowded on 5.5" screens, layout complexity

#### Option 2: Below Subtitle Inline ⭐ **CHOSEN**
```
┌─────────────────────────────────────────────────┐
│ 🌅 Good morning, Lerato! 👋              [🌙]  │
│ Managing Sarah Johnson                          │
│ [Free] ℹ️                                        │
└─────────────────────────────────────────────────┘
```
**Pros**: Clean, balanced, above-the-fold, minimal layout change  
**Cons**: Slightly less prominent than header placement

#### Option 3: Dedicated Tier Card
```
┌─────────────────────────────────────────────────┐
│ 🌅 Good morning, Lerato! 👋              [🌙]  │
│ Managing Sarah Johnson                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 💳 Your Plan                                    │
│ [Premium] [Manage Plan] ➡️                      │
│ 100/100 AI Help • 50/50 Lessons                │
└─────────────────────────────────────────────────┘
```
**Pros**: Most space for expansion, highly noticeable  
**Cons**: Pushes content down, adds vertical space

### Rationale for Option 2

**Option 2** was chosen for the parent dashboard because:
- ✅ **Above-the-fold visibility** on 5.5" Android baseline screens
- ✅ **Minimal UI disruption** - fits naturally below the subtitle
- ✅ **Clean aesthetic** - maintains professional dashboard appearance
- ✅ **Mobile-first** - works well on small screens with flexWrap
- ✅ **Theme-aware** - inherits background from WelcomeSection
- ✅ **Role-appropriate** - manages button visibility via existing TierBadge logic

## Implementation

### Components Modified

#### 1. `components/dashboard/parent/WelcomeSection.tsx`

**New Props** (backward-compatible with defaults):
```typescript
interface WelcomeSectionProps {
  userName: string;
  subtitle: string;
  isDark: boolean;
  onThemeToggle: () => Promise<void>;
  showTierBadge?: boolean;                              // default: true
  tierBadgePlacement?: 'subtitle-inline' | 'header-right'; // default: 'subtitle-inline'
  tierBadgeSize?: 'sm' | 'md';                          // default: 'sm'
}
```

**Layout Structure**:
```tsx
<View style={styles.welcomeSection}>
  <View style={styles.welcomeHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.greeting}>
        {getGreeting(t)}, {userName}! 👋
      </Text>
      <Text style={styles.welcomeSubtitle}>{subtitle}</Text>
      
      {/* TierBadge - Inline placement below subtitle */}
      {showTierBadge && tierBadgePlacement === 'subtitle-inline' && (
        <View style={styles.tierBadgeContainer}>
          <TierBadge size={tierBadgeSize} showManageButton={false} />
        </View>
      )}
    </View>
    
    <TouchableOpacity style={styles.themeToggleButton} onPress={handleThemeToggle}>
      <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={theme.primary} />
    </TouchableOpacity>
  </View>
</View>
```

**Styling**:
```typescript
tierBadgeContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',        // Wraps on small screens
  marginTop: 6,            // Minimal spacing from subtitle
}
```

#### 2. `components/dashboard/ParentDashboard.tsx`

**Usage**:
```tsx
<WelcomeSection
  userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || t('roles.parent')}
  subtitle={/* ... */}
  isDark={isDark}
  onThemeToggle={toggleTheme}
  showTierBadge={true}
  tierBadgePlacement="subtitle-inline"
  tierBadgeSize="sm"
/>
```

### Tier Badge Behavior

**Existing TierBadge** (`components/ui/TierBadge.tsx`) provides:
- **Automatic tier detection** via `SubscriptionContext`
- **Color coding**: Free (gray), Starter (green), Premium (purple), Enterprise (red)
- **Tooltip**: Shows tier source (organization, school_plan, user)
- **Role-gated CTA**: "Manage plan" button only for principals/admins
- **Navigation**: super_admin → `/screens/super-admin-subscriptions`

**Props passed**:
- `size="sm"` - Small size for mobile (22px height, 11px font)
- `showManageButton={false}` - Hides CTA for all users in parent dashboard context

## Tier Examples

### Free Tier
```
Good morning, Lerato! 👋                    [🌙]
Managing Sarah Johnson
[Free] ℹ️    ← Gray badge (#6B7280)
```

### Starter Tier
```
Good morning, Lerato! 👋                    [🌙]
Managing Sarah Johnson
[Starter] ℹ️  ← Green badge (#059669)
```

### Premium Tier
```
Good morning, Lerato! 👋                    [🌙]
Managing Sarah Johnson
[Premium] ℹ️  ← Purple badge (#7C3AED)
```

### Enterprise Tier
```
Good morning, Lerato! 👋                    [🌙]
Managing Sarah Johnson
[Enterprise] ℹ️  ← Red badge (#DC2626)
```

## Responsive Design

### 5.5" Screen Baseline (1920x1080 logical)
- Badge renders inline without wrapping
- Tooltip appears above badge (top: -30px)
- Touch target ≥44x44 for info icon

### Small Screens (<5")
- Badge can wrap to new line via `flexWrap: 'wrap'`
- Minimal margin (6px) prevents content push

### Dark Mode
- Badge inherits theme colors from `useTheme()`
- Background: `theme.primary` (WelcomeSection)
- Text: `theme.onPrimary`
- Badge colors: Auto-themed by TierBadge component

## QA Checklist

### Visual
- [x] Badge visible above-the-fold on first load
- [x] No text truncation or overlap
- [x] Clean spacing (6px margin-top)
- [x] Responsive on 5.5", 6.5", iPhone SE

### Theme
- [x] Light mode: colors legible
- [x] Dark mode: colors legible
- [x] Theme toggle maintains consistency

### Roles
- [x] **Parent**: No "Manage plan" CTA (showManageButton=false)
- [x] **Principal/Admin**: Would show CTA if showManageButton=true (not enabled in parent dashboard)
- [x] **Super Admin**: Would navigate to `/screens/super-admin-subscriptions` (not enabled in parent dashboard)

### Tiers
- [x] Free: Gray badge (#6B7280)
- [x] Starter: Green badge (#059669)
- [x] Premium: Purple badge (#7C3AED)
- [x] Enterprise: Red badge (#DC2626)

### Tooltip
- [x] Info icon tappable (44x44 touch target)
- [x] Tooltip shows tier source
- [x] Auto-dismisses after 3 seconds
- [x] Readable in both themes

### Stability
- [x] No layout jank during loading
- [x] TypeScript: 0 errors
- [x] ESLint: 0 new warnings
- [x] No console warnings

## Configuration

### Feature Toggle (Optional)

To allow runtime placement changes, read environment variable:

```typescript
const placement = process.env.EXPO_PUBLIC_FEATURE_TIER_BADGE_PLACEMENT as 'subtitle-inline' | 'header-right' | 'card' || 'subtitle-inline';

<WelcomeSection
  showTierBadge={true}
  tierBadgePlacement={placement}
  tierBadgeSize="sm"
/>
```

### Hiding Badge

To temporarily hide the badge:

```typescript
<WelcomeSection
  showTierBadge={false}  // Quick rollback
/>
```

## Alternative Implementations

### Option 1: Header Right

If product requests header-right placement:

```typescript
// In WelcomeSection.tsx
{showTierBadge && tierBadgePlacement === 'header-right' && (
  <View style={styles.headerBadgeContainer}>
    <TierBadge size="sm" showManageButton={false} />
  </View>
)}
// Position between greeting and theme toggle
```

**Style**:
```typescript
headerBadgeContainer: {
  marginRight: 8,
  marginLeft: 'auto',  // Push to right
}
```

### Option 3: Dedicated Card

If product requests prominent tier card:

```tsx
// In ParentDashboard.tsx after WelcomeSection
<View style={styles.section}>
  <View style={styles.tierCard}>
    <Text style={styles.tierCardTitle}>Your Plan</Text>
    <TierBadge size="md" showManageButton={true} />
    <Text style={styles.tierUsage}>
      {usage.ai_help}/{limits.ai_help} AI Help • {usage.ai_lessons}/{limits.ai_lessons} Lessons
    </Text>
  </View>
</View>
```

## Rollback Plan

### Quick Disable
```typescript
showTierBadge={false}  // Hides badge immediately
```

### Full Revert
```bash
git revert <commit-hash>  # Reverts WelcomeSection + ParentDashboard changes
```

No database migrations involved - rollback is safe and instant.

## Performance Impact

- **File size**: WelcomeSection.tsx remains <400 lines (currently ~110 lines)
- **Render performance**: No additional re-renders (TierBadge uses context)
- **Network**: No new API calls (SubscriptionContext handles tier fetching)
- **Bundle size**: +0KB (TierBadge already imported elsewhere)

## Accessibility

- **Screen readers**: TierBadge has proper `accessibilityLabel`
- **Touch targets**: Info icon meets 44x44 minimum (with hitSlop)
- **Focus order**: Badge follows subtitle naturally
- **High contrast**: Theme-aware colors meet WCAG AA standards

## Documentation Sources

**Official APIs Referenced**:
- React Native 0.79.5: https://reactnative.dev/docs/0.79/getting-started
- Expo Router v5: https://docs.expo.dev/router/introduction/
- React 19.0.0: https://react.dev/reference/react
- TypeScript 5.8.3: https://www.typescriptlang.org/docs/handbook/intro.html

## Future Enhancements

**Phase 2 (if requested)**:
- [ ] Add usage stats next to badge (AI help, lessons)
- [ ] Enable "Manage plan" CTA for parents (navigate to `/pricing`)
- [ ] Add tier upgrade prompts based on usage limits
- [ ] Animate badge color transitions when tier changes
- [ ] Add "Upgrade" quick action when reaching limits

## Support & Troubleshooting

### Badge not showing
- Verify `showTierBadge={true}` in ParentDashboard
- Check SubscriptionContext is providing valid tier
- Confirm user has `preschool_id` or `organization_id`

### Wrong tier displayed
- Check `subscription_tier` in user metadata
- Verify `preschools.subscription_tier` or `organizations.plan_tier`
- Review `subscription_plans.tier` for active subscriptions

### Tooltip not appearing
- Ensure user is principal/admin (tooltip logic in TierBadge)
- Check `tierSource` is populated in SubscriptionContext
- Verify touch target hitSlop is applied

---

**Implementation Date**: 2025-01-24  
**Contributors**: Warp AI + Development Team  
**Next Review**: 2025-02-24 (1 month)
