# EAS/Expo Managed Configuration Migration 🎯

## Current State Analysis

**Good News**: Your app is **already using Expo's managed workflow**! ✅
- ✅ No `android/` or `ios/` directories (fully managed)
- ✅ Using EAS Build for compilation
- ✅ Using Expo's plugin system
- ✅ No custom native code

## What We're Simplifying

### 1. Configuration Files Status

| File | Status | Action |
|------|--------|--------|
| `app.json` | ✅ EAS Standard | Keep (but make it primary source) |
| `app.config.js` | ⚠️ Has custom logic | Simplify (remove unnecessary complexity) |
| `eas.json` | ✅ EAS Standard | Keep (perfect as-is) |
| `metro.config.js` | ⚠️ Has customizations | Simplify (keep only essentials) |
| `babel.config.js` | ⚠️ Has plugins | Simplify (use Expo defaults) |
| `babel.config.production.js` | ❌ Duplicate | Remove |

### 2. Identified Custom Settings to Remove/Simplify

#### `app.config.js` - Unnecessary Complexity
```javascript
// ❌ REMOVING: Complex Google Services file detection
googleServicesFile: fs.existsSync(...) ? './app/google-services.json' : ...

// ❌ REMOVING: Redundant config (already in app.json)
// Most static values are duplicated

// ✅ KEEPING: Dynamic AdMob IDs from environment (needed)
// ✅ KEEPING: Conditional expo-dev-client loading (needed for OTA)
```

#### `metro.config.js` - Over-Engineered
```javascript
// ❌ REMOVING: Manual blocklist for test files (Expo handles this)
// ❌ REMOVING: Custom web stub for ads (Expo can handle)
// ❌ REMOVING: Manual minifier config (use Expo defaults)

// ✅ KEEPING: JSON as source files (for i18n locales)
// ✅ KEEPING: Platform resolver (ios, android, web)
```

#### `babel.config.js` - Redundant Plugins
```javascript
// ❌ REMOVING: Manual console stripping (Expo handles in production)
// ❌ REMOVING: Manual environment variable transforms (Expo built-in)

// ✅ KEEPING: module-resolver (for @ alias)
// ✅ KEEPING: react-native-reanimated plugin (required)
```

## Migration Plan

### Phase 1: Simplify app.config.js ✅

**Before**: 158 lines with complex logic
**After**: ~80 lines with minimal dynamic logic

**Changes**:
1. Remove Google Services file detection (not needed)
2. Remove duplicate static config (use app.json)
3. Keep only truly dynamic parts:
   - Environment-based AdMob IDs
   - Conditional expo-dev-client plugin
   - Runtime version management

### Phase 2: Simplify metro.config.js ✅

**Before**: 79 lines with custom blocking and transforms
**After**: ~30 lines with Expo defaults

**Changes**:
1. Use Expo's default config
2. Keep only JSON-as-source for i18n
3. Remove custom minifier (trust Expo)
4. Remove manual blocklist (Expo handles)

### Phase 3: Simplify babel.config.js ✅

**Before**: Two config files with duplicate logic
**After**: One simple config

**Changes**:
1. Delete `babel.config.production.js`
2. Use `babel-preset-expo` (handles everything)
3. Keep only required plugins:
   - module-resolver (@ alias)
   - react-native-reanimated (required by lib)

### Phase 4: Update app.json ✅

**Changes**:
1. Add missing plugins from app.config.js:
   - expo-audio
   - react-native-webrtc
2. Ensure consistency with app.config.js
3. Make it the primary source of truth

## New Simplified Structure

### Minimal app.config.js
```javascript
// Only dynamic config that MUST be dynamic
module.exports = ({ config }) => {
  const isDevBuild = process.env.EAS_BUILD_PROFILE === 'development';
  
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Conditionally add expo-dev-client for dev builds only
      ...(isDevBuild ? ['expo-dev-client'] : []),
    ],
  };
};
```

### Minimal metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Only essential customization: JSON files as source (for i18n)
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'json');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'json'];

module.exports = config;
```

### Minimal babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        alias: { '@': './' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
```

## Benefits of Simplified Config ✅

1. **Less Maintenance**: Expo handles updates automatically
2. **Better Compatibility**: Using Expo standards ensures compatibility
3. **Faster Builds**: Less custom logic = faster compilation
4. **Easier Debugging**: Standard configs are well-documented
5. **Auto-Updates**: Expo can optimize configs in future SDK updates

## What Stays EAS-Managed

All of these are **already EAS-managed** (no changes needed):

✅ **Build Process**: `eas.json` controls everything
- Development, preview, production profiles
- Environment variables
- Build types (APK, AAB)
- Credential management (remote)

✅ **Native Code**: Expo plugins handle everything
- Permissions (via app.json)
- Native modules (via plugins array)
- iOS entitlements (via Expo)
- Android manifest (via Expo)

✅ **OTA Updates**: Expo Updates system
- Runtime version management
- Update channels (dev, preview, production)
- Update URL configured

✅ **Asset Management**: Expo handles
- Icons, splash screens
- Fonts, localization files
- Image optimization

## Risks & Mitigations

### Risk 1: Breaking Changes
**Mitigation**: Test builds after each phase
- Run `eas build --profile preview` after changes
- Test on Android emulator/device
- Validate all features work

### Risk 2: AdMob Configuration
**Mitigation**: Environment variables still work
- AdMob IDs moved to eas.json env vars
- Plugin config in app.json
- No functionality lost

### Risk 3: Development Workflow
**Mitigation**: expo-dev-client still conditional
- Still excluded from production builds
- OTA updates still work
- No dev experience changes

## Testing Checklist

After migration, verify:

- [ ] `npx expo prebuild --clean` runs successfully
- [ ] `eas build --profile development` succeeds
- [ ] `eas build --profile preview` succeeds
- [ ] Dev client launches correctly
- [ ] OTA updates work
- [ ] AdMob loads correctly
- [ ] Voice features work (Picovoice/WebRTC)
- [ ] i18n locales load
- [ ] All screens render
- [ ] No runtime errors

## Rollback Plan

If anything breaks:
1. All original files backed up to `docs/OBSOLETE/config-backup/`
2. Simply restore from backup
3. No native code changes = safe rollback

---

**Ready to proceed?** This migration will make your app **cleaner, faster, and more maintainable** while staying 100% EAS/Expo managed! 🚀
