# 🎤 Wake Word Detection Fix Guide

## Current Status
- ✅ Preview build created with native Porcupine module
- ✅ Code improvements applied for better debugging
- ⏳ Testing on device needed

---

## What Was Fixed

### 1. Better Module Detection
```typescript
// OLD: Trying multiple export patterns
const PorcupineManager = PorcupineModule.PorcupineManager 
  || PorcupineModule.default?.PorcupineManager
  || PorcupineModule.default;

// NEW: Direct destructuring (correct for Picovoice v3.x)
const { PorcupineManager } = PorcupineModule;
```

### 2. Enhanced Logging
Added comprehensive logging to debug exactly where initialization fails:
- Module structure
- Available exports
- Method availability
- Initialization parameters
- Manager instance verification

### 3. Correct API Usage
Using the proper Picovoice v3.x API:
```typescript
PorcupineManager.fromKeywordPaths(
  accessKey,        // Your Picovoice access key
  [modelPath],      // Array of .ppn model files
  detectionCallback, // Called when wake word detected
  errorCallback,     // Called on errors
  undefined,         // Default language model
  [0.65]            // Sensitivity (0-1)
)
```

---

## How to Enable Wake Word

### Step 1: Enable in Settings

**Option A: Via UI (Recommended)**
1. Open the app from preview build
2. Navigate to Settings → Dash AI Settings
3. Toggle "In-App Wake Word" to **ON**
4. Restart the app

**Option B: Via Command**
```bash
# Run the helper script
npx tsx scripts/enable-wake-word.ts
```

**Option C: Via ADB**
```bash
# Enable directly via ADB
adb shell "run-as com.edudashpro sh -c 'cd /data/data/com.edudashpro/shared_prefs && cat RCTAsyncLocalStorage.xml'"
```

### Step 2: Check Logs

Watch for these log messages:

#### ✅ Success Path
```
LOG  [DashWakeWord] Porcupine module keys: [...]
LOG  [DashWakeWord] Module structure: {...}
LOG  [DashWakeWord] PorcupineManager type: function
LOG  [DashWakeWord] Hello Dash model loaded: file:///.../model.ppn
LOG  [DashWakeWord] Attempting to create PorcupineManager with:
LOG    - Access key: URNKkwhnvD...
LOG    - Model path: file:///.../model.ppn
LOG    - Sensitivity: 0.65
LOG  [DashWakeWord] PorcupineManager created successfully
LOG  [DashWakeWord] Manager instance: {hasStart: true, hasStop: true, hasDelete: true}
LOG  [DashWakeWord] Wake word listening started successfully
LOG  [DashWakeWord] Listening for "Hello Dash"...
```

#### 🎉 Detection
```
LOG  [DashWakeWord] Wake word "Hello Dash" detected! Index: 0
```

#### ❌ Failure Indicators
```
ERROR [DashWakeWord] Native Porcupine module not linked
ERROR [DashWakeWord] PorcupineManager not found in module exports
ERROR [DashWakeWord] No Picovoice access key provided
ERROR [DashWakeWord] PorcupineManager initialization failed
```

### Step 3: Test
1. Keep app in foreground (wake word only works when app is active)
2. Say clearly: **"Hello Dash"**
3. Should navigate to Dash Assistant automatically

---

## Troubleshooting

### Issue: "Native Porcupine module not linked"

**Cause**: Preview build didn't include native module

**Fix**:
```bash
# Rebuild preview APK
eas build --platform android --profile preview

# Wait for build to complete
# Download and install new APK
```

### Issue: "No Picovoice access key provided"

**Cause**: Environment variable not set

**Fix**:
```bash
# Check .env file
cat .env | grep PICOVOICE

# Should show:
# EXPO_PUBLIC_PICOVOICE_ACCESS_KEY=URNKkwhnvD971sBH70hcUHWlvN8VziwKRU4sKiwbwIFq54L9ckgN8g==

# If missing, add it and rebuild
```

### Issue: "Failed to load Hello Dash model"

**Cause**: Model file not bundled or wrong path

**Fix**:
```bash
# Verify model files exist
ls -la assets/wake-words/

# Should show:
# hello-dash_en_android_v3_0_0.ppn
# Hello-Dash_en_linux_v3_0_0.ppn

# If missing, get from Picovoice Console
```

### Issue: "PorcupineManager.fromKeywordPaths is not a function"

**Cause**: Wrong Picovoice version or API change

**Fix**: Check installed version:
```bash
npm list @picovoice/porcupine-react-native
# Should be: @picovoice/porcupine-react-native@3.0.4

# If different version:
npm install @picovoice/porcupine-react-native@3.0.4
eas build --platform android --profile preview
```

### Issue: "Wake word detected but nothing happens"

**Cause**: Navigation issue

**Check**:
1. Detection callback fires (`console.log` shows detection)
2. Navigation is triggered
3. Dash Assistant screen exists at `/screens/dash-assistant`

**Fix**: Check navigation logs and verify route exists

---

## Testing Checklist

- [ ] Preview APK installed on device
- [ ] Wake word toggle enabled in settings
- [ ] App restarted after enabling
- [ ] Microphone permission granted
- [ ] App in foreground (not background)
- [ ] Check logs show initialization success
- [ ] Say "Hello Dash" clearly
- [ ] Detection logged in console
- [ ] Navigates to Dash Assistant

---

## Alternative: Manual Button

If wake word still doesn't work, users can:
1. Open Dash Assistant manually
2. Press microphone button
3. Record voice message
4. Get AI response

**Wake word is a nice-to-have, not critical** ✅

---

## Next Steps

### After This Fix Works:
1. ✅ Test wake word detection
2. ✅ Fine-tune sensitivity if needed
3. ✅ Add visual feedback (listening indicator)
4. ✅ Document for users
5. 🎯 Consider background wake word (advanced)

### If Still Not Working:
1. Share full logs from app launch to detection attempt
2. Verify Picovoice account is active
3. Try built-in keywords first (`hey siri`, `ok google` equivalent)
4. Contact Picovoice support if needed

---

## Files Modified

- ✅ `components/ai/DashWakeWordListener.tsx` - Better error handling and logging
- ✅ `scripts/enable-wake-word.ts` - Helper to enable feature
- ✅ `WAKE_WORD_FIX.md` - This comprehensive guide

---

**Status**: 🔧 Fixed and ready for testing  
**Action**: Install preview build, enable toggle, test "Hello Dash"