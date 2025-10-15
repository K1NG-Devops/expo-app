# Dash Voice Improvements Guide

## Current State

**TTS Engine**: `expo-speech` (React Native wrapper for device TTS)
**Voice**: System default (varies by device)
**Language**: en-US
**Pitch**: 1.0 (normal)
**Rate**: 0.8 (slightly slower for clarity)

### Limitations
- **Device-dependent**: Voice quality varies by device/OS
- **Limited voice selection**: expo-speech doesn't expose all device voices  
- **No gender/style control**: Can't specify warm/calm/friendly male voice
- **Language accents limited**: Device TTS may not have native accents for all languages

---

## Solution 1: Enhanced Device TTS (Quick Win)

### Available on React Native/Expo

`expo-speech` can access device voices, but requires listing available voices first.

### Implementation

```typescript
import * as Speech from 'expo-speech';

// 1. List available voices on device
const getAvailableVoices = async (language: string = 'en') => {
  const voices = await Speech.getAvailableVoicesAsync();
  console.log('Available voices:', voices);
  
  // Filter by language and look for male voices
  const languageVoices = voices.filter(v => 
    v.language.startsWith(language)
  );
  
  // On iOS: Look for names like "Daniel", "Oliver"
  // On Android: Look for "male" in identifier or quality "veryHigh"
  const maleVoices = languageVoices.filter(v =>
    v.identifier?.toLowerCase().includes('male') ||
    v.name?.match(/Daniel|Oliver|Matthew|Aaron|Alex/i) // Common male TTS names
  );
  
  return { all: languageVoices, male: maleVoices };
};

// 2. Configure Dash to use a specific voice
voice_settings: {
  rate: 0.85, // Slightly slower for warm, calm delivery
  pitch: 0.95, // Slightly lower for male voice
  language: 'en-US',
  voice: 'com.apple.ttsbundle.Daniel-compact' // iOS example
  // voice: 'en-us-x-iom-local' // Android example
}

// 3. Select best voice for user's language
const selectBestVoice = async (targetLanguage: string) => {
  const voices = await Speech.getAvailableVoicesAsync();
  
  // Priority order: high quality male voices
  const filtered = voices
    .filter(v => v.language.startsWith(targetLanguage.slice(0, 2)))
    .sort((a, b) => {
      // Prefer male voices
      const aMale = a.identifier?.includes('male') ? 1 : 0;
      const bMale = b.identifier?.includes('male') ? 1 : 0;
      if (aMale !== bMale) return bMale - aMale;
      
      // Prefer high quality
      const qualityOrder = { veryHigh: 4, high: 3, normal: 2, low: 1 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });
  
  return filtered[0]?.identifier || undefined;
};
```

### Changes Required

**File**: `services/DashAIAssistant.ts`

1. Add voice discovery on init
2. Store preferred voices per language
3. Update `speakResponse()` to use selected voice

**Pros**:
- ✅ Works offline
- ✅ Fast (no network latency)
- ✅ Free (no API costs)
- ✅ Respects user's device settings

**Cons**:
- ❌ Quality varies by device
- ❌ Limited voice selection (device-dependent)
- ❌ May not have all languages with good accents

---

## Solution 2: Cloud TTS Services (Best Quality)

For professional, natural-sounding voices with full control.

### Option A: Google Cloud Text-to-Speech

**Best for**: Wide language support, Neural voices, WaveNet quality

```typescript
// Integration via Supabase Edge Function
const googleTTS = async (text: string, voiceConfig: {
  language: string;
  name: string; // e.g., 'en-US-Neural2-D' (male)
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
}) => {
  const { data } = await supabase.functions.invoke('google-tts', {
    body: {
      text,
      voice: {
        languageCode: voiceConfig.language,
        name: voiceConfig.name,
        ssmlGender: voiceConfig.gender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        pitch: -2.0, // Lower for warm male voice
        speakingRate: 0.9
      }
    }
  });
  
  return data.audioContent; // base64 MP3
};
```

**Available Voices** (examples):
- **en-US-Neural2-D**: Male, warm, conversational
- **en-GB-Neural2-B**: Male, British accent
- **en-ZA-Standard-A**: Male, South African accent
- **af-ZA-Standard-A**: Male, Afrikaans
- **zu-ZA-Standard-A**: Male, Zulu

**Pricing**: $4 per 1M characters (Neural), $16 per 1M characters (WaveNet)

### Option B: Azure Cognitive Services TTS

**Best for**: Most natural voices, fine-grained prosody control

```typescript
const azureTTS = async (text: string, voice: string) => {
  const { data } = await supabase.functions.invoke('azure-tts', {
    body: {
      text,
      voice: voice, // e.g., 'en-US-GuyNeural' (male, friendly)
      style: 'friendly', // Options: friendly, cheerful, calm, professional
      pitch: '-5%',
      rate: '-10%'
    }
  });
  
  return data.audioContent;
};
```

**Available Voices** (examples):
- **en-US-GuyNeural**: Male, warm, friendly
- **en-US-DavisNeural**: Male, calm, professional
- **en-GB-RyanNeural**: Male, British accent
- **en-ZA-LukeNeural**: Male, South African accent
- **af-ZA-WillemNeural**: Male, Afrikaans
-  **zu-ZA-ThembaNeural**: Male, Zulu

**Pricing**: $15 per 1M characters (Neural)

### Option C: Amazon Polly

**Best for**: Cost-effective, good quality, easy integration

```typescript
const pollyTTS = async (text: string, voice: string) => {
  const { data } = await supabase.functions.invoke('polly-tts', {
    body: {
      text,
      voiceId: voice, // e.g., 'Matthew' (male, US)
      engine: 'neural',
      languageCode: 'en-US'
    }
  });
  
  return data.audioStream;
};
```

**Available Voices** (examples):
- **Matthew**: Male, warm, conversational (en-US)
- **Justin**: Male, casual (en-US)
- **Brian**: Male, British accent (en-GB)

**Pricing**: $4 per 1M characters (Neural)

---

## Recommended Approach: Hybrid Solution

### Strategy
1. **Default**: Enhanced device TTS (free, fast, offline)
2. **Premium**: Cloud TTS for paid tiers (best quality)
3. **Fallback**: Always fall back to device TTS if cloud fails

### Implementation Plan

#### Phase 1: Enhanced Device TTS (Immediate)
```typescript
// Add to DashAIAssistant initialization
private async initializeVoices() {
  const voices = await Speech.getAvailableVoicesAsync();
  
  // Find best male voice for each language
  const languageVoices: Record<string, string> = {};
  
  for (const lang of ['en-US', 'en-GB', 'en-ZA', 'af-ZA']) {
    const bestVoice = voices
      .filter(v => v.language === lang)
      .filter(v => this.isMaleVoice(v))
      .sort((a, b) => this.voiceQualityScore(b) - this.voiceQualityScore(a))[0];
    
    if (bestVoice) {
      languageVoices[lang] = bestVoice.identifier;
    }
  }
  
  this.availableVoices = languageVoices;
}

private isMaleVoice(voice: Speech.Voice): boolean {
  const maleName = voice.name?.match(/Daniel|Oliver|Matthew|Aaron|Alex|Thomas|Male/i);
  const maleId = voice.identifier?.includes('male');
  return !!(maleName || maleId);
}

private voiceQualityScore(voice: Speech.Voice): number {
  const qualityScores = { veryHigh: 4, high: 3, normal: 2, low: 1 };
  return qualityScores[voice.quality] || 0;
}
```

#### Phase 2: Cloud TTS Integration (For Premium)
```typescript
// Add Edge Function: supabase/functions/tts-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { text, language, voice, provider = 'google' } = await req.json();
  
  // Check user's subscription tier
  const tier = getUserTier(req);
  if (tier === 'free' || tier === 'starter') {
    return new Response(JSON.stringify({ error: 'Premium feature' }), {
      status: 403
    });
  }
  
  // Call appropriate TTS service
  let audioContent;
  switch (provider) {
    case 'google':
      audioContent = await callGoogleTTS(text, language, voice);
      break;
    case 'azure':
      audioContent = await callAzureTTS(text, language, voice);
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unknown provider' }), {
        status: 400
      });
  }
  
  return new Response(JSON.stringify({ audioContent, format: 'mp3' }));
});
```

#### Phase 3: User Settings
```typescript
// Add voice preferences to user profile
interface VoicePreferences {
  provider: 'device' | 'google' | 'azure' | 'polly';
  language: string;
  voiceId?: string;
  style?: 'friendly' | 'professional' | 'calm';
  pitch?: number;
  rate?: number;
}

// Allow users to preview and select voices
const VoiceSettingsScreen = () => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selected, setSelected] = useState<string>();
  
  useEffect(() => {
    loadAvailableVoices();
  }, []);
  
  const previewVoice = async (voice: Voice) => {
    await Speech.speak("Hi! I'm Dash, your AI teaching assistant.", {
      voice: voice.identifier,
      rate: 0.85,
      pitch: 0.95
    });
  };
  
  return (
    <View>
      {voices.map(voice => (
        <TouchableOpacity key={voice.identifier} onPress={() => previewVoice(voice)}>
          <Text>{voice.name} ({voice.language})</Text>
          <Text>Quality: {voice.quality}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

---

## Recommended Voice Configuration

### For Dash (Warm, Calm, Friendly Male Voice)

#### Device TTS (iOS)
```typescript
voice_settings: {
  rate: 0.85, // Slightly slower for calm delivery
  pitch: 0.92, // Slightly lower for warmth
  language: 'en-US',
  voice: 'com.apple.ttsbundle.Daniel-compact' // or 'Oliver' for British
}
```

#### Device TTS (Android)
```typescript
voice_settings: {
  rate: 0.90,
  pitch: 0.88,
  language: 'en-US',
  voice: 'en-us-x-iom-local' // Google TTS male voice
}
```

#### Google Cloud TTS (Premium)
```typescript
voice_settings: {
  provider: 'google',
  language: 'en-US',
  voice: 'en-US-Neural2-D', // Warm male voice
  pitch: -2.0,
  speakingRate: 0.9,
  style: 'conversational'
}
```

#### Azure TTS (Premium)
```typescript
voice_settings: {
  provider: 'azure',
  language: 'en-US',
  voice: 'en-US-GuyNeural', // Friendly male voice
  style: 'friendly',
  pitch: '-5%',
  rate: '-10%'
}
```

---

## Multi-Language Support

### Supported Languages with Native Accents

| Language | Code | Best Voice (Cloud) | Device TTS |
|----------|------|-------------------|------------|
| English (US) | en-US | Guy (Azure), Neural2-D (Google) | ✅ |
| English (UK) | en-GB | Ryan (Azure), Neural2-B (Google) | ✅ |
| English (ZA) | en-ZA | Luke (Azure), Standard-A (Google) | ⚠️ Limited |
| Afrikaans | af-ZA | Willem (Azure), Standard-A (Google) | ⚠️ Limited |
| Zulu | zu-ZA | Themba (Azure), Standard-A (Google) | ❌ Rare |
| Xhosa | xh-ZA | *(Not available)* | ❌ |
| Sotho | st-ZA | *(Not available)* | ❌ |

### Language Detection & Auto-Selection
```typescript
const selectVoiceForLanguage = (language: string, tier: 'free' | 'premium') => {
  if (tier === 'premium') {
    // Use cloud TTS with native accents
    return CLOUD_VOICES[language] || CLOUD_VOICES['en-US'];
  } else {
    // Use device TTS
    return this.availableVoices[language] || undefined;
  }
};
```

---

## Implementation Checklist

### Immediate (Device TTS Enhancement)
- [ ] Add voice discovery on app init
- [ ] Filter for male voices
- [ ] Adjust pitch/rate for warm tone
- [ ] Store user's preferred voice
- [ ] Add voice preview in settings

### Short Term (Cloud TTS Integration)
- [ ] Create `tts-proxy` Edge Function
- [ ] Integrate Google Cloud TTS
- [ ] Add subscription tier checking
- [ ] Implement audio caching
- [ ] Add fallback to device TTS

### Long Term (Full Voice Control)
- [ ] Voice settings screen
- [ ] Multi-language voice selection
- [ ] Style/emotion control (friendly, professional, etc.)
- [ ] Voice preview for all options
- [ ] Per-role voice customization

---

## Cost Estimation

### Cloud TTS Usage (Premium Tier)
- Average response: 100 characters
- Monthly usage: 1000 responses
- Total characters: 100,000

**Cost**: ~$0.40/month per user (Google Neural)

### Recommendation
- Free/Starter tiers: Device TTS only
- Premium/Enterprise: Cloud TTS with device fallback

---

## Next Steps

1. **Immediate**: Implement enhanced device TTS voice selection
2. **Week 1**: Add voice settings to user preferences
3. **Week 2**: Create TTS proxy Edge Function
4. **Week 3**: Integrate Google Cloud TTS for premium users
5. **Week 4**: Add multi-language support with native accents

Would you like me to implement the immediate device TTS enhancement now?
