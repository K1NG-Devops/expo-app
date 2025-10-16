# Audio Mode Coordinator Implementation

## Overview

The AudioModeCoordinator is a centralized service that manages all expo-av `Audio.setAudioModeAsync` calls across the application to prevent conflicts between:
- **WebRTC Streaming** (voice input via orb)
- **TTS Playback** (AI voice responses)
- **Notification Sounds** (system alerts)

## Problem Solved

### Before: Audio Mode Conflicts ❌

Multiple services were independently setting audio mode:

```typescript
// SoundAlertService.ts - CONFLICT!
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,  // ❌ Breaks WebRTC mic
  ...
});

// voice/audio.ts - CONFLICT!
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,  // ❌ Breaks WebRTC mic
  ...
});

// WebRTC streaming happening → Mic suddenly breaks!
```

**Result:** Notifications or TTS could disable the microphone while the orb was streaming, causing silent failures.

### After: Coordinated Audio Mode ✅

All services now request audio mode through the coordinator:

```typescript
// Request streaming mode
const session = await AudioModeCoordinator.requestAudioMode('streaming');
// ... do streaming work ...
await session.release();

// Or use auto-release pattern
await AudioModeCoordinator.withAudioMode('tts', async () => {
  // TTS playback here
});
```

**Result:** Microphone stays enabled (`allowsRecordingIOS: true`) in ALL modes, streaming gets highest priority, and transitions are graceful.

---

## Architecture

### Priority System

The coordinator uses a priority-based conflict resolution:

```typescript
Priority  Mode          Use Case                      Recording Enabled?
--------  -----------   --------------------------    ------------------
4         streaming     WebRTC voice input (orb)      ✅ true (REQUIRED)
3         tts           AI voice responses            ✅ true
2         notification  System alerts                 ✅ true
1         idle          Default state                 ✅ true
```

**Key Design Decision:** `allowsRecordingIOS: true` in **all modes** to prevent WebRTC disruption.

### Audio Mode Configurations

```typescript
streaming: {
  allowsRecordingIOS: true,           // CRITICAL: WebRTC needs this
  playsInSilentModeIOS: true,
  shouldDuckAndroid: false,           // Don't duck during streaming
  playThroughEarpieceAndroid: false,
  staysActiveInBackground: true,
}

tts: {
  allowsRecordingIOS: true,           // Keep enabled for quick transitions
  playsInSilentModeIOS: true,
  shouldDuckAndroid: false,           // TTS shouldn't be ducked
  playThroughEarpieceAndroid: false,
}

notification: {
  allowsRecordingIOS: true,           // Safe default
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,            // Notifications can duck
  playThroughEarpieceAndroid: false,
}

idle: {
  allowsRecordingIOS: true,           // Always ready
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
}
```

---

## Integration Points

### 1. WebRTC Streaming (lib/voice/webrtcProvider.ts)

**When:** User opens voice orb and speaks

```typescript
// Request streaming session when starting WebRTC
audioSession = await AudioModeCoordinator.requestAudioMode('streaming');

// Release when streaming stops
await audioSession.release();
```

**Log Output:**
```
[AudioModeCoordinator] 📝 Session requested: streaming_1_1234567890 (streaming)
[AudioModeCoordinator] 🔄 Mode transition: idle → streaming
[AudioModeCoordinator] ✅ Applied mode: streaming
[realtimeProvider] 🎵 Streaming audio session started: streaming_1_1234567890
```

### 2. TTS Playback (lib/voice/audio.ts)

**When:** AI responds with voice

```typescript
// AudioManager.play() requests TTS mode
this.audioSession = await AudioModeCoordinator.requestAudioMode('tts');

// AudioManager.stop() releases it
await this.audioSession.release();
```

**Log Output:**
```
[AudioManager] 🎵 TTS audio session started: tts_2_1234567891
[AudioModeCoordinator] 📝 Session requested: tts_2_1234567891 (tts)
[AudioManager] 🔓 TTS audio session released
[AudioModeCoordinator] 🔓 Session released: tts_2_1234567891 (tts)
```

### 3. Notification Sounds (lib/SoundAlertService.ts)

**When:** System plays alert sound

```typescript
// Use auto-release pattern
await AudioModeCoordinator.withAudioMode('notification', async () => {
  // Play notification sound
});
```

**Log Output:**
```
[SoundAlertService] 🔊 Playing normal sound for message alert
[AudioModeCoordinator] 📝 Session requested: notification_3_1234567892 (notification)
[AudioModeCoordinator] 🔓 Session released: notification_3_1234567892 (notification)
```

---

## Usage Patterns

### Pattern 1: Manual Session Management

**Use when:** You need fine-grained control over session lifecycle

```typescript
const coordinator = AudioModeCoordinator.getInstance();

// Request session
const session = await coordinator.requestAudioMode('streaming');
console.log('Session ID:', session.id);

try {
  // Your audio work here
  await doVoiceStreaming();
} finally {
  // ALWAYS release in finally block
  await session.release();
}
```

### Pattern 2: Auto-Release (Recommended)

**Use when:** You want automatic cleanup

```typescript
await AudioModeCoordinator.withAudioMode('tts', async () => {
  // Your audio work here
  await playTTS();
  // Session automatically released even if error occurs
});
```

### Pattern 3: Initialization

**Use when:** App starts or service initializes

```typescript
// In service initialization
await AudioModeCoordinator.initialize();
```

---

## Conflict Resolution

### Scenario: Notification During Streaming

```typescript
// 1. User starts voice orb → streaming mode (priority 4)
Session: streaming_1
Active mode: streaming

// 2. Notification arrives → requests notification mode (priority 2)
Session: streaming_1, notification_2
Active mode: streaming  // ✅ Streaming wins (higher priority)

// 3. Notification finishes
Session: streaming_1
Active mode: streaming  // ✅ Still streaming

// 4. User closes orb
Session: (none)
Active mode: idle  // ✅ Returns to idle
```

**Result:** Notification plays but doesn't interrupt streaming. Microphone stays enabled.

### Scenario: TTS While Streaming

```typescript
// 1. Streaming active
Active mode: streaming (priority 4)

// 2. TTS tries to play
Requested: tts (priority 3)
Active mode: streaming  // ✅ Streaming wins

// 3. Streaming stops
Active mode: tts  // ✅ TTS plays now

// 4. TTS finishes
Active mode: idle
```

**Result:** TTS waits for streaming to finish, then plays seamlessly.

---

## Debugging

### Get Current State

```typescript
const debug = AudioModeCoordinator.getDebugInfo();
console.log(debug);
/*
{
  currentMode: 'streaming',
  activeSessionCount: 2,
  sessionBreakdown: {
    idle: 0,
    notification: 0,
    tts: 1,
    streaming: 1
  },
  isInitialized: true
}
*/
```

### Emergency Reset

```typescript
// Use only in error recovery
await AudioModeCoordinator.reset();
// Clears all sessions, returns to idle
```

### Log Patterns

Look for these logs to track audio mode:

```
[AudioModeCoordinator] ✅ Initialized with idle mode
[AudioModeCoordinator] 📝 Session requested: <type>_<id>_<timestamp> (<type>)
[AudioModeCoordinator] 🔄 Mode transition: <old> → <new>
[AudioModeCoordinator] ✅ Applied mode: <mode>
[AudioModeCoordinator] 🔓 Session released: <id> (<type>)
```

---

## Testing

### Test 1: Streaming Uninterrupted

```bash
# Start orb → Start speaking
# Expected: Streaming mode active

# Trigger notification mid-speech
# Expected: Streaming continues, notification logs show but doesn't interrupt

# Stop speaking
# Expected: Returns to idle
```

### Test 2: TTS After Streaming

```bash
# Start orb → Speak → Get AI response
# Expected: streaming → tts transition

# TTS plays
# Expected: Audio plays smoothly

# TTS finishes
# Expected: Returns to idle
```

### Test 3: Multiple Sessions

```bash
# Start streaming
# Notification arrives
# TTS attempts to play

# Expected: Streaming active (highest priority)
# Expected: Session breakdown shows all 3 sessions
# Expected: Only streaming mode applied
```

---

## Migration Guide

### Updating Existing Services

**Before:**
```typescript
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  ...
});
```

**After:**
```typescript
import AudioModeCoordinator from './AudioModeCoordinator';

await AudioModeCoordinator.initialize();
await AudioModeCoordinator.withAudioMode('notification', async () => {
  // Your audio code
});
```

### Service-Specific Changes

**lib/SoundAlertService.ts:**
- ✅ initialize() now calls coordinator
- ✅ playSystemNotificationSound() uses withAudioMode()

**lib/voice/audio.ts:**
- ✅ initialize() now calls coordinator
- ✅ play() requests TTS session
- ✅ stop() releases TTS session

**lib/voice/webrtcProvider.ts:**
- ✅ start() requests streaming session
- ✅ stop() releases streaming session
- ✅ Error handling releases session

---

## Benefits

### 1. No More Mic Breakage ✅
- WebRTC always has mic access
- `allowsRecordingIOS: true` in all modes

### 2. Predictable Behavior ✅
- Priority system ensures correct mode
- No race conditions

### 3. Automatic Cleanup ✅
- `withAudioMode()` handles release
- Error handling prevents leaks

### 4. Debuggable ✅
- Clear log messages
- Debug info available
- Emergency reset option

### 5. Future-Proof ✅
- Easy to add new modes
- Central coordination point
- No scattered audio calls

---

## API Reference

### AudioModeCoordinator

```typescript
class AudioModeCoordinator {
  static getInstance(): AudioModeCoordinator
  
  initialize(): Promise<void>
  
  requestAudioMode(mode: AudioMode): Promise<AudioModeSession>
  
  withAudioMode<T>(
    mode: AudioMode, 
    callback: () => Promise<T>
  ): Promise<T>
  
  getCurrentMode(): AudioMode
  
  getActiveSessionCount(): number
  
  getActiveSessions(): Record<AudioMode, number>
  
  getDebugInfo(): {
    currentMode: AudioMode
    activeSessionCount: number
    sessionBreakdown: Record<AudioMode, number>
    isInitialized: boolean
  }
  
  reset(): Promise<void>
}
```

### AudioModeSession

```typescript
interface AudioModeSession {
  mode: AudioMode
  id: string
  release: () => Promise<void>
}
```

### AudioMode

```typescript
type AudioMode = 'idle' | 'notification' | 'tts' | 'streaming'
```

---

## Files Modified

```
✅ lib/AudioModeCoordinator.ts                  - NEW: Central coordinator
✅ lib/SoundAlertService.ts                     - Uses coordinator
✅ lib/voice/audio.ts                           - Uses coordinator
✅ lib/voice/webrtcProvider.ts                  - Uses coordinator
```

---

## Related Documentation

- [Phase 1: expo-av Removal](./PHASE_1_EXPO_AV_REMOVAL_COMPLETE.md)
- [Orb Fix Summary](./ORB_FIX_AND_PHASE2_SUMMARY.md)
- [Voice System Guide](./VOICE_SYSTEM_GUIDE.md)

---

## Troubleshooting

### Issue: Mic not working in orb

**Check:**
1. AudioModeCoordinator initialized?
2. Streaming session requested?
3. Look for mode transition logs

**Fix:**
```typescript
const debug = AudioModeCoordinator.getDebugInfo();
console.log('Current mode:', debug.currentMode);
console.log('Active sessions:', debug.sessionBreakdown);
```

### Issue: TTS not playing

**Check:**
1. TTS session requested?
2. Is streaming session blocking it?
3. Session released after playback?

**Fix:**
Ensure `audioSession.release()` called in finally block

### Issue: Multiple mode changes rapidly

**Check:**
1. Are sessions being released properly?
2. Multiple services requesting simultaneously?

**Fix:**
Use `withAudioMode()` for automatic cleanup

---

## Next Steps

1. ✅ Test orb with streaming → TTS transitions
2. ✅ Test notification during streaming
3. ✅ Monitor logs for unexpected transitions
4. ⏳ Add analytics for mode usage patterns
5. ⏳ Consider adding mode change callbacks

---

**Status:** ✅ Complete  
**TypeScript:** ✅ Passing  
**Lint:** ✅ Passing  
**Ready for:** Production testing
