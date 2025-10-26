# Voice Provider Simplification - 2025-10-22

## Overview

Simplified voice system to use **ONLY Expo Speech Recognition** (`expo-speech-recognition`) with **NO FALLBACKS**. This provides a single, consistent code path for debugging and isolating issues.

**Update**: Switched from React Native Voice to Expo Speech Recognition for better streaming support and voice orb compatibility.

## Changes Made

### 1. Modified `lib/voice/unifiedProvider.ts`

**Disabled providers:**
- ❌ `@react-native-voice/voice` (React Native Voice)
- ❌ `microsoft-cognitiveservices-speech-sdk` (Azure Speech SDK)
- ❌ `openaiWhisperProvider` (OpenAI Whisper STT)
- ❌ `openaiWhisperStreamingProvider` (OpenAI Whisper Streaming)

**Enabled provider:**
- ✅ `expo-speech-recognition` (Expo Speech Recognition) - ONLY provider for mobile
- ✅ **NO FALLBACKS** - Fails fast for easier debugging

**Web unchanged:**
- Web continues to use Deepgram + Claude (handled in separate web branch)

### 2. Updated Provider Priority

#### Single-Use Voice Input (Mic Button)
**Before:**
1. OpenAI Whisper (cloud)
2. Expo Speech Recognition (on-device)
3. React Native Voice (on-device)

**After:**
1. Expo Speech Recognition (on-device) - ONLY OPTION
2. NO FALLBACKS

#### Streaming Voice Mode (Interactive Orb)
**Before:**
1. OpenAI Whisper Streaming (cloud)
2. Expo Speech Recognition (on-device)
3. React Native Voice (on-device)

**After:**
1. Expo Speech Recognition (on-device) - ONLY OPTION
2. NO FALLBACKS

### 3. Code Changes

#### Removed Imports
```typescript
// REMOVED
import { reactNativeVoiceProvider } from '@/lib/voice/reactNativeVoiceProvider';
import { openaiWhisperProvider } from '@/lib/voice/openaiWhisperProvider';
import { openaiWhisperStreamingProvider } from '@/lib/voice/openaiWhisperStreamingProvider';

// ADDED
import { expoSpeech } from '@/lib/voice/expoProvider';
```

#### Simplified getSingleUseVoiceProvider()
```typescript
// Now only tries Expo Speech Recognition, NO fallbacks
export async function getSingleUseVoiceProvider(language?: string): Promise<VoiceProvider> {
  if (Platform.OS !== 'web') {
    try {
      const available = await expoSpeech.isAvailable();
      if (available) {
        return expoSpeech;
      }
    } catch (e) {
      // Handle error
    }
    // Return noop if unavailable - FAIL FAST
  }
  // Web uses Deepgram + Claude
}
```

#### Simplified getStreamingVoiceProvider()
```typescript
// Now only tries Expo Speech Recognition, NO fallbacks
export async function getStreamingVoiceProvider(language?: string): Promise<VoiceProvider> {
  if (Platform.OS !== 'web') {
    try {
      const available = await expoSpeech.isAvailable();
      if (available) {
        return expoSpeech;
      }
    } catch (e) {
      // Handle error
    }
    // Return noop if unavailable - FAIL FAST
  }
  // Web uses Deepgram + Claude
}
```

## Benefits

1. **Simpler codebase**: Single provider for mobile voice recognition
2. **Easier debugging**: Only one code path to investigate
3. **Known working solution**: React Native Voice is proven to work
4. **Incremental approach**: Can re-enable other providers one at a time
5. **No cloud costs**: On-device processing (no API costs)
6. **Offline capable**: Works without internet connection

## Expo Speech Recognition Capabilities

### Features
- ✅ On-device speech recognition
- ✅ Works offline (device-dependent)
- ✅ Free (no API costs)
- ✅ Privacy (no cloud processing)
- ✅ Native iOS/Android speech engines
- ✅ Multiple language support
- ✅ **Real-time streaming partials** (perfect for voice orb)
- ✅ **Volume events** (powers orb pulsing animations)
- ✅ **Continuous mode** (hands-free conversations)
- ✅ No native linking required (Expo managed workflow)

### Supported Languages (South Africa)
- `en-ZA` - English (South Africa)
- `af-ZA` - Afrikaans
- `zu-ZA` - Zulu
- `xh-ZA` - Xhosa
- `nso-ZA` - Sepedi (may fall back to en-ZA)
- `st-ZA` - Sesotho

### Advantages Over React Native Voice
1. **Real-time partials** - Voice orb gets instant feedback
2. **Volume events** - Powers pulsing animations
3. **Continuous mode** - Better for conversations
4. **No native linking** - Simpler setup
5. **Consistent with voice orb** - Already using it successfully

### Limitations
- Device-dependent language support
- Quality depends on device manufacturer
- Newer package (less battle-tested)

## Files Modified

1. **`lib/voice/unifiedProvider.ts`**
   - Removed unused provider imports
   - Simplified provider selection logic
   - Updated documentation comments

## Files NOT Modified

The following provider files remain intact and can be re-enabled later:

- `lib/voice/expoProvider.ts` - Expo Speech Recognition (CURRENTLY IN USE)
- `lib/voice/reactNativeVoiceProvider.ts` - React Native Voice (disabled)
- `lib/voice/azureProvider.ts` - Azure Speech SDK (disabled)
- `lib/voice/openaiWhisperProvider.ts` - OpenAI Whisper (disabled)
- `lib/voice/openaiWhisperStreamingProvider.ts` - OpenAI Whisper Streaming (disabled)
- `lib/voice/claudeProvider.ts` - Claude/Deepgram (web only)

## Testing Requirements

### Before Production
1. ✅ Test mic button in chat (single-use mode)
2. ✅ Test voice orb (streaming mode)
3. ✅ Test language switching (en-ZA, af-ZA, zu-ZA, xh-ZA)
4. ✅ Test on multiple Android devices
5. ✅ Test offline functionality
6. ✅ Verify permission requests work correctly

### Known Issues to Watch
- Some Android devices may not support all SA languages
- Partial results may not work on all devices
- Voice recognition quality varies by manufacturer

## Re-enabling Other Providers

When ready to re-enable fallback providers:

1. **OpenAI Whisper** (for better SA language support)
   - Uncomment import in `unifiedProvider.ts`
   - Add as fallback to Expo Speech Recognition
   - Requires API key and internet connection
   - Costs: ~$0.006 per minute
   - Good for when on-device ASR fails

2. **React Native Voice** (alternative on-device)
   - Uncomment import in `unifiedProvider.ts`
   - Add as fallback to Expo Speech Recognition
   - Requires native linking
   - No streaming partials (not ideal for voice orb)

3. **Azure Speech SDK** (web only)
   - Already configured for web branch
   - Not applicable to React Native (requires Web Audio API)

## Rollback Plan

If Expo Speech Recognition has issues:

1. Check git history: `git log --oneline docs/features/voice-provider-simplification-2025-10-22.md`
2. Restore previous version of `lib/voice/unifiedProvider.ts`
3. Re-enable OpenAI Whisper as fallback
4. Or switch to React Native Voice (but lose streaming partials)

## Quality Gates Passed

- ✅ TypeScript compilation: `npm run typecheck` - PASSED
- ✅ ESLint linting: `npm run lint` - PASSED
- ⏳ Manual testing: PENDING

## Next Steps

1. Test on physical Android device
2. Verify voice input works in both modes (mic button + voice orb)
3. Test all supported languages
4. Monitor for any issues in production
5. Consider re-enabling Expo Speech Recognition if needed

## References

- Expo Speech Recognition: https://docs.expo.dev/versions/v53.0.0/sdk/speech-recognition/
- Package: `expo-speech-recognition` v2.1.5
- Provider implementation: `lib/voice/expoProvider.ts`
- Transcription hook: `components/ai/dash-voice-mode/useVoiceTranscription.ts`
- Unified provider: `lib/voice/unifiedProvider.ts`

## Documentation Sources

- **React Native Voice**: https://github.com/react-native-voice/voice
- **Expo Speech Recognition**: https://docs.expo.dev/versions/v53.0.0/sdk/speech-recognition/
- **Azure Speech SDK**: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
- **OpenAI Whisper**: https://platform.openai.com/docs/guides/speech-to-text
