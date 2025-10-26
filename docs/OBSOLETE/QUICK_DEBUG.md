# Quick Debug Reference

## 🚀 Fast Track - Trace the Error in 3 Commands

### Option 1: Automated Script (Recommended)
```bash
# Run the automated debug script
./debug-trace.sh
```

This script will:
1. Check device connection
2. Let you choose build type (dev/preview/skip)
3. Build and install the app
4. Start capturing logs
5. Automatically analyze errors when you press Ctrl+C

### Option 2: Manual Commands

**Terminal 1 - Start Metro (for dev builds):**
```bash
npm run start:clear
```

**Terminal 2 - Build & Install:**
```bash
# Development build
npm run android

# OR Preview build
eas build --platform android --profile preview --local
adb install -r <path-to-apk>
```

**Terminal 3 - Capture Logs:**
```bash
# Clear logs and start fresh capture
adb logcat -c

# Watch for errors in real-time
adb logcat | grep -E "ReactNativeJS|SessionManager|SIGN IN|ERROR"

# Or save to file
adb logcat > ~/Desktop/debug-$(date +%Y%m%d-%H%M%S).log
```

---

## 📋 What to Look For

### In the Logs

**1. Sign-In Error Block:**
```
=== SIGN IN ERROR DEBUG ===
Error object: [Object object]
Error name: TypeError
Error message: Cannot read property 'X' of undefined
Error stack: ...
```

**2. SessionManager Errors:**
```
[SessionManager] signInWithSession called for: user@example.com
[SessionManager] Supabase auth error: Invalid credentials
[SessionManager] Storage error: QuotaExceededError
[SessionManager] Failed to load user profile for user: xxx
```

**3. Session Restoration:**
```
=== SESSION RESTORATION DEBUG ===
Stored session exists: true
Stored profile exists: false  ← Problem here!
```

**4. Storage Errors:**
```
Storage failed: QuotaExceededError: Storage limit exceeded
Storage failed: Cannot access SecureStore
```

---

## 🎯 Most Likely Error Sources

Based on your description ("Unexpected error after restart"), the error is probably:

### 1. Storage Failure (60% probability)
**Symptom:** Works on first sign-in, fails after restart
**Cause:** Session/profile not saving properly to AsyncStorage or SecureStore
**Log pattern:**
```
[SessionManager] Storage error: ...
Storage failed: ...
```

### 2. Profile Loading Failure (30% probability)
**Symptom:** Session restored but profile missing
**Cause:** Database query fails or returns null
**Log pattern:**
```
[SessionManager] Failed to load user profile
Profile role: undefined
```

### 3. Routing Error (10% probability)
**Symptom:** Session and profile OK but navigation fails
**Cause:** Router not ready or invalid route
**Log pattern:**
```
Navigation failed, falling back to profiles-gate
Post-login routing failed: ...
```

---

## 🔧 Quick Fixes to Test

### If Storage Error:
```bash
# Clear app data and retry
adb shell pm clear com.edudashpro

# Check available storage
adb shell df /data
```

### If Profile Loading Error:
Check Supabase RLS policies or database connection

### If Routing Error:
The recent logout fix should have addressed this

---

## 📊 Quick Health Check

**Before reproducing the error:**
```bash
# 1. Device connected?
adb devices

# 2. App installed?
adb shell pm list packages | grep edudashpro

# 3. Storage available?
adb shell df /data | tail -n 1
```

---

## 🎬 Reproduction Steps

1. **Initial sign-in:** Should work fine
2. **Close app:** Swipe from recents (don't just background)
3. **Reopen app:** This is when error appears
4. **Capture logs:** Look for the error block in logs

---

## 📤 What to Share

After running the script or capturing logs, share:

1. **The log file** from `~/Desktop/edudashpro-debug-logs/`
2. **Specific error message** from "SIGN IN ERROR DEBUG" block
3. **Session restoration output** showing session/profile state
4. **Any storage-related errors**

---

## ⚡ Speed Tips

**Skip rebuild if code hasn't changed:**
```bash
./debug-trace.sh
# Choose option 3: "Skip build"
```

**Just capture logs from running app:**
```bash
adb logcat -c
adb logcat | grep -E "ReactNativeJS|ERROR" | tee ~/Desktop/quick-log.txt
```

**Search existing logs:**
```bash
# In the debug logs directory
cd ~/Desktop/edudashpro-debug-logs
grep -r "SIGN IN ERROR" .
grep -r "Storage failed" .
```

---

## 🆘 If Script Fails

**Common issues:**

```bash
# No device connected
adb devices
# If nothing shown, enable USB debugging on device

# Build fails
npm install  # Reinstall dependencies
npx expo-doctor  # Check for issues

# Can't find adb
which adb
# If not found: sudo apt-get install adb

# Metro bundler issues
pkill -f metro  # Kill all metro processes
npm run start:clear  # Start fresh
```

---

## 💡 Pro Tips

1. **Use development build** for fastest iteration
2. **Clear app data** between tests for clean state
3. **Watch logs in real-time** to catch errors as they happen
4. **Save logs to file** for later analysis
5. **Check both Metro and logcat** output

---

## 🎯 Expected Timeline

- **Setup:** 2 minutes
- **Build (dev):** 5-10 minutes
- **Build (preview):** 15-20 minutes  
- **Log capture:** 2-5 minutes
- **Analysis:** 5-10 minutes

**Total: 15-30 minutes to pinpoint exact error**

---

## Next Step

Run the debug script now:
```bash
./debug-trace.sh
```

Then share the logs and I'll identify the exact fix needed!
