# Expo-AV Usage Audit & Strategic Removal Plan

## Executive Summary

Found **5 active files** using expo-av with **different purposes**:
1. **Recording** (REMOVE) - Local mic recording removed in favor of streaming
2. **TTS Playback** (KEEP) - Azure TTS audio playback still needs expo-av
3. **Sound Effects** (REVIEW) - Notification sounds and UI feedback
4. **Audio Configuration** (CONFLICT RISK) - Multiple places set audio mode

## Detailed Usage Analysis

### 1. lib/voice-pipeline.ts ❌ REMOVE RECORDING PATH
**Current State**: Dual-mode with WebRTC streaming + expo-av fallback  
**Lines**: 24 (import), 111-196 (config), 337-362 (fallback recording)

**Issue**:
- Line 337: "Fallback: Traditional expo-av recording (non-streaming)"
- Creates new `Audio.Recording()` when WebRTC fails
- Conflicts with streaming-only architecture

**Action**: Remove expo-av fallback, make WebRTC the only path

---

### 2. lib/voice/audio.ts ⚠️ SPLIT USAGE
**Current State**: Full AudioManager class wrapping expo-av  
**Lines**: 4 (comment), 8 (import), 12-395 (implementation)

**Recording Methods** (❌ REMOVE):
- `startRecording()` (lines 96-192)
- `stopRecording()` (lines 197-235)
- `cancelRecording()` (lines 240-253)
- Uses `Audio.Recording`, `Audio.setAudioModeAsync`, permissions

**Playback Methods** (✅ KEEP):
- `play()` (lines 261-315) - **USED BY TTS**
- `pause()`, `resume()`, `stop()` (lines 320-363)
- Uses `Audio.Sound.createAsync()`

**Used By**:
- ✅ **DashAIAssistant.speakWithAzureTTS()** (line 2870) - TTS playback
- ✅ **useTextToSpeech hook** (line 42, 88) - voice preferences testing
- ✅ **DashSpeakingOverlay** (line 76) - stop button
- ❌ **useVoiceRecording hook** (lines 145, 164) - NOT USED in streaming flow

**Action**: Keep playback methods, remove recording methods

---

### 3. lib/SoundAlertService.ts ⚠️ REVIEW FOR CONFLICTS
**Current State**: Uses expo-av for system notification sounds  
**Lines**: 2 (import), 65 (audio cache), 107 (audio mode config)

**Purpose**:
- Line 107: `Audio.setAudioModeAsync()` for notification sounds
- Line 65: `Map<string, Audio.Sound>` for caching sounds

**Potential Conflict**:
- Sets `allowsRecordingIOS: false` globally
- Might interfere with WebRTC streaming (needs `allowsRecordingIOS: true`)

**Action**: Review if notification sounds are critical; consider native alternatives

---

### 4. lib/feedback.ts ⚠️ OPTIONAL USAGE
**Current State**: Dynamic import with graceful degradation  
**Lines**: 3 (comment), 15-22 (dynamic import), 27-38 (playBeep)

**Purpose**:
- Optional beep sound for success feedback
- Already has graceful fallback if expo-av unavailable

**Issue**:
- Lines 15-17: Dynamic `require('expo-av')` might still bundle it
- Only used for UI feedback sounds (not critical)

**Action**: Can safely remove or replace with Expo.Haptics only

---

### 5. services/DashAIAssistant.ts ✅ CORRECT (TTS Only)
**Current State**: Uses audioManager for TTS playback only  
**Lines**: 697 (comment), 881 (error), 2825 (import), 2870 (play)

**Recording Methods** (✅ CORRECTLY DISABLED):
- Line 697: `// Local expo-av audio configuration removed`
- Line 881: `throw new Error('Local mic recording is disabled')`

**Playback Methods** (✅ CORRECTLY USED):
- Line 2870: `await audioManager.play(audioUrl)` for Azure TTS
- Only used for playing synthesized speech, not recording

**Action**: No changes needed - already correct

---

## Logic Mismatches & Conflicts

### ❌ Conflict #1: Audio Mode War
**Problem**: Multiple files set `Audio.setAudioModeAsync()` with different configs

**Locations**:
1. `lib/voice-pipeline.ts` line 47 (pre-warm)
2. `lib/SoundAlertService.ts` line 107 (notifications)
3. `lib/voice/audio.ts` line 47 (init), 126 (recording)

**Conflict**:
- WebRTC streaming needs `allowsRecordingIOS: true`
- Notification sounds set `allowsRecordingIOS: false`
- Last one to call wins → unpredictable behavior

**Impact**: Voice streaming might fail if notification sound plays during recording

---

### ❌ Conflict #2: Dual Recording Paths
**Problem**: Two different recording systems exist simultaneously

**Paths**:
1. **Streaming** (✅ Current): `useVoiceController` → `useRealtimeVoice` → WebRTC
2. **Local** (❌ Legacy): `VoiceRecordingPipeline` → `expo-av` → file upload

**Issues**:
- voice-pipeline.ts still has expo-av fallback (line 337)
- AudioManager still has recording methods (unused)
- useVoiceRecording hook wraps AudioManager (not used in production)

**Impact**: Dead code, confusing architecture, risk of accidental usage

---

### ⚠️ Mismatch #3: Permission Logic
**Problem**: Inconsistent permission handling

**DashAIAssistant** (lines 676-691):
```typescript
// Local mic recording has been removed
this.audioPermissionStatus = 'granted';
return true;
```

**AudioManager** (line 64-76):
```typescript
async requestPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}
```

**Streaming** (useRealtimeVoice):
- Android: Uses `PermissionsAndroid.request()`
- iOS: Relies on WebRTC getUserMedia prompt

**Impact**: Three different permission systems - confusing and error-prone

---

## Strategic Fix Plan

### Phase 1: Remove Local Recording ❌
**Files to Modify**:
1. `lib/voice-pipeline.ts`
   - Remove expo-av import and fallback recording (lines 337-362)
   - Keep WebRTC streaming path only
   - Remove `getAudioConfig()` function (lines 111-196)

2. `lib/voice/audio.ts`
   - Remove recording methods: `startRecording`, `stopRecording`, `cancelRecording`
   - Remove `this.recording` property
   - Remove recording-specific `setAudioModeAsync` calls
   - **Keep** playback methods: `play`, `pause`, `resume`, `stop`

3. `lib/voice/hooks.ts`
   - Mark `useVoiceRecording` hook as deprecated
   - Add comment: "// DEPRECATED: Use useVoiceController with streaming instead"

### Phase 2: Simplify Audio Configuration ⚠️
**Goal**: Single source of truth for audio mode

**Solution**:
1. Create `lib/voice/audioMode.ts` with single function:
   ```typescript
   export async function setVoiceAudioMode(isRecording: boolean) {
     await Audio.setAudioModeAsync({
       allowsRecordingIOS: isRecording,
       playsInSilentModeIOS: true,
       staysActiveInBackground: false,
       shouldDuckAndroid: true,
       playThroughEarpieceAndroid: false,
     });
   }
   ```

2. Call from:
   - WebRTC session start: `setVoiceAudioMode(true)`
   - WebRTC session stop: `setVoiceAudioMode(false)`
   - TTS playback: `setVoiceAudioMode(false)`

### Phase 3: Review Sound Effects 🔍
**SoundAlertService.ts**:
- Keep if notification sounds are essential
- Consider replacing with:
  - `Expo.Notifications` for system sounds
  - `Expo.Haptics` for vibration feedback
  - Native `Audio` only when needed

**lib/feedback.ts**:
- Remove expo-av dynamic import
- Use `Expo.Haptics` only:
  ```typescript
  import * as Haptics from 'expo-haptics';
  
  const Feedback = {
    async playSuccess() {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    async vibrate(ms = 30) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };
  ```

### Phase 4: Keep TTS Playback ✅
**No changes needed** - already correct:
- `lib/voice/audio.ts` playback methods (lines 261-363)
- `services/DashAIAssistant.ts` speakWithAzureTTS (line 2870)
- `lib/voice/hooks.ts` useTextToSpeech (lines 42, 88)

**Ensure**:
- Azure TTS proxy returns cached audio URLs
- Audio playback doesn't conflict with streaming sessions
- Test TTS while WebRTC streaming is active

---

## Implementation Priority

### 🔴 Critical (Do First)
1. **Remove expo-av fallback from voice-pipeline.ts**
   - Risk: Users might accidentally use local recording
   - Impact: Breaks streaming-only architecture

2. **Remove recording methods from AudioManager**
   - Risk: Dead code causes confusion
   - Impact: Cleaner architecture, smaller bundle

### 🟡 Important (Do Soon)
3. **Centralize audio mode configuration**
   - Risk: WebRTC fails due to audio mode conflicts
   - Impact: More reliable streaming

4. **Simplify lib/feedback.ts**
   - Risk: Unnecessary expo-av bundling
   - Impact: Smaller bundle size

### 🟢 Nice to Have (Do Later)
5. **Review SoundAlertService needs**
   - Risk: Notification sounds still work
   - Impact: Potential bundle size reduction

---

## Testing Checklist

After each phase:
- [ ] Streaming voice input works (tap mic → speak → see transcript)
- [ ] TTS playback works (Dash speaks responses)
- [ ] No audio mode conflicts (TTS during streaming works)
- [ ] No console errors about Audio.Recording
- [ ] TypeScript compiles with no errors
- [ ] Bundle size reduced (check `npx expo export --dump-sourcemap`)

---

## Files Summary

**Remove expo-av completely**:
- ❌ lib/feedback.ts (replace with Haptics)

**Remove recording, keep playback**:
- ✂️ lib/voice-pipeline.ts (remove fallback)
- ✂️ lib/voice/audio.ts (remove recording methods)
- ✂️ lib/voice/hooks.ts (deprecate useVoiceRecording)

**Keep as-is (TTS)**:
- ✅ services/DashAIAssistant.ts (already correct)

**Review for conflicts**:
- ⚠️ lib/SoundAlertService.ts (notification sounds)

---

## Next Steps

1. Create backup branch: `git checkout -b backup-before-expo-av-removal`
2. Implement Phase 1 (remove recording)
3. Run typecheck and lint
4. Test streaming voice + TTS playback
5. If successful, proceed to Phase 2-4
6. Document final architecture in VOICE_SYSTEM.md
