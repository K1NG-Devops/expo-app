# Orb Voice Input - Picovoice Error Fix 🎤

## Issue Summary

**Error**: `Cannot read property 'FRAME_EMITTER_KEY' of null`

**Root Cause**: The `@picovoice/react-native-voice-processor` package is listed in `package.json` but **not installed** in `node_modules/`. This caused voice input to completely fail on Android with a cascade of failures:

1. ❌ Claude + Deepgram (Picovoice) - Module not installed
2. ❌ Azure Speech - Skipped (native platform, requires Web Audio API)
3. ❌ OpenAI Realtime - Blocked (free tier user, requires premium subscription)

## Solution Implemented ✅

Added a **robust fallback chain** to `claudeProvider.ts`:

### Primary: Picovoice Voice Processor
- Provides raw PCM audio frames
- Optimal for Deepgram streaming
- **Gracefully fails if not installed**

### Fallback: react-native-webrtc
- Uses `mediaDevices.getUserMedia()` for audio capture
- Uses `MediaRecorder` to stream audio chunks
- **Already installed in the project**
- Proven pattern (used by OpenAI provider)

## Changes Made

### File: `lib/voice/claudeProvider.ts`

**Before**: Hard failure when Picovoice unavailable
```typescript
} catch (err) {
  console.error('[claudeProvider] ❌ Picovoice setup failed:', err);
  return false; // ❌ Total failure, no voice input
}
```

**After**: Graceful fallback to react-native-webrtc
```typescript
} catch (picoErr) {
  console.warn('[claudeProvider] ⚠️ Picovoice failed, trying react-native-webrtc...');
}

// Fallback to react-native-webrtc
if (!picovoiceSuccess) {
  const { mediaDevices } = await import('react-native-webrtc');
  localStream = await mediaDevices.getUserMedia({ audio: {...} });
  // MediaRecorder streaming to Deepgram
}
```

## Expected Behavior After Fix

### Scenario 1: Picovoice Installed ✅
```
[claudeProvider] 🔍 Attempting Picovoice Voice Processor...
[claudeProvider] ✅ VoiceProcessor started successfully
[claudeProvider] ✅ Picovoice native audio ready!
```

### Scenario 2: Picovoice NOT Installed (Current State) ✅
```
[claudeProvider] ⚠️ Picovoice module not available
[claudeProvider] 🔁 Attempting react-native-webrtc fallback...
[claudeProvider] ✅ Got audio stream from react-native-webrtc
[claudeProvider] ✅ react-native-webrtc fallback active
```

### Scenario 3: Both Fail (Installation Issue) ❌
```
[claudeProvider] ❌ All native audio methods failed
[claudeProvider] 💡 Please ensure dependencies are installed: npm install
```

## Next Steps

### Option 1: Install Dependencies (Recommended)
```bash
cd /workspace
npm install
# or
yarn install
```

This will install `@picovoice/react-native-voice-processor` and optimize performance.

### Option 2: Use Current Fix
The fallback to `react-native-webrtc` should work immediately since it's already installed. Test the orb voice input on Android to verify.

### Option 3: Remove Picovoice (Long-term)
If Picovoice is causing issues, we can:
1. Remove from `package.json` dependencies
2. Remove Picovoice-specific code
3. Use `react-native-webrtc` as primary method

## Testing Checklist

- [ ] Test orb voice input on Android
- [ ] Verify Deepgram transcription works
- [ ] Confirm no FRAME_EMITTER_KEY errors
- [ ] Check Claude AI responses
- [ ] Verify fallback logs show correct path

## Technical Details

### Why This Fix Works

1. **Picovoice is optional**: Primary method, but not required
2. **react-native-webrtc is proven**: Already used by OpenAI provider successfully
3. **MediaRecorder streaming**: Converts audio to format Deepgram accepts
4. **Graceful degradation**: Each fallback is tried in order with clear logging

### Audio Flow

**With Picovoice**:
```
Microphone → Picovoice → Raw PCM (512 samples) → Deepgram WebSocket → Transcription
```

**With react-native-webrtc**:
```
Microphone → mediaDevices → MediaRecorder → WebM chunks → Deepgram WebSocket → Transcription
```

## Error Prevention

Added detailed logging at each step:
- ✅ Clear success messages
- ⚠️ Warning for fallback transitions
- ❌ Error messages with actionable guidance
- 💡 Helpful hints for troubleshooting

## Cost Impact

**No change** - Both methods use Claude + Deepgram:
- Deepgram: ~$0.50/hour
- Claude 3.5 Sonnet: ~$0.10/hour
- **Total: ~$0.60/hour** (vs $18/hour for OpenAI Realtime)

## Related Files

- `lib/voice/claudeProvider.ts` - Main fix implemented here
- `lib/voice/webrtcProvider.ts` - Reference implementation for OpenAI
- `hooks/useRealtimeVoice.ts` - Voice provider orchestration
- `package.json` - Dependencies list

---

**Status**: ✅ Fix implemented, ready for testing

**Action Required**: Test orb voice input on Android device or install missing dependencies
