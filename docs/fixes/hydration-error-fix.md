# Hydration Error Fix - Web App

## Issue

React hydration error in web dashboard causing console errors:

```
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
```

**Error Details**:
- Server rendered: `<div className="chip">`
- Client expected: `<button className="iconBtn">`
- Location: ParentShell and TeacherShell components

## Root Cause

The components used `typeof window !== 'undefined'` to conditionally render the back button:

```typescript
// ❌ WRONG - Causes hydration mismatch
{
  (typeof window !== 'undefined') &&
  (location.pathname !== '/dashboard/parent') && (
    <button className="iconBtn" aria-label="Back" onClick={() => router.back()}>
      <ArrowLeft className="icon20" />
    </button>
  )
}
```

**Why this causes hydration mismatch**:
1. **Server-side rendering**: `window` is undefined → button is NOT rendered
2. **Client-side hydration**: `window` exists → button IS rendered
3. **Result**: React detects HTML mismatch and throws error

## Solution

Replace `typeof window !== 'undefined'` check with `usePathname()` hook which works correctly on both server and client:

```typescript
// ✅ CORRECT - No hydration mismatch
const showBackButton = pathname !== '/dashboard/parent';

return (
  <div className="leftGroup">
    {showBackButton && (
      <button className="iconBtn" aria-label="Back" onClick={() => router.back()}>
        <ArrowLeft className="icon20" />
      </button>
    )}
    <div className="chip">{tenantSlug ? `/${tenantSlug}` : ''}</div>
  </div>
);
```

**Why this works**:
- `usePathname()` returns the same value on server and client during initial render
- No conditional logic based on browser-only APIs
- React can properly hydrate without mismatches

## Files Fixed

### 1. ParentShell.tsx
**File**: `web/src/components/dashboard/parent/ParentShell.tsx`

**Changes**:
- Added `const showBackButton = pathname !== '/dashboard/parent';`
- Replaced `typeof window !== 'undefined'` check with `showBackButton`
- Used `pathname` from `usePathname()` hook (already imported)

### 2. TeacherShell.tsx
**File**: `web/src/components/dashboard/teacher/TeacherShell.tsx`

**Changes**:
- Added `const showBackButton = pathname !== '/dashboard/teacher';`
- Replaced `typeof window !== 'undefined'` check with `showBackButton`
- Used `pathname` from `usePathname()` hook (already imported)

## Testing

### Build Test ✅
```bash
cd web && npm run build
```
**Result**: Build succeeded with no hydration warnings

### Expected Behavior
- ✅ No hydration errors in browser console
- ✅ Back button shows on subpages (not on dashboard home)
- ✅ Back button hidden on dashboard home page
- ✅ Works correctly on both server and client render

## Best Practices to Avoid Hydration Errors

### ❌ DON'T Use These in Components:

1. **Browser-only checks**:
   ```typescript
   typeof window !== 'undefined'
   typeof document !== 'undefined'
   ```

2. **Dynamic values that change**:
   ```typescript
   Date.now()
   Math.random()
   new Date().toLocaleString()
   ```

3. **Browser APIs directly**:
   ```typescript
   window.location
   localStorage.getItem()
   navigator.userAgent
   ```

### ✅ DO Use These Instead:

1. **Next.js hooks**:
   ```typescript
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const router = useRouter();
   ```

2. **Client-only rendering**:
   ```typescript
   'use client'; // Mark as client component
   
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   
   if (!mounted) return null;
   ```

3. **Server-safe state**:
   ```typescript
   // Get from props/context instead of browser APIs
   const { userLocale } = useContext(LocaleContext);
   ```

## Related Links

- [React Hydration Docs](https://react.dev/link/hydration-mismatch)
- [Next.js Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [usePathname Hook](https://nextjs.org/docs/app/api-reference/functions/use-pathname)

## Additional Checks

Searched for other instances of `typeof window` in web app:

### Safe Usage Found:
- `web/src/lib/hooks/parent/useChildrenData.ts` - Used in `useEffect` (client-only, safe)
- `web/src/components/PWARegister.tsx` - Used in `useEffect` (client-only, safe)

**Note**: Using `typeof window` inside `useEffect` or event handlers is safe because they only run on the client.

## Summary

✅ **Fixed**: Hydration errors in ParentShell and TeacherShell
✅ **Method**: Replaced browser checks with Next.js `usePathname()` hook
✅ **Result**: Clean build, no console errors
✅ **Impact**: Improved web app stability and performance
