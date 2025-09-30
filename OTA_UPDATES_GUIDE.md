# OTA Updates Configuration Guide

## What Was Fixed (2025-09-30)

### Problem
When publishing EAS updates, users were not seeing any notification to restart the app. The updates were being downloaded silently but never applied.

### Root Causes
1. **Missing UI Component**: `GlobalUpdateBanner` was not added to the app layout
2. **Updates Disabled**: `EXPO_PUBLIC_ENABLE_OTA_UPDATES` was set to `false` in `.env`

### Solution
1. ✅ Added `GlobalUpdateBanner` component to `app/_layout.tsx`
2. ✅ Enabled OTA updates in `.env` file
3. ✅ Published new update with these changes

## How OTA Updates Work Now

### Update Flow
1. **Background Check**: App checks for updates when it becomes active
2. **Download**: If update available, downloads automatically in background
3. **Banner Shows**: Green banner appears at top: "Update Ready - Tap to restart"
4. **User Action**: User taps "Restart" or dismisses with "Later"
5. **Apply**: App restarts and new version loads

### Banner States

**Update Available (Green)**:
```
┌──────────────────────────────────────────┐
│ 📥 Update Ready                          │
│ Tap to restart and apply the latest     │
│ version                                  │
│                      [Later] [Restart ↻] │
└──────────────────────────────────────────┘
```

**Error (Red)**:
```
┌──────────────────────────────────────────┐
│ ⚠️ Update Error                          │
│ Failed to check for updates              │
│                                      [X]  │
└──────────────────────────────────────────┘
```

## Configuration

### Environment Variables
`.env`:
```bash
# Must be 'true' for production OTA updates
EXPO_PUBLIC_ENABLE_OTA_UPDATES=true
```

### EAS Update Channels
From `eas.json`:
- **development**: For dev builds (OTA disabled by default)
- **preview**: For testing updates before prod
- **production**: For live users

### App Config
`app.config.js`:
```javascript
updates: {
  url: 'https://u.expo.dev/eaf53603-ff2f-4a95-a2e6-28faa4b2ece8',
}
```

## Publishing Updates

### Quick Publish
```bash
# Preview channel (testing)
eas update --branch preview --message "Your message"

# Production channel (live users)
eas update --branch production --message "Your message"
```

### With Custom Branch
```bash
eas update --branch mobile --message "Mobile-specific fixes"
```

## User Experience

### First Update After Fix
Users with the app will:
1. Open app as normal
2. See "Update Ready" banner within 5-10 seconds
3. Tap "Restart" button
4. App reloads with new version

### Subsequent Updates
Users will:
1. Open app
2. See banner if update available
3. Choose to restart now or later
4. If "Later", banner shows again on next app open

## Testing Updates

### On Your Device
1. Install production build (runtime 1.0.2)
2. Open app - should check for updates
3. If update found, banner appears
4. Tap "Restart" to apply

### Force Check (Debug Build)
Settings > Debug Panel > "Check for Updates" button

### Verify Update Applied
1. Check app version in Settings
2. Look for new features/fixes
3. Check console logs for update events

## Troubleshooting

### Banner Not Showing
**Check:**
- Is `EXPO_PUBLIC_ENABLE_OTA_UPDATES=true` in `.env`?
- Is app using correct runtime version (1.0.2)?
- Is update published to correct channel?
- Wait 5-10 seconds after app opens

**Fix:**
```bash
# Rebuild with updated env
eas update --branch production --message "Test update"
```

### Update Download Fails
**Check:**
- Device has internet connection
- Supabase/EAS endpoints accessible
- Check app logs for errors

**Debug:**
```javascript
// In UpdatesProvider.tsx
console.log('[Updates] Check result:', update);
```

### Wrong Update Channel
**Check** `eas.json` build profile:
- development → development channel
- preview → preview channel  
- production → production channel

**Fix**: Publish to correct channel:
```bash
eas update --branch production --message "Correct channel"
```

## Update Strategy Best Practices

### 1. Test in Preview First
```bash
# 1. Publish to preview
eas update --branch preview --message "Test new feature"

# 2. Test on preview build
# Install preview build and verify

# 3. Publish to production
eas update --branch production --message "New feature release"
```

### 2. Use Descriptive Messages
```bash
# Good
eas update --message "Fix login bug, add dark mode toggle (v1.0.2-hotfix3)"

# Bad
eas update --message "update"
```

### 3. Monitor After Publish
- Check EAS dashboard for adoption rate
- Monitor error logs (Sentry)
- Watch for user reports

### 4. Rollback if Needed
```bash
# Republish previous working version
eas update --branch production --message "Rollback to v1.0.2"
```

## Timeline

**Now**: Users see update banner and can restart
**Next Update**: Users will get the banner immediately
**Future Updates**: Automatic with user-friendly prompts

## Links

- **EAS Dashboard**: https://expo.dev/accounts/edudashprotest/projects/dashpro/updates
- **Latest Production Update**: https://expo.dev/accounts/edudashprotest/projects/dashpro/updates/28bc73ef-bbd6-4a4d-8e41-c20bbcf86884

## Code References

- **Update Provider**: `contexts/UpdatesProvider.tsx`
- **Update Banner**: `components/GlobalUpdateBanner.tsx`
- **Layout Integration**: `app/_layout.tsx` (line 256)
- **Config**: `eas.json`, `app.config.js`
