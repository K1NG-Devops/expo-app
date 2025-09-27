# Production-Safe Logging Guidelines

## Overview

This document outlines how to handle logging and debugging information to ensure sensitive details are never exposed to users in production builds.

## Quick Rules

✅ **DO**: Use the production-safe logger from `/lib/logger.ts`  
❌ **DON'T**: Use `console.log`, `console.error`, etc. directly  
✅ **DO**: Show user-friendly error messages in production  
❌ **DON'T**: Expose environment variables, stack traces, or debug info in production  

## Usage Examples

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// These only show in development
logger.debug('Detailed debugging info', { data });
logger.info('General information');
logger.warn('Something might be wrong');
logger.error('An error occurred', error);

// This shows in production (use sparingly!)
logger.forceError('Critical system error', error);
```

### Error Handling

```typescript
import { handleError } from '@/lib/logger';

try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  // Development: shows full error details
  // Production: shows user-friendly message
  const userMessage = handleError(error, 'Failed to load data. Please try again.');
  Alert.alert('Error', userMessage);
}
```

### Development Assertions

```typescript
import { devAssert } from '@/lib/logger';

// Only throws in development
devAssert(user?.id, 'User ID is required for this operation');
```

### Performance Timing

```typescript
import { perfTimer } from '@/lib/logger';

const stopTimer = perfTimer.start('expensive-operation');
await expensiveOperation();
stopTimer?.(); // Only logs timing in development
```

## Environment Detection

The logger automatically detects the environment:

- **Development** (`__DEV__ = true`): All logs shown with full details
- **Test** (`NODE_ENV = 'test'`): Warnings and errors only
- **Production**: No logs (except `forceError`)

## Migration from Console Methods

### Before (❌ Exposes debug info in production)
```typescript
console.log('User data:', userData);
console.error('API error:', error);
try {
  await apiCall();
} catch (error) {
  console.error('Failed:', error);
  Alert.alert('Error', error.message); // Exposes technical details!
}
```

### After (✅ Production-safe)
```typescript
import { logger, handleError } from '@/lib/logger';

logger.debug('User data loaded:', userData);
logger.error('API error occurred:', error);

try {
  await apiCall();
} catch (error) {
  const userMessage = handleError(error, 'Failed to connect. Please check your internet connection.');
  Alert.alert('Error', userMessage); // User-friendly message!
}
```

## Error Message Guidelines

### Good Production Messages ✅
- "Please check your internet connection and try again"
- "Unable to load data. Please refresh the page"
- "Something went wrong. Please try again later"
- "Invalid input. Please check your entries"

### Bad Production Messages ❌
- "TypeError: Cannot read property 'id' of undefined"
- "Network request failed with status 500"
- "EXPO_PUBLIC_SUPABASE_URL is not defined"
- "Database connection timeout after 30s"

## Security Considerations

Never log in production:
- API keys or tokens
- User passwords or PINs
- Database connection strings
- Internal system paths
- Stack traces with code details
- Environment variable values

## Testing

To test production behavior locally:
1. Set `__DEV__` to `false` in your test environment
2. Verify no sensitive information appears in logs
3. Confirm error messages are user-friendly

## Implementation Status

### ✅ Updated Files
- `/lib/supabase.ts` - Production-safe Supabase logging
- `/components/dashboard/NewEnhancedTeacherDashboard.tsx` - Safe refresh error handling
- `/components/dashboard/NewEnhancedParentDashboard.tsx` - Safe refresh error handling

### 🔄 Files to Update
- Other dashboard components
- API service files
- Authentication components
- Any files with direct `console.*` usage

## Next Steps

1. **Audit existing code**: Search for `console.log`, `console.error`, etc.
2. **Replace with logger**: Use the production-safe logger utility
3. **Test in production mode**: Verify no debug info leaks
4. **Update error handling**: Ensure all user-facing errors are friendly

---

**Remember**: Users should never see technical error details, environment variables, or debugging information in production!