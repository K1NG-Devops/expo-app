# EduDash Development Rules & Error Prevention

This document contains rules and guidelines to prevent common errors and issues encountered during EduDash development. Follow these rules to maintain code quality and avoid runtime errors.

## 🛠️ Environment & Configuration

### ENV-001: Always Define Required Environment Variables
**Issue**: `EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable is required`
**Rule**: All required environment variables must be defined in `.env.local` before using services that depend on them.

```bash
# Required environment variables:
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_claude_api_key_here
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### ENV-002: Handle Missing Native Modules Gracefully
**Issue**: `expo-localization not available, using fallback`
**Rule**: Always provide fallbacks for native modules that might not be available in all environments.

```typescript
// Good: With fallback
let getLocales = () => [{ languageCode: 'en' }];
try {
  const expoLocalization = require('expo-localization');
  getLocales = expoLocalization.getLocales;
} catch (error) {
  console.warn('expo-localization not available, using fallback');
}
```

### ENV-003: Configure URI Schemes for Development
**Issue**: `The /android project does not contain any URI schemes`
**Rule**: Configure proper URI schemes in `app.config.js` for deep linking and development client.

## 🏗️ TypeScript & Compilation

### TS-001: Fix TypeScript Helper Issues
**Issue**: `Cannot read property '__extends' of undefined`
**Rule**: Add proper TypeScript configuration and Babel alias for tslib to prevent Hermes runtime errors.

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['module-resolver', {
      alias: { 
        '@': './', 
        tslib: './node_modules/tslib/tslib.js' // Fix Hermes __extends issues
      }
    }]
  ]
};
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "importHelpers": true,
    "skipLibCheck": true
  }
}
```

### TS-002: Always Export Default Components
**Issue**: `Route "./screens/parent-dashboard.tsx" is missing the required default export`
**Rule**: Every route file must have a default export with a React component.

```typescript
// Good
export default function ParentDashboardScreen() {
  return <View>...</View>;
}

// Bad - no default export
export const ParentDashboardScreen = () => <View>...</View>;
```

## ⚛️ React & JSX

### JSX-001: Never Pass Style Props to React.Fragment
**Issue**: `Invalid prop 'style' supplied to React.Fragment`
**Rule**: Replace React Fragments with Views when style props might be applied by parent components.

```typescript
// Bad - Fragment can't accept style props
return (
  <>
    <Component />
  </>
);

// Good - View can accept style props
return (
  <View style={{ flex: 1 }}>
    <Component />
  </View>
);
```

### JSX-002: Handle StatusBar Edge-to-Edge Warnings
**Issue**: `StatusBar backgroundColor is not supported with edge-to-edge enabled`
**Rule**: Use SafeAreaView or render background views instead of relying on StatusBar backgroundColor.

```typescript
// Good
<SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }}>
  <StatusBar style="light" />
  <Content />
</SafeAreaView>
```

## 🧭 Navigation & Routing

### NAV-001: Always Test Route Paths Match File Structure
**Issue**: Navigation to non-existent routes causing "Unmatched Route" errors
**Rule**: Ensure navigation paths exactly match the file structure in the `app` directory.

```typescript
// File: app/screens/parent-dashboard.tsx
// Route: /screens/parent-dashboard ✅

// File: app/parent-dashboard.tsx  
// Route: /parent-dashboard ✅
```

### NAV-002: Add Fallback Error Handling in Routing
**Rule**: Always wrap navigation calls in try-catch and provide fallback routes.

```typescript
try {
  router.replace(route.path);
} catch (navigationError) {
  console.error('Navigation failed:', navigationError);
  router.replace('/debug-user'); // Fallback route
}
```

### NAV-003: Log Navigation Decisions for Debugging
**Rule**: Add console logs for navigation decisions to help debug routing issues.

```typescript
console.log('Navigating to route:', { path: route.path, params: route.params });
```

## 🚨 API Security (CRITICAL)

### SEC-000: NEVER Store API Keys Client-Side
**Issue**: `EXPO_PUBLIC_ANTHROPIC_API_KEY environment variable is required`
**Rule**: **API keys must NEVER be stored in client-side code or environment variables visible to users.**

```typescript
// ❌ NEVER DO THIS - API keys exposed to client
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': API_KEY }
});

// ✅ DO THIS - Use server-side proxy
const response = await fetch('/api/ai/claude/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request)
});
```

**Why This Matters:**
- **Cost Protection**: Users can extract API keys and abuse your credits
- **Security**: Client-side code is public and inspectable
- **Control**: No rate limiting or access control with direct API access
- **Compliance**: Violates API provider terms of service

**Proper Architecture:**
```
Mobile App → Your Backend API → Third-party API (with server-side key)
```

**Implementation:**
1. Create server-side proxy endpoints
2. Store API keys in server environment only
3. Authenticate users before API access
4. Log usage for billing and monitoring
5. Implement rate limiting per user

## 🛡️ Security & Data

### SEC-001: Handle SecureStore Size Warnings
**Issue**: `Value being stored in SecureStore is larger than 2048 bytes`
**Rule**: Store only essential data in SecureStore. Use regular storage for large objects.

```typescript
// Bad - storing large profile objects
await SecureStore.setItemAsync('user_profile', JSON.stringify(largeProfile));

// Good - store only essential tokens
await SecureStore.setItemAsync('access_token', token);
```

### SEC-002: Always Provide Profile Fetch Fallbacks
**Issue**: `RPC get_my_profile failed or returned null`
**Rule**: Implement fallback profile fetching methods when RPC calls fail.

```typescript
// Try RPC first, then fallback to direct query
let profile = await getProfileViaRPC(userId);
if (!profile) {
  console.log('RPC failed, using direct fetch');
  profile = await getProfileDirect(userId);
}
```

## 🎨 UI & Styling

### UI-001: Use Consistent Background Colors
**Rule**: Always set explicit background colors to prevent white flash on dark themes.

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220', // Always set background
  }
});
```

### UI-002: Handle LinearGradient Color Props Properly
**Issue**: TypeScript errors with gradient color arrays
**Rule**: Type gradient colors explicitly as readonly string arrays.

```typescript
// Good
const colors: readonly [string, string, ...string[]] = ['#00f5ff', '#0080ff'];

// Or use assertion
colors={['#00f5ff', '#0080ff'] as readonly [string, string, ...string[]]}
```

## 📦 Dependencies & Modules

### DEP-001: Always Check Module Availability
**Rule**: Check if optional native modules are available before using them.

```typescript
const hasModule = () => {
  try {
    require('optional-module');
    return true;
  } catch {
    return false;
  }
};
```

### DEP-002: Handle Sentry Native SDK Warnings
**Issue**: `Native Client is not available, can't start on native`
**Rule**: Either install native SDK or disable native support explicitly.

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableNative: false, // Disable if not using native SDK
});
```

## 🌍 Internationalization & Theming (MANDATORY)

### I18N-000: ALWAYS Use i18n in All Components
**Issue**: Hardcoded strings prevent localization and accessibility
**Rule**: **ALL USER-FACING TEXT MUST USE i18n TRANSLATION KEYS**

```typescript
// ❌ NEVER DO THIS - Hardcoded text
<Text>Welcome back, Parent!</Text>
<Text>Usage Limits</Text>
<Button title="Upgrade to Pro" />

// ✅ ALWAYS DO THIS - Use translation keys
<Text>{t('dashboard.welcome', { name: userName })}</Text>
<Text>{t('dashboard.usageLimits')}</Text>
<Button title={t('subscription.upgradeToPro')} />
```

**Mandatory for ALL new components:**
- Dashboard headers and titles
- Button labels and descriptions
- Error messages and alerts
- Form labels and placeholders
- Status indicators and badges
- Modal content and confirmations

### THEME-000: ALWAYS Use ThemeContext in All Components
**Issue**: Components break in dark mode and lack accessibility
**Rule**: **ALL COMPONENTS MUST USE useTheme() HOOK FOR COLORS**

```typescript
// ❌ NEVER DO THIS - Hardcoded colors
const styles = {
  text: { color: '#FFFFFF' },
  background: { backgroundColor: '#0b1220' }
};

// ✅ ALWAYS DO THIS - Use theme colors
import { useTheme } from '@/contexts/ThemeContext';

const Component = () => {
  const { theme } = useTheme();
  
  return (
    <Text style={{ color: theme.text }}>
      {t('component.title')}
    </Text>
  );
};
```

**Required ThemeContext Usage:**
- Text colors: `theme.text`, `theme.textSecondary`, `theme.textTertiary`
- Background colors: `theme.background`, `theme.surface`, `theme.elevated`
- UI colors: `theme.primary`, `theme.success`, `theme.warning`, `theme.error`
- Borders and dividers: `theme.border`, `theme.divider`

### I18N-001: Always Provide Language Fallbacks
**Rule**: Set up proper fallback languages and handle missing translations gracefully.

```typescript
i18n.init({
  fallbackLng: 'en',
  resources: { 
    en: { common: englishTranslations },
    // other languages...
  }
});
```

### I18N-002: Use Translation Keys Consistently
**Rule**: Use descriptive, hierarchical translation keys.

```typescript
// Good
t('dashboard.welcome', { name: 'User' })
t('ai.homework.title')
t('common.error')

// Bad
t('welcome')
t('title')
t('error')
```

### THEME-001: Create Theme-Aware Styles
**Rule**: Use React.useMemo() to create styles that respond to theme changes.

```typescript
const Component = () => {
  const { theme } = useTheme();
  
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    text: {
      color: theme.text,
    }
  }), [theme]);
  
  return <View style={styles.container}>...</View>;
};
```

### THEME-002: Test Both Light and Dark Modes
**Rule**: Every component must be tested in both light and dark themes.

```typescript
// Add theme toggle for testing
const { toggleTheme } = useTheme();

// Test component in both modes during development
```

## 🔄 State Management

### STATE-001: Handle Loading States Properly
**Rule**: Always show loading indicators while async operations are in progress.

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadData().finally(() => setLoading(false));
}, []);

if (loading) {
  return <LoadingIndicator />;
}
```

### STATE-002: Provide Error Boundaries
**Rule**: Wrap components in error boundaries to catch and handle runtime errors gracefully.

## 🧪 Testing & Development

### TEST-001: Always Create Debug Routes
**Rule**: Create debug/testing routes to help diagnose issues during development.

```typescript
// Create routes like /debug-user to inspect app state
export default function DebugUser() {
  // Display user state, navigation info, etc.
}
```

### TEST-002: Use Analytics for Error Tracking
**Rule**: Track important events and errors for debugging and monitoring.

```typescript
track('edudash.error.occurred', {
  error_type: 'navigation',
  route: attemptedRoute,
  user_role: userRole,
});
```

## 📱 Performance & Optimization

### PERF-001: Minimize Bundle Rebuilds
**Rule**: Use proper caching strategies and avoid unnecessary rebuilds.

```bash
# Use clear cache only when necessary
npx expo start --clear  # Only when needed
npx expo start          # Normal development
```

### PERF-002: Lazy Load Heavy Components
**Rule**: Use React.lazy() for components that aren't immediately needed.

```typescript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

## 🚨 Error Handling

### ERR-001: Always Log Navigation Attempts
**Rule**: Log all navigation attempts with context for debugging routing issues.

### ERR-002: Provide User-Friendly Error Messages
**Rule**: Show helpful error messages to users, not raw technical errors.

```typescript
// Bad
Alert.alert('Error', error.message);

// Good
Alert.alert('Connection Error', 'Please check your internet connection and try again.');
```

### ERR-003: Implement Graceful Degradation
**Rule**: When services fail, provide alternative functionality rather than breaking the app.

---

## 🎯 Summary

Following these rules will help prevent the most common errors encountered during EduDash development:

1. **Always define environment variables** before using dependent services
2. **Provide fallbacks** for native modules and external services  
3. **Fix TypeScript compilation issues** with proper configuration
4. **Use Views instead of Fragments** when style props might be applied
5. **Test navigation paths** match actual file structure
6. **Handle errors gracefully** with proper fallbacks and user messaging
7. **Log important decisions** for easier debugging
8. **Set explicit styles** to prevent UI inconsistencies

Remember: **Prevention is better than debugging!** 🛡️
