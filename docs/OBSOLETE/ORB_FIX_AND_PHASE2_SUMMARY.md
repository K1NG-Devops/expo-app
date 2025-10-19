# Orb Not Responding Fix + Phase 2 Audio Review

## Issue: Orb Hears Voice But Doesn't Respond

### Root Cause
The DashVoiceMode ("orb") was **silently failing** when trying to send transcribed voice to AI because `dashInstance` was null.

**Flow:**
1. User talks → WebRTC streams audio ✅
2. OpenAI transcribes → Partial/final transcripts arrive ✅
3. `handleTranscript()` called → Checks `if (!dashInstance)` ❌
4. Returns early with only `console.warn` → **No error shown to user**
5. User sees orb listening but gets no response

### Why dashInstance Was Null

**Two scenarios:**

1. **DashAssistant** (line 92):
   ```typescript
   const [dashInstance, setDashInstance] = useState<DashAIAssistant | null>(null);
   ```
   - Starts as `null`
   - Set after async `initialize()` completes
   - Window where orb button is clickable but dashInstance isn't ready

2. **DashVoiceFloatingButton** (line 117):
   ```typescript
   const dash = React.useMemo(() => DashAIAssistant.getInstance(), []);
   ```
   - Gets instance immediately
   - But instance might not be `.initialize()`'d yet

---

## Fixes Applied ✅

### 1. Show Error When dashInstance Missing

**DashVoiceMode.tsx** - Two error handlers added:

```typescript
// Line 147-151: In handleTranscript
if (!dashInstance) {
  console.error('[DashVoiceMode] ❌ No dashInstance available!');
  setErrorMessage('AI Assistant not ready. Please close and try again.');
  toast.error?.('AI Assistant not initialized');
  setTimeout(() => onClose(), 2000);
  return;
}

// Line 267-274: On voice mode start
if (!dashInstance) {
  console.error('[DashVoiceMode] ❌ Cannot start: dashInstance is null!');
  setErrorMessage('AI Assistant not initialized. Please wait and try again.');
  toast.error?.('Please wait for AI to initialize');
  setTimeout(() => onClose(), 2500);
  return;
}
```

**Result:** User now sees clear error message instead of silent failure

---

### 2. Prevent Opening Before Ready

**DashVoiceFloatingButton.tsx** - Two entry points:

**A. Long Press** (line 273-279):
```typescript
// Ensure dash is initialized before opening voice mode
try {
  await dash.initialize();
} catch (e) {
  console.error('[DashVoiceFAB] ❌ Failed to initialize Dash:', e);
  return;
}
await ensureConversation();
setShowVoiceMode(true);
```

**B. Double Tap** (line 300-309):
```typescript
// Ensure dash is initialized before toggling voice mode
if (!showVoiceMode) {
  dash.initialize().then(() => {
    setShowVoiceMode(true);
  }).catch(e => {
    console.error('[DashVoiceFAB] ❌ Failed to initialize:', e);
  });
} else {
  setShowVoiceMode(false);
}
```

**DashAssistant.tsx** - Voice button (line 1344-1348):
```typescript
// Check if dashInstance is ready before opening voice mode
if (!dashInstance || !isInitialized) {
  console.warn('[DashAssistant] ⚠️ Dash not initialized yet, please wait');
  toast.warn?.('AI Assistant is starting up. Please wait...');
  return;
}
```

**Result:** Voice mode only opens after AI is ready

---

## Testing Checklist

### ✅ Fixed Scenarios

Before opening orb:
- [ ] Wait for DashAssistant to fully load (shows greeting message)
- [ ] Click voice/mic button
- [ ] Speak into mic
- [ ] Verify transcript appears
- [ ] **Verify AI responds** (text + speech)

Edge cases:
- [ ] Click voice button immediately on app load → Should show "Please wait" toast
- [ ] Long-press FAB before initialization → Should initialize first, then open
- [ ] Double-tap FAB → Should check initialization

### 🔍 What to Look For in Logs

**Success:**
```
[DashVoiceMode] 🎤 Partial transcript: hello
[DashVoiceMode] ✅ Final transcript received: hello
[DashVoiceMode] 📝 Final transcript: hello
[DashVoiceMode] Sending message to AI...
[DashVoiceMode] ✅ Received AI response: msg_123
[DashVoiceMode] 🔊 Preparing to speak: ...
[DashVoiceMode] 🎵 Calling dashInstance.speakResponse...
[DashVoiceMode] ✅ TTS started successfully
```

**Failure (Now Fixed):**
```
[DashVoiceMode] ❌ No dashInstance available!
[Error Toast] AI Assistant not initialized
[Orb closes after 2 seconds]
```

---

## Phase 2: Audio System Review

### Remaining Issue: SoundAlertService Conflict

**File:** `lib/SoundAlertService.ts`

**Problem:**
- Uses expo-av for notification sounds
- Line 107: Sets `allowsRecordingIOS: false`
- **Conflict:** WebRTC streaming needs `allowsRecordingIOS: true`
- **Impact:** If notification plays during streaming, might break mic

**Example Conflict:**
```typescript
// SoundAlertService.ts (line 107)
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,  // ❌ Breaks WebRTC
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});
```

---

### Phase 2 Action Plan

#### Option A: Remove SoundAlertService (Recommended)
**Pros:**
- Eliminates audio mode conflicts
- Simplifies architecture
- Already using haptics for feedback

**Steps:**
1. Find all usage of SoundAlertService
2. Replace with `Expo.Haptics` or native `Notifications`
3. Remove service file

#### Option B: Coordinate Audio Mode
**Pros:**
- Keep notification sounds
- More control over audio

**Steps:**
1. Create central audio mode manager
2. Track state: `streaming | tts | notification | idle`
3. Coordinate setAudioModeAsync calls
4. Never set `allowsRecordingIOS: false` while streaming

---

### Files to Review

```
lib/SoundAlertService.ts          - Notification sound service
lib/feedback.ts                    - ✅ Already fixed (Haptics only)
lib/voice/audio.ts                 - ✅ TTS playback only
lib/voice-pipeline.ts              - ✅ Streaming only
services/DashAIAssistant.ts        - ✅ Already correct
```

---

### Next Steps

1. **Test the orb fix** with these scenarios:
   - Fresh app load → Voice immediately
   - Long-press FAB → Voice mode
   - Voice button in DashAssistant

2. **Phase 2 Decision:**
   - Check if notification sounds are actually used
   - Decide: Remove or coordinate audio mode
   - Run grep to find SoundAlertService usage

3. **Deployment:**
   - If tests pass, orb fix is ready
   - Phase 2 can be done separately if needed

---

## Files Modified

```
components/ai/DashVoiceMode.tsx                 - Added error handlers
components/ai/DashVoiceFloatingButton.tsx       - Added init checks
components/ai/DashAssistant.tsx                 - Added ready check
```

## Commands to Test

```bash
# 1. Start dev server
npm run dev:android

# 2. Watch logs
adb logcat | grep -E "(DashVoiceMode|DashVoiceFAB|DashAssistant)"

# 3. Test orb
# - Long-press floating button
# - Speak: "Hello Dash"
# - Check if response appears

# 4. Check TypeScript
npm run typecheck  # ✅ Passes
```

---

## Summary

✅ **Orb Fix Complete**
- Error messages now visible to user
- Prevents opening before AI ready
- TypeScript passing

🔄 **Phase 2 Optional**
- SoundAlertService review
- Audio mode coordination
- Can be done separately

🎯 **Ready to Test**
- Try voice input in orb
- Verify AI responds
- Check error handling
