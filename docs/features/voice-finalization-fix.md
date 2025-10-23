# Voice Chat Transcript Finalization Fix

**Date**: 2025-01-XX  
**Status**: ✅ Implemented  
**Related**: Dash AI voice chat streaming improvements

## Problem

The voice chat system had a **2-second silence timeout** before finalizing transcripts and sending them to the AI. This caused:

1. **Delayed responses**: Users had to wait 2 full seconds after speaking before Dash would respond
2. **Poor UX**: Made the conversation feel sluggish and unnatural
3. **Confusion**: Users didn't know if the system heard them or was still listening

## Solution

Reduced the finalization delay from **2000ms → 500ms** to make the system feel more responsive and natural.

### Changes Made

**File**: `components/ai/dash-voice-mode/useDashVoiceSession.ts`

1. **Added configurable delay constant** (line 88-89):
   ```typescript
   // Reduced finalization delay for faster response (500ms instead of 2000ms)
   const FINALIZATION_DELAY_MS = 500;
   ```

2. **Updated onPartial callback** (line 533):
   ```typescript
   // Before:
   finalizeTimerRef.current = setTimeout(finalizeFromSilence, 2000);
   
   // After:
   finalizeTimerRef.current = setTimeout(finalizeFromSilence, FINALIZATION_DELAY_MS);
   ```

## Impact

### Before Fix
- User speaks: "What's the weather?"
- System waits 2 seconds of silence
- Then processes and responds
- **Total delay**: ~2.5-3 seconds

### After Fix
- User speaks: "What's the weather?"
- System waits 500ms of silence
- Then processes and responds
- **Total delay**: ~1-1.5 seconds

## Azure TTS Confirmation

**Azure TTS is already enabled by default**. The voice flow is:

1. **STT**: Azure Speech SDK → transcript
2. **AI**: Anthropic Claude streaming → response text
3. **TTS**: Azure Cognitive Services (via `tts-proxy` Edge Function) → audio

The `DashVoiceService.speakText()` method already:
- Tries Azure TTS first via `voiceService.synthesize()`
- Falls back to device TTS only on error
- Uses language-specific voices (en-ZA, af-ZA, zu-ZA, xh-ZA, nso-ZA)

### Voice Service Flow

```typescript
// components/ai/dash-voice-mode/useDashVoiceSession.ts
speakText(text) 
  → dashInstance.speakResponse()
    → DashVoiceService.speakText()
      → voiceService.synthesize() // Azure TTS via Edge Function
        → tts-proxy Edge Function
          → Azure Cognitive Services Speech API
          → Returns audio URL
        → audioManager.play(audio_url)
      → [FALLBACK] Speech.speak() // Device TTS if Azure fails
```

## Testing Recommendations

1. **Test on Android device** (primary platform)
2. **Verify 500ms feels natural** - may need tuning between 400-800ms
3. **Check edge cases**:
   - User speaks very quickly (multiple words in <500ms)
   - User pauses mid-sentence (should NOT finalize)
   - Background noise triggering false partials

## Future Optimizations

If 500ms still feels slow, consider:

1. **Adaptive timing**: Shorter delay (200-300ms) after longer utterances
2. **Energy-based detection**: Finalize when audio energy drops below threshold
3. **Word boundary detection**: Finalize on grammatical pauses
4. **Streaming finalization**: Start AI processing before full transcript is final

## Rollback Plan

If 500ms causes premature finalization (cutting off users mid-sentence):

```typescript
// Revert to longer delay
const FINALIZATION_DELAY_MS = 1000; // or 1500
```

## Related Files

- `components/ai/dash-voice-mode/useDashVoiceSession.ts` - Main voice session hook
- `services/dash-ai/DashVoiceService.ts` - TTS implementation
- `lib/voice/client.ts` - Azure TTS client
- `supabase/functions/tts-proxy/` - Edge Function for Azure TTS

## Documentation Sources

- **Azure Speech SDK**: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
- **React Native Voice Best Practices**: Industry standard is 300-800ms silence detection
- **Expo AV Audio**: https://docs.expo.dev/versions/v53.0.0/sdk/audio/
