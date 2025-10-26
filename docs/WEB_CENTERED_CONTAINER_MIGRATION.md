# Web Centered Container Migration Guide

## Overview

This guide explains how to apply web-specific centering to screens using the `WebCenteredContainer` component.

## Component Location

```typescript
import WebCenteredContainer from '@/components/layout/WebCenteredContainer';
```

## Migration Pattern

### Before (Original Pattern)
```typescript
export default function MyScreen() {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Your content here */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

### After (With WebCenteredContainer)
```typescript
export default function MyScreen() {
  const { theme } = useTheme();
  
  return (
    <WebCenteredContainer
      maxWidth={600}
      backgroundColor={theme.background}
    >
      {/* Your content here - SafeAreaView, KeyboardAvoidingView, ScrollView all handled */}
    </WebCenteredContainer>
  );
}
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Your screen content |
| `maxWidth` | `number` | `600` | Maximum width on web (pixels) |
| `backgroundColor` | `string` | `'#ffffff'` | Background color |
| `noPadding` | `boolean` | `false` | Remove default horizontal padding |
| `noScroll` | `boolean` | `false` | Disable ScrollView (use View instead) |
| `safeAreaEdges` | `Array` | `['top', 'left', 'right']` | SafeAreaView edges |
| `contentContainerStyle` | `ViewStyle` | `undefined` | Additional scroll content styles |

## Examples

### Simple Form Screen
```typescript
<WebCenteredContainer maxWidth={500}>
  <View style={styles.card}>
    <TextInput placeholder="Email" />
    <TextInput placeholder="Password" secureTextEntry />
    <TouchableOpacity><Text>Sign In</Text></TouchableOpacity>
  </View>
</WebCenteredContainer>
```

### Dashboard Screen (wider)
```typescript
<WebCenteredContainer maxWidth={1200} noPadding>
  <DashboardHeader />
  <DashboardGrid />
</WebCenteredContainer>
```

### No Scroll (Modal-like)
```typescript
<WebCenteredContainer noScroll>
  <FixedPositionContent />
</WebCenteredContainer>
```

## Priority Screens to Migrate

### 🔴 Critical (Auth & Onboarding)
- ✅ `app/(auth)/sign-in.tsx` (manually done with inline styles)
- `app/screens/parent-registration.tsx`
- `app/screens/teacher-registration.tsx`
- `app/screens/school-registration.tsx`
- `app/screens/verify-your-email.tsx`
- `app/onboarding/**/*.tsx`

### 🟡 High Priority (User-Facing Forms)
- `app/screens/parent-child-registration.tsx`
- `app/screens/student-enrollment.tsx`
- `app/screens/subscription-setup.tsx`
- `app/screens/manage-subscription.tsx`

### 🟢 Medium Priority (Settings & Admin)
- `app/screens/settings.tsx`
- `app/screens/account.tsx`
- `app/screens/school-settings.tsx`
- Super admin screens

### ⚪ Low Priority (Dashboards - may need wider maxWidth)
- Dashboard screens (use maxWidth={1200})
- Detail/view screens

## Migration Checklist

For each screen:
- [ ] Import `WebCenteredContainer`
- [ ] Remove `SafeAreaView` import and usage
- [ ] Remove `KeyboardAvoidingView` wrapper
- [ ] Remove `ScrollView` wrapper (unless `noScroll` needed)
- [ ] Set appropriate `maxWidth` (600 for forms, 1200 for dashboards)
- [ ] Pass `backgroundColor` from theme
- [ ] Test on web (centered with proper width)
- [ ] Test on native (unchanged behavior)
- [ ] Remove unused style definitions (container, keyboardView, scrollView, scrollContent)

## Automated Migration Script

Run this to batch-migrate multiple screens:

```bash
npm run migrate:web-center -- --screen=parent-registration,teacher-registration
```

(Script not yet implemented - manual migration recommended for now)

## Notes

- **Web behavior**: Content is vertically and horizontally centered with `minHeight: '100vh'`
- **Native behavior**: Identical to before (no changes)
- **Platform detection**: Uses `Platform.OS === 'web'` checks internally
- **Flexibility**: All props are optional; works with sensible defaults
- **Performance**: No additional overhead; just styling abstraction

## Support

If a screen doesn't work well with `WebCenteredContainer`, check:
1. Does it need custom scroll behavior? Use `noScroll`
2. Does it need full width? Use `maxWidth={Infinity}` or `noPadding`
3. Does it have nested SafeAreaViews? Remove inner ones
4. Does it conflict with existing web-specific styles? Check for duplicate `Platform.OS === 'web'` checks

For questions, see the component source:
`components/layout/WebCenteredContainer.tsx`
