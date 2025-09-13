# Build Troubleshooting Guide

This guide documents common build issues and their solutions for the EduDash Pro project.

## Recent Issues Fixed

### ✅ FIXED: React Native Document Picker Compatibility Issue

**Error**: `GuardedResultAsyncTask` class not found in `react-native-document-picker`

**Root Cause**: Using both `react-native-document-picker` and `expo-document-picker` created conflicts. React Native Document Picker is incompatible with newer React Native versions and Expo managed workflow.

**Solution**:
1. Removed `react-native-document-picker` and `@types/react-native-document-picker`
2. Use only `expo-document-picker` (which is the correct approach for Expo projects)
3. Ran `npx expo install --fix` to ensure SDK compatibility
4. Ran `npx expo prebuild --clean` to regenerate native configurations

### ✅ FIXED: Google Mobile Ads Configuration Warning

**Warning**: `react-native-google-mobile-ads requires an 'android_app_id' property inside a 'react-native-google-mobile-ads' key in your app.json`

**Solution**: Added the correct configuration format to `app.json`:
```json
{
  "expo": {
    "plugins": [
      ["react-native-google-mobile-ads", {
        "androidAppId": "ca-app-pub-3940256099942544~3347511713",
        "iosAppId": "ca-app-pub-3940256099942544~1458002511",
        "androidManifestApplicationMetaData": {
          "com.google.android.gms.ads.APPLICATION_ID": "ca-app-pub-3940256099942544~3347511713"
        }
      }]
    ],
    "react-native-google-mobile-ads": {
      "android_app_id": "ca-app-pub-3940256099942544~3347511713",
      "ios_app_id": "ca-app-pub-3940256099942544~1458002511"
    }
  }
}
```

## General Build Troubleshooting Steps

### 1. Package Compatibility Issues

**When you see**: Compilation errors related to missing classes or incompatible APIs

**Steps to resolve**:
1. Check if you're mixing React Native and Expo packages
2. Prefer Expo packages over React Native equivalents when using Expo managed workflow
3. Run `npx expo install --fix` to ensure SDK compatibility
4. Remove conflicting packages: `npm uninstall <package-name>`

### 2. Clean Build Issues

**When you see**: CMake errors, autolinking issues, or cached build problems

**Steps to resolve**:
```bash
# Clean everything
rm -rf node_modules package-lock.json
rm -rf android/.gradle android/app/build android/build android/app/.cxx
npm install
npx expo install --fix
npx expo prebuild --clean
cd android && ./gradlew clean
cd android && ./gradlew assembleDebug
```

### 3. Configuration Issues

**When you see**: Plugin configuration warnings or missing metadata

**Steps to resolve**:
1. Check `app.json` for correct plugin configurations
2. Ensure both plugin format AND top-level configurations are present if required
3. Use test/debug IDs during development
4. Run `npx expo prebuild --clean` after configuration changes

## Best Practices to Avoid Build Issues

### 1. Package Management
- ✅ Use `npx expo install <package>` instead of `npm install` for Expo-compatible packages
- ✅ Always prefer Expo packages over React Native equivalents
- ✅ Run `npx expo install --fix` after adding new packages
- ❌ Don't mix React Native and Expo packages for the same functionality

### 2. Build Process
- ✅ Use `npx expo prebuild --clean` when changing native configurations
- ✅ Clean builds when switching branches or after major changes
- ✅ Test builds after adding new native dependencies
- ❌ Don't ignore build warnings - address them proactively

### 3. Configuration Management
- ✅ Keep `app.json` configurations complete and up-to-date
- ✅ Use environment variables for sensitive configuration
- ✅ Document any custom native configurations
- ❌ Don't modify generated native code directly

### 4. Version Management
- ✅ Keep Expo SDK versions in sync across all packages
- ✅ Update packages regularly but test thoroughly
- ✅ Check compatibility matrices before updating
- ❌ Don't update React Native version manually in Expo projects

## Common Warning Categories (Safe to Ignore)

### 1. Deprecation Warnings
- Kotlin/Java deprecation warnings about Android APIs
- React Native deprecation warnings about components
- These are usually safe to ignore during development

### 2. Dollar Sign Identifier Warnings
- C++ warnings about `$` in generated code identifiers
- These are from codegen and don't affect functionality

### 3. Plugin Configuration Warnings
- When using Expo config plugins, certain warnings can be ignored
- Check plugin documentation for which warnings are expected

## Emergency Build Recovery

If builds are completely broken:

```bash
# Nuclear option - completely clean and rebuild
git clean -fdx
git checkout .
npm install
npx expo install --fix
npx expo prebuild --clean --clear
cd android && ./gradlew clean
cd android && ./gradlew assembleDebug
```

## Useful Commands

### Check package compatibility:
```bash
npx expo install --fix
```

### Clean and rebuild native projects:
```bash
npx expo prebuild --clean
```

### Build with verbose output:
```bash
cd android && ./gradlew assembleDebug --info
```

### Check Expo configuration:
```bash
npx expo config
```

## Resources

- [Expo SDK Compatibility](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [Android Build Troubleshooting](https://developer.android.com/studio/build/troubleshoot)