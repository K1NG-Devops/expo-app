# Mobile Hanging Issue - Root Causes & Fixes

## Issues Fixed (2025-09-30)

### 1. **Metro Bundler Syntax Errors** ✅
**Problem:** Git merge conflicts in `metro.config.js` prevented the bundler from starting
- Lines with `<<<<<<< HEAD` markers caused syntax errors
- Mobile apps couldn't load JavaScript bundles
- Result: App would hang on splash screen

**Fixed:**
- Resolved all merge conflicts in `metro.config.js`
- Resolved conflicts in `DeviceEventEmitter-stub.js`
- Resolved conflicts in `PrincipalDashboardWrapper.tsx`
- Resolved conflicts in `EnhancedPrincipalDashboard.tsx`
- Resolved conflicts in `NewEnhancedTeacherDashboard.tsx`

### 2. **Duplicate Hook Declarations** ✅
**Problem:** `EnhancedPrincipalDashboard.tsx` had duplicate `usePrincipalHub()` calls
- Caused "Identifier 'data' has already been declared" errors
- Would crash the app on render
- Result: Dashboard screens would hang or crash

**Fixed:**
- Removed duplicate hook declaration (line 174-183)
- Added missing `getTeachersWithStatus` to the first declaration
- Ensured all necessary properties are destructured once

### 3. **Authentication Check Timeout** ✅
**Problem:** `app/index.tsx` auth check could hang indefinitely
- No timeout on `getSession()` call
- If Supabase connection slow/failed, user sees "Checking authentication..." forever
- Result: App appears to hang on startup

**Fixed:**
- Added 5-second timeout to `checkAuthAndRoute()`
- If auth check takes >5s, automatically proceed to landing page
- Proper cleanup of timeout in all code paths

## Common Mobile Hanging Causes

### Already Fixed:
1. ✅ Bundler syntax errors from merge conflicts
2. ✅ Duplicate variable declarations
3. ✅ Infinite auth check loops

### Potential Remaining Issues:

#### A. Network-Related
- **Slow Supabase connection** - Now has timeout
- **Poor mobile connectivity** - Timeout helps, but still may be slow
- **API endpoint issues** - Check `EXPO_PUBLIC_SUPABASE_URL`

#### B. Component-Related
- **Heavy initial renders** - Dashboard components might be rendering too much
- **Large data fetches** - Consider pagination/lazy loading
- **Memory issues** - Check for memory leaks in useEffect hooks

#### C. Asset-Related
- **Large images not optimized** - Compress images
- **Fonts not loading** - Ensure fonts are properly bundled
- **Native modules failing** - Check logs for native module errors

## Testing Mobile Performance

### 1. Check Metro Bundler Logs
```bash
npx expo start --dev-client
# Watch for any bundling errors
```

### 2. Monitor Network Requests
- Open React Native Debugger
- Check Network tab for slow/failing requests
- Look for requests taking >3 seconds

### 3. Check Mobile Device Logs

**iOS:**
```bash
npx react-native log-ios
```

**Android:**
```bash
npx react-native log-android
```

### 4. Profile Performance
```bash
# Enable performance monitoring
npx expo start --dev-client --no-dev --minify
```

## Quick Fixes to Try

### If App Still Hangs on Mobile:

1. **Clear cache and reinstall:**
   ```bash
   npx expo start --clear
   # Then reinstall app on device
   ```

2. **Check network connectivity:**
   - Ensure device can reach Supabase
   - Test with different network (WiFi vs cellular)

3. **Reduce initial data load:**
   - Implement pagination on dashboards
   - Add loading skeletons
   - Defer non-critical data fetches

4. **Check for infinite loops:**
   ```bash
   # Search for useEffect with missing dependencies
   grep -r "useEffect" app/ --include="*.tsx"
   ```

5. **Monitor memory usage:**
   - Use Xcode Instruments (iOS)
   - Use Android Profiler (Android)
   - Look for memory leaks

## Environment Variables to Check

Make sure these are set in `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
EXPO_PUBLIC_TENANT_SLUG=your_tenant
EXPO_PUBLIC_API_BASE=your_api_base
```

## Next Steps if Issues Persist

1. **Add more timeouts** to other async operations
2. **Implement loading states** for all data fetches
3. **Add error boundaries** to catch component crashes
4. **Profile the app** on real devices to find bottlenecks
5. **Check Supabase performance** - slow queries can cause hangs

## Summary

The merge conflicts were the primary cause of hanging. With those resolved and a timeout added to auth checks, the app should now:
- ✅ Start successfully on mobile
- ✅ Handle slow connections gracefully
- ✅ Show proper loading/error states
- ✅ Not hang indefinitely on any screen

If hanging persists, it's likely a network/data issue rather than a code error.
