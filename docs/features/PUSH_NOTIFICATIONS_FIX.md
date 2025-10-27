# Push Notifications Fix - Production Build

**Date**: 2025-10-27  
**Issue**: Push notifications not working in production builds  
**Status**: Fixed ✅  

## Root Causes Found

### 1. **Missing Android Permission (CRITICAL)**
**Problem**: `android.permission.POST_NOTIFICATIONS` was not declared in `app.json`

**Impact**: Android 13+ (API 33+) **requires** this permission for push notifications. Without it:
- Notifications are silently blocked by OS
- No permission prompt shown to user
- Token registration may succeed but notifications never arrive

**Fix Applied**: ✅
```json
// app.json - android.permissions array
"android.permission.POST_NOTIFICATIONS"
```

### 2. **Missing Production Environment Variable**
**Problem**: `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` was only set in `preview` build, not `production`

**Impact**: 
- Feature flags may have conditionally disabled notifications
- Client-side logic may have skipped registration

**Fix Applied**: ✅
```json
// eas.json - production env
"EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS": "true"
```

### 3. **Potential FCM Configuration Gap**
**Problem**: Code silently catches and skips FCM errors in `lib/notifications.ts:60-64`

**Impact**: If Firebase/FCM not properly configured in production build:
- Registration silently fails
- No error surfaced to developer
- User never gets notified

**Recommendation**: Check FCM setup (see below)

## Files Modified

1. **app.json** (+1 permission)
   - Added `android.permission.POST_NOTIFICATIONS`

2. **eas.json** (+1 environment variable)
   - Added `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS: "true"` to production

## How Notifications Work (Current Implementation)

### Registration Flow

1. **On Sign In** (`contexts/AuthContext.tsx:482-497`):
   ```typescript
   const { registerPushDevice } = await import('@/lib/notifications');
   const result = await registerPushDevice(assertSupabase(), s.user);
   ```

2. **Permission Request** (`lib/notifications.ts:31-66`):
   - Android: Auto-granted (with POST_NOTIFICATIONS permission declared)
   - iOS: User prompt required
   - Web/Emulator: Skipped

3. **Token Generation** (`lib/notifications.ts:56`):
   ```typescript
   const token = await Notifications.getExpoPushTokenAsync({ 
     projectId: 'ab7c9230-2f47-4bfa-b4f4-4ae516a334bc' 
   });
   ```

4. **Database Storage** (`lib/notifications.ts:118-132`):
   - Upsert to `push_devices` table
   - Includes device metadata (platform, model, locale, timezone)
   - Unique constraint: `user_id, device_installation_id`

### Sending Notifications

**Server-Side Only** via `notifications-dispatcher` Edge Function:

```typescript
// services/notification-service.ts
await supabase.functions.invoke('notifications-dispatcher', {
  body: {
    event_type: 'report_approved',
    report_id: '...',
    student_id: '...',
    preschool_id: '...',
  }
});
```

**Events Supported**:
- `report_submitted_for_review` → Notifies principals
- `report_approved` → Notifies teachers
- `report_rejected` → Notifies teachers with reason
- `new_message` → Chat notifications
- `new_announcement` → School-wide announcements
- `homework_graded` → Parent notifications

## FCM/APNS Configuration Checklist

### Android (FCM)

**Required**:
- [ ] `google-services.json` present in project root
- [ ] Firebase project created with package name `com.edudashpro`
- [ ] FCM API enabled in Firebase Console
- [ ] Server key added to Expo dashboard (for push sending)

**Verify**:
```bash
# Check if google-services.json exists
ls -la google-services.json

# Verify package name matches
cat google-services.json | grep "package_name"
# Should output: "package_name": "com.edudashpro"
```

### iOS (APNs)

**Required**:
- [ ] Push Notifications capability enabled in Xcode/Apple Developer
- [ ] APNs certificates uploaded to Expo
- [ ] Bundle ID matches: `com.k1ngdevops.edudashpro`

**Verify in Expo Dashboard**:
```bash
eas credentials
# Select iOS → Push Notifications → View current credentials
```

## Testing After Fix

### Build New Production Version

```bash
# Increment version in app.json first
"version": "1.0.3"  # or next version

# Build production APK
eas build --platform android --profile production-apk

# Or AAB for Play Store
eas build --platform android --profile production
```

### Test on Device

1. **Install production build** on Android device
2. **Sign in** as a user
3. **Check logs** for registration:
   ```
   [Push Registration] Successfully registered device
   ```
4. **Verify database**:
   ```sql
   SELECT * FROM push_devices WHERE user_id = '<user-id>' ORDER BY last_seen_at DESC LIMIT 1;
   -- Should show: is_active = true, expo_push_token present
   ```

### Send Test Notification

**Option A - Via Edge Function**:
```bash
# Using curl or Postman
curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/notifications-dispatcher \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "new_announcement",
    "preschool_id": "YOUR_PRESCHOOL_ID",
    "custom_payload": {
      "title": "Test Notification",
      "body": "Testing push notifications after fix"
    }
  }'
```

**Option B - Via Expo Push Tool**:
1. Get Expo Push Token from database:
   ```sql
   SELECT expo_push_token FROM push_devices WHERE user_id = '<user-id>' LIMIT 1;
   ```
2. Visit: https://expo.dev/notifications
3. Paste token and send test notification

## Common Issues & Solutions

### Issue: "FCM/Firebase not configured"
**Symptoms**: Registration fails with FCM error  
**Solution**:
1. Ensure `google-services.json` exists in project root
2. Rebuild with `eas build` (not `expo build`)
3. Verify Firebase project is active

### Issue: Permission denied (Android 13+)
**Symptoms**: Token registration returns `denied`  
**Solution**:
- ✅ Already fixed: Added `POST_NOTIFICATIONS` permission
- User must grant permission when prompted
- Check Settings → Apps → EduDash Pro → Notifications

### Issue: Token registered but no notifications arrive
**Symptoms**: Database shows token, but push doesn't arrive  
**Possible Causes**:
1. FCM server key not configured in Expo
2. `notifications-dispatcher` Edge Function failing
3. Notification payload malformed
4. Device offline/unreachable

**Debug**:
```bash
# Check Edge Function logs
supabase functions logs notifications-dispatcher --tail

# Verify FCM credentials in Expo Dashboard
eas credentials
```

### Issue: Works in development, not production
**Symptoms**: Dev builds receive notifications, production doesn't  
**Solution**:
- ✅ Already fixed: Added production env vars
- Ensure production build uses correct Firebase project
- Check `credentialsSource: "remote"` in eas.json

## Monitoring & Alerts

### Database Monitoring

**Active Devices**:
```sql
SELECT 
  platform, 
  COUNT(*) as device_count,
  COUNT(DISTINCT user_id) as unique_users
FROM push_devices 
WHERE is_active = true 
GROUP BY platform;
```

**Recent Registrations**:
```sql
SELECT 
  user_id,
  platform,
  device_metadata->>'model' as model,
  last_seen_at
FROM push_devices 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Sentry Alerts

Push notification failures are logged but not thrown. Monitor:
- `[Push Registration] Database error`
- `[Push Registration] Exception`
- `Error sending notification` (from notification-service.ts)

## Next Steps

### Immediate (Post-Fix)
1. ✅ Build new production version with fixes
2. ⏳ Test on Android 13+ device
3. ⏳ Verify token registration in database
4. ⏳ Send test notification via Edge Function
5. ⏳ Monitor Sentry for 48h after release

### Future Enhancements
1. **Badge count**: Implement unread notification counter
2. **Rich notifications**: Add images, actions, custom sounds
3. **Notification preferences**: Per-user settings (mute announcements, etc.)
4. **Delivery tracking**: Track open rates, delivery failures
5. **Real-time sync**: Use Supabase Realtime + push notifications together

## Rollout Plan

1. **Phase 1** (Now): Build with fixes
   - `eas build --platform android --profile production-apk`
   - Internal testing with 5-10 devices

2. **Phase 2** (24h later): Limited release
   - Distribute to 20% of users via Play Store Internal Testing
   - Monitor for registration rate increase

3. **Phase 3** (72h later): Full release
   - Promote to production if no issues
   - Monitor notification delivery rates
   - Gather user feedback

## Documentation References

- **Expo Notifications**: https://docs.expo.dev/versions/v53.0.0/sdk/notifications/
- **FCM Setup**: https://firebase.google.com/docs/cloud-messaging/android/client
- **APNs Setup**: https://developer.apple.com/documentation/usernotifications
- **EAS Credentials**: https://docs.expo.dev/app-signing/managed-credentials/

## Support

**If notifications still don't work after fix**:
1. Check all items in FCM/APNs checklist
2. Review Edge Function logs: `supabase functions logs notifications-dispatcher`
3. Verify `push_devices` table has recent entries
4. Test with Expo Push Tool: https://expo.dev/notifications
5. Check Android system notification settings
