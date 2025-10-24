# EAS Environment Variable Sync Fixes

**Date**: 2025-10-24  
**Status**: Action Required

## Issues Identified

### 1. Preview Build Missing OTA Configuration
**File**: `eas.json`  
**Issue**: Preview environment doesn't declare `EXPO_PUBLIC_ENABLE_OTA_UPDATES`

**Fix**:
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENABLE_OTA_UPDATES": "true",  // ADD THIS
        "EXPO_PUBLIC_ENVIRONMENT": "preview",      // ADD THIS
        // ... existing vars
      }
    }
  }
}
```

### 2. Production Missing AI Streaming Flags
**File**: `eas.json`  
**Issue**: Production build missing AI configuration present in preview

**Fix**:
```json
{
  "build": {
    "production": {
      "env": {
        // ADD THESE:
        "EXPO_PUBLIC_AI_ENABLED": "true",
        "EXPO_PUBLIC_AI_STREAMING_ENABLED": "true",
        "EXPO_PUBLIC_DASH_STREAMING": "true",
        "EXPO_PUBLIC_ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022",
        "EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS": "8192"
      }
    }
  }
}
```

### 3. Local .env Missing OTA Config
**File**: `.env`  
**Issue**: No OTA environment variables for development

**Fix**: Add to `.env`:
```bash
# OTA Updates
EXPO_PUBLIC_ENABLE_OTA_UPDATES=false
EXPO_PUBLIC_ENVIRONMENT=development

# API Configuration
EXPO_PUBLIC_API_BASE=https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1
```

### 4. Test Ads in Preview
**File**: `eas.json`  
**Issue**: Preview uses test ads (should use real ads for production-like testing)

**Recommendation**:
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_ENABLE_TEST_ADS": "false",  // CHANGE from "true"
        "EXPO_PUBLIC_ENABLE_ADS": "1"
      }
    }
  }
}
```

## Complete Sync Matrix

| Variable | Development | Preview | Production | .env |
|----------|-------------|---------|------------|------|
| `EXPO_PUBLIC_ENABLE_OTA_UPDATES` | ✅ false | ❌ ADD true | ✅ true | ❌ ADD false |
| `EXPO_PUBLIC_ENVIRONMENT` | ❌ ADD | ❌ ADD | ❌ ADD | ❌ ADD |
| `EXPO_PUBLIC_API_BASE` | ❌ ADD | ✅ | ❌ ADD | ❌ ADD |
| `EXPO_PUBLIC_AI_STREAMING_ENABLED` | ✅ | ✅ | ❌ ADD | ✅ |
| `EXPO_PUBLIC_DASH_STREAMING` | ✅ | ✅ | ❌ ADD | ✅ |
| `EXPO_PUBLIC_ANTHROPIC_MODEL` | ❌ | ✅ | ❌ ADD | ❌ |
| `EXPO_PUBLIC_ENABLE_TEST_ADS` | ❌ | ⚠️ true→false | ✅ false | ✅ |

## Priority Actions

1. **HIGH**: Add OTA flag to preview environment
2. **HIGH**: Add AI streaming config to production
3. **MEDIUM**: Add environment identifiers to all builds
4. **MEDIUM**: Sync API_BASE across environments
5. **LOW**: Update .env with missing variables

## Validation After Changes

```bash
# 1. Check eas.json syntax
npm run typecheck

# 2. Verify env vars in build
eas build --platform android --profile preview --local --clear-cache

# 3. Test OTA in production build
eas update --branch production --message "Test OTA sync"

# 4. Verify Settings screen shows update check
# Navigate to: Settings → Check for Updates
```

## Related Files
- `eas.json` - Build profiles and environment variables
- `.env` - Local development environment
- `contexts/UpdatesProvider.tsx` - OTA update logic
- `app/screens/settings.tsx` - Manual update check UI

## References
- [Expo Updates Documentation](https://docs.expo.dev/versions/v53.0.0/sdk/updates/)
- [EAS Environment Variables](https://docs.expo.dev/build-reference/variables/)
- WARP.md - Environment configuration standards
