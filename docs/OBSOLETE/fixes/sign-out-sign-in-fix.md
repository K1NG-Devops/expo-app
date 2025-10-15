# Sign-Out and Sign-In Error Fix

## Problem
Users were experiencing errors when signing out and immediately trying to sign back in. The expected error was occurring due to stale authentication state not being properly cleared.

## Root Causes

1. **Incomplete State Cleanup**: The `clearStoredData()` function in `sessionManager.ts` was only clearing specific storage keys but not ensuring all authentication state was removed.

2. **Stale Supabase Auth State**: After sign-out, Supabase's local authentication state wasn't being properly cleared, causing conflicts when attempting a new sign-in.

3. **Race Conditions**: When signing in immediately after sign-out, the old session data could still be present in storage, causing authentication conflicts.

4. **Missing Error Recovery**: If a user was "already signed in" due to stale state, there was no recovery mechanism to handle this scenario.

## Solutions Implemented

### 1. Enhanced `clearStoredData()` in `sessionManager.ts`

**Location**: `/lib/sessionManager.ts` lines 179-205

**Changes**:
- Added comprehensive logging for debugging
- Added double-clear mechanism to ensure data is removed from both primary storage and AsyncStorage
- Added console logging to track the clearing process

```typescript
async function clearStoredData(): Promise<void> {
  try {
    console.log('[SessionManager] Clearing all stored data...');
    await Promise.all([
      storage.removeItem(SESSION_STORAGE_KEY),
      storage.removeItem(PROFILE_STORAGE_KEY),
    ]);
    
    // Also clear from AsyncStorage if it's available (extra safety)
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      } catch (e) {
        console.debug('AsyncStorage clear skipped:', e);
      }
    }
    
    console.log('[SessionManager] All stored data cleared successfully');
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
}
```

### 2. Improved `signOut()` Function

**Location**: `/lib/sessionManager.ts` lines 651-748

**Changes**:
- Added comprehensive logging
- Changed Supabase sign-out to use `scope: 'local'` to ensure local storage is cleared
- Added error handling that continues to clear local data even if Supabase sign-out fails
- Added fallback cleanup in error recovery

```typescript
export async function signOut(): Promise<void> {
  try {
    console.log('[SessionManager] Starting sign-out process...');
    // ... session duration tracking ...
    
    // Clear auto-refresh timer
    if (sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    }

    try {
      // Sign out from Supabase with scope 'local' to clear local storage
      console.log('[SessionManager] Signing out from Supabase...');
      await assertSupabase().auth.signOut({ scope: 'local' });
      console.log('[SessionManager] Supabase sign-out successful');
    } catch (supabaseError) {
      // Continue even if Supabase sign-out fails (network issues, etc.)
      console.warn('[SessionManager] Supabase sign-out error (continuing):', supabaseError);
    }

    // Clear stored data
    await clearStoredData();
    
    console.log('[SessionManager] Sign-out completed successfully');

  } catch (error) {
    console.error('[SessionManager] Sign-out failed:', error);
    // Still try to clear local data even if other steps failed
    try {
      await clearStoredData();
    } catch (clearError) {
      console.error('[SessionManager] Failed to clear data during error recovery:', clearError);
    }
    reportError(new Error('Sign-out failed'), { error });
  }
}
```

### 3. Enhanced `signInWithSession()` Function

**Location**: `/lib/sessionManager.ts` lines 537-647

**Changes**:
- Added pre-sign-in cleanup to clear any stale session data
- Added small delay to ensure storage is cleared before attempting new sign-in
- Added recovery mechanism for "already signed in" errors
- If Supabase reports user is already signed in, the function now retrieves the existing session instead of failing

```typescript
export async function signInWithSession(
  email: string,
  password: string
): Promise<{
  session: UserSession | null;
  profile: UserProfile | null;
  error?: string;
}> {
  try {
    console.log('[SessionManager] signInWithSession called for:', email);
    
    // Clear any stale session data before attempting new sign-in
    console.log('[SessionManager] Clearing stale session data before sign-in...');
    await clearStoredData();
    
    // Small delay to ensure storage is cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { data, error } = await assertSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[SessionManager] Supabase auth error:', error.message);
      
      // Special handling for "already signed in" errors
      if (error.message?.includes('already') || error.message?.includes('signed in')) {
        console.log('[SessionManager] User already signed in, attempting to get session...');
        try {
          const { data: sessionData } = await assertSupabase().auth.getSession();
          if (sessionData?.session) {
            console.log('[SessionManager] Retrieved existing session');
            // Use the existing session
            const session: UserSession = {
              access_token: sessionData.session.access_token,
              refresh_token: sessionData.session.refresh_token,
              expires_at: sessionData.session.expires_at || Date.now() / 1000 + 3600,
              user_id: sessionData.session.user.id,
              email: sessionData.session.user.email,
            };
            const profile = await fetchUserProfile(sessionData.session.user.id);
            if (profile) {
              await storeSession(session);
              await storeProfile(profile);
              setupAutoRefresh(session);
              return { session, profile };
            }
          }
        } catch (recoveryError) {
          console.error('[SessionManager] Session recovery failed:', recoveryError);
        }
      }
      
      // ... rest of error handling ...
    }
    
    // ... rest of sign-in logic ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### 4. Improved AuthContext `handleSignOut()`

**Location**: `/contexts/AuthContext.tsx` lines 139-210

**Changes**:
- Clear all React state immediately before calling sessionManager
- Added comprehensive logging
- Added PostHog and Sentry cleanup
- Ensured navigation happens even if errors occur
- Added fallback cleanup in error handler

```typescript
const handleSignOut = useCallback(async () => {
  try {
    console.log('[AuthContext] Starting sign-out process...');
    
    // Security audit for logout
    if (user?.id) {
      securityAuditor.auditAuthenticationEvent(user.id, 'logout', {
        role: profile?.role,
        session_duration: session ? Date.now() - (session.user.created_at ? new Date(session.user.created_at).getTime() : Date.now()) : null,
      });
    }
    
    // Clear all state immediately to prevent stale data
    console.log('[AuthContext] Clearing auth state...');
    setUser(null);
    setSession(null);
    setProfile(null);
    setPermissions(createPermissionChecker(null));
    setProfileLoading(false);
    
    // Call sessionManager sign out (this clears storage and Supabase session)
    await signOut();
    
    // Clear PostHog and Sentry
    try {
      await getPostHog()?.reset();
      console.log('[AuthContext] PostHog reset completed');
    } catch (e) {
      console.warn('[AuthContext] PostHog reset failed:', e);
    }
    
    try {
      Sentry.Native.setUser(null as any);
      console.log('[AuthContext] Sentry user cleared');
    } catch (e) {
      console.warn('[AuthContext] Sentry clear user failed:', e);
    }
    
    console.log('[AuthContext] Sign-out completed successfully');
    
    // Navigate to sign-in screen
    try {
      router.replace('/sign-in');
    } catch (navErr) {
      console.error('[AuthContext] Navigation to sign-in failed:', navErr);
    }
  } catch (error) {
    console.error('[AuthContext] Sign out failed:', error);
    
    // Even if sign-out fails, clear local state to prevent UI issues
    setUser(null);
    setSession(null);
    setProfile(null);
    setPermissions(createPermissionChecker(null));
    
    // Security audit for failed logout
    if (user?.id) {
      securityAuditor.auditAuthenticationEvent(user.id, 'auth_failure', {
        action: 'logout',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    // Still try to navigate even if there was an error
    try {
      router.replace('/sign-in');
    } catch (navErr) {
      console.error('[AuthContext] Navigation to sign-in failed:', navErr);
    }
  }
}, [user?.id, profile?.role, session]);
```

### 5. Enhanced SIGNED_OUT Event Handler

**Location**: `/contexts/AuthContext.tsx` lines 432-453

**Changes**:
- Added comprehensive state clearing including user and session
- Added logging to track the event
- Ensured all authentication state is reset

## Testing Instructions

To verify the fix works correctly:

1. **Sign In**: Log in with valid credentials
2. **Sign Out**: Use the sign-out button/function
3. **Immediate Sign In**: Immediately try to sign in again with the same credentials
4. **Expected Result**: Sign-in should succeed without any "already signed in" or authentication errors

## Debug Logging

The fix adds comprehensive logging with the `[SessionManager]` and `[AuthContext]` prefixes. Monitor the console for:

- `[SessionManager] Starting sign-out process...`
- `[SessionManager] Clearing all stored data...`
- `[SessionManager] Supabase sign-out successful`
- `[SessionManager] Sign-out completed successfully`
- `[SessionManager] signInWithSession called for: <email>`
- `[SessionManager] Clearing stale session data before sign-in...`

## Technical Details

### Key Improvements

1. **Defensive Programming**: Multiple layers of cleanup ensure data is cleared even if one method fails
2. **Error Recovery**: Special handling for "already signed in" errors with automatic session recovery
3. **State Synchronization**: Immediate React state clearing prevents UI from showing stale data
4. **Logging**: Comprehensive logging helps debug any remaining issues

### Storage Cleanup Strategy

The fix uses a multi-layer approach:
1. Primary storage adapter (SecureStore or AsyncStorage depending on platform)
2. Fallback to AsyncStorage if available
3. Supabase's `signOut({ scope: 'local' })` to clear internal storage

This ensures all authentication data is removed regardless of which storage mechanism is in use.

## Files Modified

1. `/lib/sessionManager.ts` - Core session management improvements
2. `/contexts/AuthContext.tsx` - React state management improvements

## Related Issues

This fix addresses the common issue where users would:
- Sign out successfully
- Try to sign back in immediately
- Receive errors about invalid credentials or stale sessions
- Need to wait or refresh the app before signing in again

The root cause was incomplete cleanup of authentication state, leaving remnants that conflicted with new sign-in attempts.
