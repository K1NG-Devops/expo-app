# Dash AI Voice Recording Debug Guide (2025-10-14)

**Date**: 2025-10-14  
**Issues**: 
1. ✅ FIXED: Conversation UI inverted (messages going wrong direction)
2. ⚠️ DEBUGGING: Voice recorder modal not appearing
3. ⚠️ DEBUGGING: WebRTC realtime voice failing

---

## ✅ Fixed Issues

### 1. Conversation UI Direction
**Problem**: Messages appearing in wrong order, scrolling upward

**Solution**: Removed `inverted={true}` from FlatList and added auto-scroll
- File: `components/ai/DashAssistant.tsx`
- Lines: 1253-1280
- Change: Removed array reversal, removed inverted prop, added onContentSizeChange scroll

**Verification**:
```typescript
// Should now show:
// - Oldest messages at top
// - Newest messages at bottom
// - Thinking indicator at bottom
// - Natural scroll direction
```

---

## ⚠️ Debugging: Voice Recorder Modal

### Current Behavior
- Tapping microphone icon doesn't open the modal
- No visual feedback
- May be related to streaming vs non-streaming mode

### Debug Logging Added

**Files Modified**:
1. `components/ai/DashAssistant.tsx` (lines 185-202, 1337-1368)
2. `components/ai/EnhancedInputArea.tsx` (lines 233-248)
3. `components/ai/VoiceRecorderSheet.tsx` (lines 19-22)

**What to Check in Logs**:

```bash
# When you tap the mic button, you should see:
[EnhancedInputArea] Mic tapped {isVoiceLocked: false, voiceState: 'idle'}
[EnhancedInputArea] Starting voice recording
[DashAssistant] Voice start triggered {streamingEnabled: false, dashInstance: true, isInitialized: true, ...}
[DashAssistant] Opening voice recorder modal
[DashAssistant] Dash ready - showing modal immediately
[DashAssistant] Voice recorder modal state changed: true
[VoiceRecorderSheet] Component mounted/updated {visible: true, dash: true}
```

### Diagnostic Steps

#### Step 1: Check Streaming Mode
```bash
# Check your .env file:
cat .env | grep EXPO_PUBLIC_DASH_STREAMING
```

**Expected**: `EXPO_PUBLIC_DASH_STREAMING=false` (or not set)

**If true**: The app will use WebRTC streaming instead of the modal

#### Step 2: Run the App and Tap Mic
```bash
npm run dev:android
```

**Check the logs** for the messages above. Note what's missing:

| Log Message | Meaning | If Missing |
|-------------|---------|------------|
| `[EnhancedInputArea] Mic tapped` | Button tap detected | TouchableOpacity not responding |
| `[EnhancedInputArea] Starting voice recording` | Starting logic triggered | voiceState condition failing |
| `[DashAssistant] Voice start triggered` | onVoiceStart called | Callback not wired up |
| `[DashAssistant] Opening voice recorder modal` | streamingEnabled is false | Check env variable |
| `[DashAssistant] Dash ready - showing modal` | dashInstance ready | Initialization issue |
| `[DashAssistant] Voice recorder modal state changed: true` | State updated | setState not working |
| `[VoiceRecorderSheet] Component mounted` | Modal rendered | Conditional render failing |

#### Step 3: Check Dash Initialization
Add this log after tapping mic:
```typescript
console.log('[DEBUG] Dash Status:', {
  dashInstance: !!dashInstance,
  isInitialized,
  streamingEnabled,
  showVoiceRecorderModal,
  pendingVoiceModal
});
```

#### Step 4: Force Modal Open (Test)
Add a test button to force modal open:
```typescript
// In DashAssistant.tsx header, add:
<TouchableOpacity
  style={styles.iconButton}
  onPress={() => {
    console.log('[TEST] Forcing modal open');
    setShowVoiceRecorderModal(true);
  }}
>
  <Ionicons name="bug" size={22} color={theme.text} />
</TouchableOpacity>
```

If modal opens with test button but not with mic:
- **Issue is in the mic tap flow**
- Check `EnhancedInputArea` gesture handler
- Check `voiceState` prop being passed

If modal doesn't open even with test button:
- **Issue is in modal render logic**
- Check conditional: `dashInstance && isInitialized`
- Check if `VoiceRecorderSheet` is properly imported

---

## ⚠️ Debugging: WebRTC Realtime Voice

### Current Behavior
```
WARN [webrtcProvider] start failed: SDP exchange failed: 401
ERROR getUserMedia failed: Cannot read property 'getUserMedia' of undefined
```

### Root Causes

#### Issue 1: 401 Unauthorized (SDP Exchange)
**Problem**: WebRTC signaling authentication failing

**Check**:
1. Supabase session token valid
2. Edge Function WebRTC endpoint permissions
3. TURN/STUN server credentials

**Files to Check**:
- `hooks/useRealtimeVoice.ts` - token provider
- `supabase/functions/webrtc-signaling/` - if exists

#### Issue 2: getUserMedia Undefined
**Problem**: `navigator.mediaDevices.getUserMedia` not available

**Possible Causes**:
1. **Missing polyfill** - React Native needs `react-native-webrtc` package
2. **Permissions** - Microphone permission not granted
3. **Platform mismatch** - Web API used in native context without polyfill

**Solution**:
```bash
# Check if react-native-webrtc is installed:
npm list react-native-webrtc

# If not installed:
npm install react-native-webrtc
npx pod-install  # iOS only
```

**Then add to your app**:
```typescript
// At top of useRealtimeVoice.ts or App.tsx:
import { mediaDevices } from 'react-native-webrtc';

// Polyfill navigator.mediaDevices if not present:
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  navigator.mediaDevices = mediaDevices as any;
}
```

#### Issue 3: Permissions
**Check microphone permissions**:

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**Runtime permission request**:
```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestMicrophonePermission() {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Dash needs access to your microphone for voice messages',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true; // iOS handles via Info.plist
}
```

---

## 🔧 Quick Fixes to Try

### Fix 1: Disable Streaming Mode (Use Modal Instead)
```bash
# In .env file:
EXPO_PUBLIC_DASH_STREAMING=false
```

**Then restart**:
```bash
# Kill the app and restart
npm run start:clear
npm run dev:android
```

### Fix 2: Add Microphone Permission Check
Add to `DashAssistant.tsx` before opening modal:
```typescript
import * as Permissions from 'expo-permissions';

const checkMicPermission = async () => {
  const { status } = await Permissions.getAsync(Permissions.AUDIO_RECORDING);
  if (status !== 'granted') {
    const { status: newStatus } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
    return newStatus === 'granted';
  }
  return true;
};

// In onVoiceStart:
const hasPermission = await checkMicPermission();
if (!hasPermission) {
  Alert.alert('Permission Required', 'Please enable microphone access');
  return;
}
```

### Fix 3: Simplify Modal Trigger
Replace the complex logic with simple state:
```typescript
onVoiceStart={() => {
  console.log('[DashAssistant] Opening modal directly');
  setShowVoiceRecorderModal(true);
}}
```

---

## 📊 Testing Checklist

### Before Testing
- [ ] .env has `EXPO_PUBLIC_DASH_STREAMING=false`
- [ ] App restarted with `npm run start:clear`
- [ ] Android device connected or emulator running
- [ ] Microphone permission granted on device

### During Testing
- [ ] Tap mic button
- [ ] Check logs for debug messages
- [ ] Verify modal appears
- [ ] Test recording (if modal opens)
- [ ] Test transcription
- [ ] Test sending message

### Log Each Step
```bash
# Save logs to file:
npm run dev:android 2>&1 | tee dash-debug.log

# Then tap mic and send the log file for review
```

---

## 🎯 Expected Working Flow

### Non-Streaming Mode (Modal)
```
1. User taps mic button
   → [EnhancedInputArea] Mic tapped
   
2. onVoiceStart() called
   → [DashAssistant] Voice start triggered
   → [DashAssistant] Opening voice recorder modal
   
3. Modal state updated
   → [DashAssistant] Voice recorder modal state changed: true
   
4. VoiceRecorderSheet renders
   → [VoiceRecorderSheet] Component mounted/updated {visible: true}
   → Modal appears with "Listening..." header
   
5. Recording starts automatically
   → [VoiceRecorderSheet] Recording started
   → Timer counts up: 00:00, 00:01, 00:02...
   
6. User taps "Stop" button
   → [VoiceRecorderSheet] Stopping recording
   → [VoiceRecorderSheet] Transcribing...
   
7. Preview shown
   → [VoiceRecorderSheet] Preview phase
   → User sees transcript
   
8. User taps "Send"
   → Message sent to conversation
   → Modal closes
```

### Streaming Mode (WebRTC)
```
1. User taps mic button
   → [EnhancedInputArea] Mic tapped
   
2. onVoiceStart() called
   → [DashAssistant] Voice start triggered
   → [DashAssistant] Starting realtime stream
   
3. WebRTC connection initiated
   → [useRealtimeVoice] Connecting to WebSocket
   → [useRealtimeVoice] SDP exchange
   
4. getUserMedia called
   → Browser/RN requests microphone access
   → Audio stream starts
   
5. Real-time transcription
   → [useRealtimeVoice] Partial transcript: "Hello..."
   → [useRealtimeVoice] Partial transcript: "Hello, how are..."
   
6. AI responds in real-time
   → [useRealtimeVoice] Assistant token: "I'm..."
   → [useRealtimeVoice] Assistant token: "I'm doing..."
```

---

## 🚨 Common Issues & Solutions

### Issue: "Modal briefly flashes then disappears"
**Cause**: Modal state being reset immediately after opening

**Fix**: Check for competing state updates
```typescript
// Look for code that might close modal:
useEffect(() => {
  if (someCondition) {
    setShowVoiceRecorderModal(false); // ❌ This might be firing
  }
}, [dependency]);
```

### Issue: "Nothing happens when tapping mic"
**Cause**: Event not reaching handler

**Fix**: Check TouchableOpacity props
```typescript
// Make sure disabled prop is not true:
<TouchableOpacity
  disabled={false}  // ← Check this
  onPress={onVoiceStart}
/>
```

### Issue: "Modal opens but recording fails"
**Cause**: Dash instance method failing

**Fix**: Add try-catch and better error handling
```typescript
try {
  await dash.startRecording();
} catch (e) {
  console.error('[VoiceRecorderSheet] Start recording failed:', e);
  Alert.alert('Recording Failed', e.message);
  onClose();
}
```

---

## 📝 Files Modified (Summary)

| File | Changes | Purpose |
|------|---------|---------|
| `components/ai/DashAssistant.tsx` | Removed inverted, added logging | Fix UI direction, debug modal |
| `components/ai/EnhancedInputArea.tsx` | Added logging, simplified tap | Debug mic tap flow |
| `components/ai/VoiceRecorderSheet.tsx` | Added logging | Debug modal mounting |
| `supabase/functions/ai-gateway/index.ts` | Added dev mode | Relax rate limits |

---

## 🔍 Next Steps

1. **Run the app** with logging enabled
2. **Tap the mic button**
3. **Copy the console logs** and review against expected flow above
4. **Identify which log message is missing**
5. **Focus debugging on that specific component**

If you share the logs, I can pinpoint exactly where the flow is breaking!

---

*All changes follow EduDash Pro governance rules and WARP.md standards.*
