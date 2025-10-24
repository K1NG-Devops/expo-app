# Dash Voice Interruption Fix

## Issues Fixed

### 1. Edge Function Error
**Problem**: `claudeProvider` was calling non-existent `ai-proxy` function with wrong schema
**Solution**: 
- Changed from `ai-proxy` to `ai-gateway` 
- Updated request body to match `ai-gateway` schema (action: 'general_assistance', messages array)
- Response parsing updated to handle `data.content` format

### 2. Interruption Detection
**Problem**: When user interrupts Dash while speaking, Dash doesn't stop
**Root Causes**:
- `stopSpeaking()` only stopped expo-speech (device TTS), not audio manager (Azure TTS)
- No mechanism to cancel ongoing Claude AI response generation
- Partial transcript interruption wasn't aggressive enough

**Solutions**:

#### A. Enhanced `stopSpeaking()` (DashAIAssistant)
```typescript
public async stopSpeaking(): Promise<void> {
  // Stop device TTS (expo-speech)
  if (Speech && typeof Speech.stop === 'function') {
    await Speech.stop();
  }
  
  // Stop audio manager (Azure TTS playback)
  const { audioManager } = await import('@/lib/voice/audio');
  await audioManager.stop();
  
  console.log('[Dash] ✅ Stopped all speech playback');
}
```

#### B. Added `cancelResponse()` to claudeProvider
```typescript
export interface ClaudeVoiceSession {
  start: (opts: ClaudeVoiceOptions) => Promise<boolean>;
  stop: () => Promise<void>;
  isActive: () => boolean;
  sendMessage: (message: string) => Promise<void>;
  cancelResponse: () => void; // NEW
}
```

#### C. Improved Interruption Logic
- Detects user speech while Dash is speaking
- Stops TTS immediately (both device and Azure)
- Cancels ongoing AI generation
- Provides haptic feedback
- Sensitivity: triggers on 2+ character partial transcripts

## How It Works

### Interruption Flow
1. **User starts speaking** → Deepgram detects speech → `onPartialTranscript` fires
2. **Check if Dash is speaking** → `if (speaking && partial.length >= 2)`
3. **Stop all TTS**:
   - Stop expo-speech via `Speech.stop()`
   - Stop audio manager via `audioManager.stop()`
   - Cancel Claude generation via `cancelResponse()`
4. **Haptic feedback** → User knows interruption was detected
5. **Reset state** → `setSpeaking(false)` → Ready for new input

### Cancellation in claudeProvider
```typescript
cancelResponse() {
  if (isStreaming) {
    console.log('[claudeProvider] Cancelling ongoing response generation');
    isStreaming = false;
    currentResponseTokens = [];
  }
}
```

## Testing

### Test Interruption
1. **Start voice mode** → Press orb button
2. **Ask a question** → "Tell me a long story about preschool"
3. **Wait for Dash to start speaking**
4. **Interrupt immediately** → Start speaking while Dash is talking
5. **Expected behavior**:
   - Dash stops speaking immediately
   - Your speech is captured
   - New response generated based on your interruption

### Test Languages
Repeat for each language:
- English: "Stop, tell me something else"
- Afrikaans: "Stop, sê vir my iets anders"
- Zulu: "Yima, ngitshele okunye"

### Expected Results
- ✅ TTS stops immediately when you interrupt
- ✅ No audio continues playing
- ✅ Your new speech is captured
- ✅ Dash responds to your interruption

## Configuration

No configuration required. Interruption detection is always active when:
- Voice mode is open
- Dash is speaking (`speaking === true`)
- User speech detected (2+ character partial transcript)

## Debugging

Enable verbose logs:
```javascript
// In DashVoiceMode.tsx - onPartialTranscript
console.log('[DashVoiceMode] 🎤 Partial:', partial, 'Speaking:', speaking);

// In claudeProvider.ts - cancelResponse
console.log('[claudeProvider] Cancelling response. Was streaming:', isStreaming);

// In DashAIAssistant.ts - stopSpeaking
console.log('[Dash] Stopping all TTS');
```

## Known Limitations

1. **Azure TTS Latency**: Small delay (~50-100ms) to stop audio playback
2. **Claude Generation**: Can't cancel server-side processing, only stops client streaming
3. **Partial Transcript Threshold**: 2 characters minimum to prevent false positives

## Rollback Plan

If issues occur, revert these files:
- `lib/voice/claudeProvider.ts`
- `services/DashAIAssistant.ts` (stopSpeaking method)
- No database changes, purely client-side
