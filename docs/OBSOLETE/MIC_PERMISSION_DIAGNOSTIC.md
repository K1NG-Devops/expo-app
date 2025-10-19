# Microphone Permission Diagnostic Guide

## 🎤 Issue: Cannot Record Audio

### Step 1: Check App Logs
Look for these log messages when trying to record:

```
✅ GOOD - Permission granted:
LOG  [Dash] Checking audio permission status...
LOG  [Dash] Audio permission status: granted
LOG  [Dash] Audio permission already granted (cached)
LOG  [Dash] Configuring audio mode for recording...
LOG  [Dash] Audio mode configured for recording
LOG  [Dash] Starting recording...
LOG  [Dash] Recording started

❌ BAD - Permission denied:
LOG  [Dash] Checking audio permission status...
LOG  [Dash] Audio permission status: denied
WARN [Dash] ❌ Audio permission DENIED by user
ERROR Microphone permission is required...

❌ BAD - Permission not requested:
LOG  [Dash] Permission not granted, requesting from user...
(No permission dialog appears)
```

---

## Step 2: Check Android Settings

### Option A: Via Settings App
1. Open **Settings** on your Android device
2. Go to **Apps** or **Applications**
3. Find **EduDash Pro** (or your app name)
4. Tap **Permissions**
5. Look for **Microphone**
6. Make sure it's set to **Allow** or **Allow only while using the app**

### Option B: Via App Info
1. Long-press the EduDash Pro app icon
2. Tap **App Info** (ℹ️)
3. Tap **Permissions**
4. Tap **Microphone**
5. Select **Allow only while using the app**

---

## Step 3: Clear Permission Cache

Sometimes Android caches permission denials. To reset:

### Method 1: Clear App Data (Recommended)
```bash
# Via ADB
adb shell pm clear com.edudashpro

# OR manually on device:
# Settings > Apps > EduDash Pro > Storage > Clear Data
```

### Method 2: Reinstall App
```bash
# Uninstall
adb uninstall com.edudashpro

# Rebuild and install
cd /home/king/Desktop/edudashpro
npx expo run:android
```

---

## Step 4: Verify AndroidManifest.xml

Check that the permission is declared:

```bash
cat android/app/src/main/AndroidManifest.xml | grep RECORD_AUDIO
```

**Expected output:**
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

✅ **Confirmed:** This is already present in your AndroidManifest.xml

---

## Step 5: Test Permission Request

Add this test code to debug permission flow:

```typescript
// In your component, add a test button:
import { Audio } from 'expo-av';

const testPermissions = async () => {
  console.log('🔍 Testing microphone permissions...');
  
  // Get current status
  const current = await Audio.getPermissionsAsync();
  console.log('Current permission:', current);
  
  // Request permission
  const result = await Audio.requestPermissionsAsync();
  console.log('Request result:', result);
  
  if (result.granted) {
    console.log('✅ Permission GRANTED');
  } else {
    console.log('❌ Permission DENIED');
    if (result.canAskAgain === false) {
      console.log('⚠️ User selected "Don\'t ask again" - must enable in settings');
    }
  }
};

// Call it:
<Button onPress={testPermissions} title="Test Mic Permission" />
```

---

## Step 6: Check for Permission Blockers

### A. Check Build Configuration
```bash
# Verify expo-av is installed
grep "expo-av" package.json

# Should show:
# "expo-av": "~14.0.7" (or similar)
```

### B. Check Android API Level
```bash
# Check minimum SDK version
grep minSdkVersion android/build.gradle

# Should be: minSdkVersion = 23 or higher
```

### C. Rebuild Native Code
```bash
cd /home/king/Desktop/edudashpro

# Clean build
rm -rf android/build
rm -rf android/app/build

# Rebuild
npx expo prebuild --clean
npx expo run:android
```

---

## Step 7: Common Issues & Solutions

### Issue 1: Permission Dialog Never Appears
**Cause:** User previously denied and selected "Don't ask again"

**Solution:**
1. Go to device Settings > Apps > EduDash Pro > Permissions
2. Manually enable Microphone
3. Restart the app

### Issue 2: Permission Granted but Recording Fails
**Cause:** Audio mode not configured

**Solution:** Already fixed in latest code update! The audio mode is now configured right before recording.

### Issue 3: Works in Emulator but Not on Device
**Cause:** Different Android versions handle permissions differently

**Solution:**
- Emulator: Android 13+ (API 33)
- Device: Check Android version
- Permissions work differently on Android 6-12

### Issue 4: Permission Prompt Appears But Immediately Fails
**Cause:** Another app is using the microphone

**Solution:**
1. Close all apps that might use the mic (WhatsApp calls, voice recorders, etc.)
2. Restart the device
3. Try again

---

## Step 8: Force Request Permission

Add this to your VoiceRecorderSheet or wherever you start recording:

```typescript
// Before starting recording
const forceRequestPermission = async () => {
  console.log('🎤 Forcing permission request...');
  
  try {
    const { granted, canAskAgain } = await Audio.requestPermissionsAsync();
    
    if (!granted && !canAskAgain) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in Settings > Apps > EduDash Pro > Permissions',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return false;
    }
    
    return granted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
};
```

---

## Step 9: ADB Logcat Debugging

Monitor Android system logs:

```bash
# Filter for audio/permission logs
adb logcat | grep -E "(Audio|Permission|Microphone|RECORD)"

# Or save to file
adb logcat > audio_logs.txt
# Then press Ctrl+C after testing
```

Look for errors like:
- `Permission denial`
- `Audio session failed`
- `MediaRecorder error`

---

## Step 10: Nuclear Option - Fresh Install

If nothing works:

```bash
# 1. Uninstall completely
adb uninstall com.edudashpro

# 2. Clear all cached data
cd ~/Desktop/edudashpro
rm -rf node_modules
rm -rf android/build
rm -rf android/app/build
rm -rf .expo
rm -rf ios

# 3. Reinstall dependencies
npm install

# 4. Prebuild fresh
npx expo prebuild --clean

# 5. Build and install
npx expo run:android

# 6. When app opens, immediately test microphone
```

---

## ✅ Expected Working Flow

When permissions work correctly, you should see:

```
[Dash] Checking audio permission status...
[Dash] Permission not granted, requesting from user...
[Dash] Platform: android
[Dash] Permission result: { granted: true, ... }
[Dash] ✅ Audio permission GRANTED by user
[Dash] Configuring audio mode for recording...
[Dash] Audio mode configured for recording
[Dash] Starting recording...
[Dash] Recording started
```

---

## 🆘 Still Not Working?

If you've tried everything above:

1. **Share your logs:**
   - Run `adb logcat > full_logs.txt`
   - Try to record
   - Stop logcat (Ctrl+C)
   - Share full_logs.txt

2. **Device info:**
   - Android version?
   - Device manufacturer/model?
   - Previously worked or never worked?

3. **Check system permissions:**
   ```bash
   adb shell pm list permissions | grep RECORD
   ```

4. **Test with another app:**
   - Try Android's built-in Sound Recorder
   - If that fails too, it's a device/Android issue, not app issue

---

## 📱 Quick Test Command

Run this to test permission from command line:

```bash
adb shell cmd appops set com.edudashpro RECORD_AUDIO allow
adb shell am force-stop com.edudashpro
adb shell am start -n com.edudashpro/.MainActivity
```

This manually grants permission and restarts the app.
