# DEBUG: Voice Orb with STT/TTS Disabled

## What's Disabled

**TEMPORARY DEBUG MODE ACTIVE**

1. ✅ **Whisper Streaming STT** - Completely disabled in `lib/voice/unifiedProvider.ts`
   - Will fall back to Expo Speech Recognition or React Native Voice
   - Console will show: `🚫 WHISPER STREAMING TEMPORARILY DISABLED FOR DEBUGGING`

2. ✅ **All TTS (Text-to-Speech)** - Disabled in `useDashVoiceSession.ts`
   - No voice playback at all
   - Console will show: `🚫 TTS TEMPORARILY DISABLED (would speak): ...`

## Test Scenario

### Test 1: Open Orb and Stay Silent
```bash
1. Open Dash app on Android
2. Tap Voice Orb button
3. Stay completely silent for 10 seconds
4. Watch the screen and console logs
```

**Expected Behavior (if bug is in STT/TTS)**:
- ✅ No phantom "Thank you" messages
- ✅ No text appearing in chat
- ✅ Orb just waits

**If Bug Still Happens**:
- ❌ "Thank you" still appears → Bug is NOT in voice system
- ❌ Text appears in chat → Something else is triggering AI

### Test 2: Check Console Logs
Watch for these messages:
```
[UnifiedProvider] 🚫 WHISPER STREAMING TEMPORARILY DISABLED FOR DEBUGGING
[UnifiedProvider] ✅ Using Expo Speech Recognition (streaming fallback)
```

If you see AI responses being generated:
```
[useDashVoiceSession] Processing transcript: ...
[useDashVoiceSession] 🚫 TTS TEMPORARILY DISABLED (would speak): Thank you...
```

This tells us the AI is being triggered by something OTHER than voice input.

## Possible Alternative Sources

If phantom responses still happen with STT/TTS disabled, check:

1. **Auto-greetings on open** - Does Voice Orb auto-send a greeting?
2. **Cached/previous messages** - Are old messages being replayed?
3. **Event listeners** - Is something auto-triggering on mount?
4. **WebSocket/realtime** - Is there a connection sending data?

## To Revert Changes

When done debugging, revert these two files:
```bash
# Revert STT
git checkout lib/voice/unifiedProvider.ts

# Revert TTS  
git checkout components/ai/dash-voice-mode/useDashVoiceSession.ts
```

Or manually uncomment the code blocks.

## Files Modified

1. `lib/voice/unifiedProvider.ts` - Lines 205-220 (Whisper streaming disabled)
2. `components/ai/dash-voice-mode/useDashVoiceSession.ts` - Lines 126-128 (TTS disabled)
