# Dash AI Fixes - 2025-10-18

## Issues Fixed

### 1. Old "Dash Agent" Branding Throughout Codebase
**Problem**: Error logs and debug messages were still using "Dash Agent" instead of the current "Dash AI" branding.

**Error Example**:
```
ERROR  [ERROR] [Dash Agent] AI Gateway error: [FunctionsHttpError: Edge Function returned a non-2xx status code]
ERROR  [ERROR] [Dash Agent] callAIServiceWithTools failed: [FunctionsHttpError: Edge Function returned a non-2xx status code]
ERROR  [ERROR] [Dash Agent] Tool calling failed, falling back to standard response: [FunctionsHttpError: Edge Function returned a non-2xx status code]
```

**Files Updated**:
- `services/DashAIAssistant.ts` - Updated 20+ logging statements from `[Dash Agent]` to `[Dash AI]`

**Lines Changed**:
- Line 3112: Processing message logs
- Line 3114-3116: Language detection logs
- Line 3180-3239: Phase 1-5 processing logs
- Line 3340-3406: Tool execution logs  
- Line 4915-4971: AI service calling logs

### 2. Voice Mode Won't Stop When User Clicks Mic Button
**Problem**: When Dash AI starts talking in Voice Mode (the orb), clicking the mic button again doesn't stop it. The user expects the mic button to act as a toggle - click to start, click again to stop.

**Root Cause**:
1. The mic button only had logic to **open** voice mode, not **close** it
2. The `abortSpeechRef` flag wasn't being set when closing via button
3. Multiple TTS systems (device TTS, audio manager, dashInstance) weren't all being stopped

**Files Updated**:
1. `components/ai/DashAssistant.tsx`
   - Added toggle logic to mic button (lines 1318-1344)
   - Changed button background color to red when voice mode is active (visual feedback)
   - Added stop functionality when mic button is pressed while voice mode is active

2. `components/ai/DashVoiceMode.tsx`
   - Enhanced `handleClose()` function with comprehensive audio stopping (lines 475-517)
   - Added `abortSpeechRef.current = true` at the start of close handler
   - Added proper stopping of all TTS systems:
     - Dash's TTS system (dashInstance)
     - Audio manager TTS
     - Device TTS (expo-speech) as fallback
   - Added state reset after stopping

**Key Changes**:

```typescript
// Before (mic button only opened voice mode)
onPress={async () => {
  // ...check language, open voice mode
  setShowVoiceMode(true);
}}

// After (mic button toggles voice mode on/off)
onPress={async () => {
  // If already open, close it and stop audio
  if (showVoiceMode) {
    await dashInstance.stopSpeaking();
    setShowVoiceMode(false);
    return;
  }
  // Otherwise open voice mode
  setShowVoiceMode(true);
}}
```

### 4. Voice Module Initialization Error Fix
**Problem**: VoiceRecordingModalNew crashed with `TypeError: Cannot read property 'startSpeech' of null` when trying to start voice recognition.

**Error**: 
```
ERROR  [VoiceModal] Error starting: [TypeError: Cannot read property 'startSpeech' of null]
```

**Root Cause**:
1. Voice module wasn't being properly checked for availability before use
2. No async initialization check with `Voice.isAvailable()`
3. No check if already recording before starting new session
4. Poor error messaging didn't guide users to solutions

**Files Updated**:
- `components/ai/VoiceRecordingModalNew.tsx`
  - Added async `initVoice()` function with proper availability check
  - Added `Voice.isAvailable()` call before setup
  - Added `Voice.isRecognizing()` check before starting
  - Added mounted flag to prevent state updates on unmounted component
  - Enhanced error messages with permission-specific guidance
  - Added fallback options to type message if voice unavailable

**Key Changes**:
```typescript
// Before (synchronous, no availability check)
if (!Voice) {
  setIsAvailable(false);
  return;
}
Voice.onSpeechStart = () => { ... };

// After (async with proper checks)
const available = await Voice.isAvailable();
if (!available) {
  if (mounted) setIsAvailable(false);
  return;
}
```

## Testing Recommendations

1. **Test Old Context Removal**:
   - Open Dash AI assistant
   - Trigger an AI Gateway error (e.g., exceed rate limit)
   - Verify error logs show `[Dash AI]` not `[Dash Agent]`

2. **Test Voice Mode Stopping**:
   - Open Dash AI assistant
   - Click the mic button (orb icon) to start Voice Mode
   - Say something to trigger a response
   - While Dash is speaking, click the mic button again
   - **Expected**: Voice should stop immediately and Voice Mode should close
   - **Visual**: Mic button should be red while Voice Mode is active

3. **Test Multiple Stop Methods**:
   - Start Voice Mode and get Dash speaking
   - Try stopping via:
     - Mic button toggle
     - X close button in Voice Mode
     - Stop button in Voice Mode (when speaking)
   - All should cleanly stop audio and close modal

## Architecture Notes

### TTS Stopping Hierarchy
When stopping Dash's speech, we must stop ALL audio systems:

1. **DashInstance TTS** - Primary TTS system via Edge Functions
2. **Audio Manager** - Native audio playback manager  
3. **Device TTS** - Expo Speech fallback

This ensures no audio continues playing after user requests stop.

### Voice Mode State Management
The `abortSpeechRef` flag is critical - it must be set **before** calling stop functions to prevent race conditions where new speech starts while old speech is stopping.

## Related Documentation

- Voice system architecture: `docs/VOICE_SYSTEM.md`
- Dash AI assistant guide: `docs/features/DashAIAssistant.md`
- Audio manager: `lib/voice/audio.ts`

## Commit Message

```
fix(dash-ai): Update branding from "Dash Agent" to "Dash AI" and fix voice mode stopping

- Replace all [Dash Agent] log messages with [Dash AI]
- Add mic button toggle to stop voice mode when active
- Improve voice mode close handler to stop all TTS systems
- Add visual feedback (red button) when voice mode is active
- Set abortSpeechRef flag before stopping to prevent race conditions

Fixes: Voice mode not stoppable when Dash is speaking
```
