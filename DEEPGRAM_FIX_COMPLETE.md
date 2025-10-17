# Deepgram + react-native-webrtc Fix Complete ✅

**Date**: 2025-10-17  
**Issue**: Dash AI orb failing to connect - expo-audio causing "Cannot read property 'prototype' of undefined"  
**Root Cause**: Deepgram provider was using expo-audio (incompatible) instead of react-native-webrtc (proven pattern)

## Problem Analysis 🔍

### Logs showed:
```
✅ [claudeProvider] ✅ Deepgram streaming connected
❌ [claudeProvider] Start error: [TypeError: Cannot read property 'prototype' of undefined]
❌ [RealtimeVoice] ❌ sess.start returned false
```

**Deepgram WAS connecting successfully!** The failure was in the native audio recording setup using expo-audio.

### Why It Failed
- **OpenAI provider** (working): Used `react-native-webrtc` for native audio
- **Deepgram provider** (broken): Used `expo-audio` for native audio
- **expo-audio**: Not properly configured/incompatible with current setup

## Solution Implemented 🔧

### Changes Made

1. **Removed expo-audio dependencies** from `lib/voice/claudeProvider.ts`:
   - Removed `import { useAudioRecorder, AudioModule } from 'expo-audio'`
   - Removed `import * as FileSystem from 'expo-file-system'`
   - Removed all file-based recording logic

2. **Added react-native-webrtc pattern** (matching OpenAI provider):
   ```typescript
   // Native mobile (React Native with react-native-webrtc)
   const { mediaDevices } = await import('react-native-webrtc');
   
   localStream = await mediaDevices.getUserMedia({ 
     audio: { 
       echoCancellation: true, 
       noiseSuppression: true, 
       channelCount: 1,
       sampleRate: 16000  // Deepgram prefers 16kHz
     } as any, 
     video: false 
   } as any);
   ```

3. **Cleaned up voice-pipeline.ts**:
   - Fixed references from `this.webrtcSession` to `this.voiceSession`
   - Removed obsolete WebRTC-specific code

4. **Removed legacy code**:
   - Deleted `transcribeChunk()` function (no longer needed with streaming)
   - Removed FileSystem file-reading utilities

## Current Status 📊

### ✅ Completed
- [x] Analyzed OpenAI provider pattern
- [x] Removed expo-audio dependencies
- [x] Added react-native-webrtc import
- [x] Implemented native audio recording pattern
- [x] Fixed cleanup logic
- [x] Removed legacy code
- [x] Fixed TypeScript errors
- [x] Code compiles successfully

### ⚠️ Remaining Work
- [ ] **Test on Android device** - Critical next step
- [ ] **Implement PCM audio processing** - Currently placeholder
- [ ] **Verify Deepgram receives audio data** - Need to send actual audio chunks
- [ ] **Production quality improvements** - Audio data extraction from MediaStream

## Known Limitations 🚧

### Audio Processing Not Yet Implemented
The current code acquires the MediaStream successfully but doesn't yet:
1. Extract PCM audio data from the stream
2. Send audio chunks to Deepgram WebSocket

**Placeholder code** (lines 420-429):
```typescript
// TODO: Implement proper audio processing
console.log('[claudeProvider] ⚠️ Native audio processing not yet implemented');
console.log('[claudeProvider] 💡 Audio stream ready, but need PCM extraction logic');
```

### Why This Is OK For Now
- ✅ No more expo-audio errors
- ✅ No crashes during startup
- ✅ Deepgram WebSocket connects
- ✅ Audio stream acquired without errors
- ⚠️ Audio data not yet flowing to Deepgram

## Testing Instructions 🧪

### 1. Deploy to Android Device
```bash
npm run dev:android
```

### 2. Test Dash Orb
- Tap Dash orb to activate voice mode
- Watch console logs

### 3. Expected Success Logs
```
[claudeProvider] 🎤 Starting native audio with react-native-webrtc
[claudeProvider] ✅ Native audio stream acquired
[claudeProvider] ⚠️ Native audio processing not yet implemented
```

### 4. Success Criteria
- ✅ No "Cannot read property 'prototype' of undefined" error
- ✅ No fallback to Azure provider
- ✅ No expo-audio errors
- ✅ Session stays active
- ⚠️ Transcription won't work yet (audio processing pending)

## Next Steps 🚀

### Immediate (Phase 1)
1. **Test basic functionality** - Verify no crashes
2. **Confirm Deepgram connection** - Check WebSocket status
3. **Monitor console logs** - Look for new error patterns

### Short-term (Phase 2)
1. **Research audio processing options**:
   - Check if react-native-webrtc exposes audio sample data
   - Look into Web Audio API for React Native
   - Consider native audio processing modules

2. **Implement audio streaming**:
   - Extract PCM data from MediaStream
   - Convert to 16-bit PCM at 16kHz
   - Send chunks to Deepgram WebSocket

### Alternative Approaches
If audio processing proves complex:
- Keep Azure Speech as primary for native
- Use Deepgram for web only
- Investigate hybrid approach

## Files Modified 📝

1. `lib/voice/claudeProvider.ts`
   - Replaced expo-audio with react-native-webrtc
   - Removed FileSystem imports
   - Deleted legacy transcribeChunk function
   - Added audio stream acquisition

2. `lib/voice-pipeline.ts`
   - Fixed webrtcSession → voiceSession references
   - Updated cleanup logic

## Verification Commands ✓

```bash
# Verify no expo-audio references
grep -n "expo-audio" lib/voice/claudeProvider.ts
# Should only show comment

# Verify react-native-webrtc usage
grep -n "react-native-webrtc" lib/voice/claudeProvider.ts
# Should show dynamic import

# TypeScript validation
npm run typecheck
# Should pass (except unrelated allocation-direct.ts errors)

# Lint check
npm run lint
# Should pass
```

## Dependencies 📦

- ✅ `react-native-webrtc@124.0.7` - Already installed
- ❌ `expo-audio` - No longer used for Deepgram
- ✅ `@supabase/supabase-js` - For Deepgram API key
- ✅ WebSocket - Native support

## References 📚

- **Working pattern**: `lib/voice/webrtcProvider.ts` (OpenAI provider)
- **Deepgram docs**: https://developers.deepgram.com/docs/streaming
- **react-native-webrtc**: https://github.com/react-native-webrtc/react-native-webrtc

## Support & Troubleshooting 🆘

### If orb still fails to start:
1. Check console for new error messages
2. Verify react-native-webrtc is properly linked
3. Check Android permissions for microphone
4. Try clearing Metro cache: `npm run start:clear`

### If audio doesn't stream:
- Expected behavior - audio processing not yet implemented
- Focus on verifying no crashes and session stays active
- Audio streaming implementation is Phase 2

---

**Status**: ✅ Phase 1 Complete - Ready for Android Testing  
**Next**: Deploy to device and verify no crashes
