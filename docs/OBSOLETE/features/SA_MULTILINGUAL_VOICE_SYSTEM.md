# South African Multilingual Voice System Implementation Plan

**Status**: Planning Phase  
**Priority**: High  
**Target Languages**: Afrikaans (af-ZA), Zulu (zu-ZA), Xhosa (xh-ZA), Sepedi (nso-ZA)  
**Scope**: Both Speech-to-Text (STT) and Text-to-Speech (TTS)  
**Approach**: Cloud-first with device fallbacks

---

## 🎯 Executive Summary

EduDash Pro needs a robust, production-grade voice system that supports South Africa's linguistic diversity. This plan delivers high-quality STT and TTS for Afrikaans, Zulu, Xhosa, and Sepedi to enable:

- **Teachers**: Recording voice notes in their native language
- **Parents**: Communicating with schools in their home language
- **Students**: Learning in their mother tongue
- **Dash AI**: Responding naturally in multiple SA languages

### Key Design Principles

1. **Cloud-First Architecture**: Leverage Azure Cognitive Services (primary) and Google Cloud (fallback) for best quality
2. **Robust Fallback Chain**: Azure → Google → OpenAI Whisper → Device TTS
3. **Cost-Conscious**: Aggressive server-side and client-side caching
4. **Privacy-Focused**: All cloud API calls via Supabase Edge Functions (never expose keys on client)
5. **WARP.md Compliant**: Strict RLS, tenant isolation, migration-based schema changes

---

## 📊 Provider Comparison & Recommendations

### Azure Cognitive Services Speech (PRIMARY)

**Strengths**:
- ✅ **Best SA Coverage**: High-quality neural voices for af-ZA, zu-ZA, xh-ZA
- ✅ **Emotional Styles**: SSML support for friendly/professional/empathetic tones
- ✅ **Low Latency**: ~1-2s TTS, ~2-3s STT
- ✅ **Word-Level Timestamps**: Precise STT alignment

**Limitations**:
- ⚠️ Sepedi (nso-ZA) STT support uncertain (region-dependent)
- 💰 Pricing: TTS Neural ~$16/1M chars; STT ~$1-$1.6/audio hour

**Use Cases**: Primary for af/zu/xh TTS; primary for af/zu/xh STT

### Google Cloud Speech & TTS (FALLBACK)

**Strengths**:
- ✅ Good af-ZA, zu-ZA, xh-ZA STT accuracy
- ✅ Reliable uptime and REST API simplicity
- ✅ SSML support

**Limitations**:
- ⚠️ Neural TTS quality lags Azure for SA languages
- ⚠️ nso-ZA coverage limited
- 💰 Pricing: STT ~$1.44-$2.88/hour; TTS Neural ~$16/1M chars

**Use Cases**: Fallback when Azure fails; cost optimization for bulk STT

### OpenAI Whisper (STT FALLBACK)

**Strengths**:
- ✅ Excellent low-resource language support (best for nso-ZA)
- ✅ Language detection capability
- ✅ High accuracy even for accented speech

**Limitations**:
- ❌ No real-time streaming
- 💰 API costs variable; self-hosting requires infrastructure

**Use Cases**: Primary for Sepedi STT; tertiary fallback for other languages

### Device TTS (expo-speech) (FINAL FALLBACK)

**Strengths**:
- ✅ Zero cost, offline capable
- ✅ Instant availability

**Limitations**:
- ❌ Quality varies widely by device/OS version
- ❌ Limited voice selection
- ❌ Inconsistent SA language support

**Use Cases**: Offline mode; quota exceeded; premium feature gate for free tier

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EduDash Pro Client                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   VoicePipeline (lib/voice-pipeline.ts)              │   │
│  │   - Record (16kHz mono AAC)                          │   │
│  │   - Transcribe (multipart upload)                    │   │
│  │   - Synthesize (text → audio URL)                    │   │
│  │   - Play (stream + cache)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│               ↓                           ↓                  │
│     ┌────────────────┐        ┌────────────────────┐        │
│     │ TanStack Query │        │  AsyncStorage      │        │
│     │  (cache STT/   │        │  (offline queue)   │        │
│     │   TTS results) │        └────────────────────┘        │
│     └────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                       ↓ HTTPS (JWT Auth)
┌─────────────────────────────────────────────────────────────┐
│            Supabase Edge Functions (Deno)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  tts-proxy                  transcribe-audio         │   │
│  │  - Language routing         - Multipart handling     │   │
│  │  - Provider fallback        - Language detection     │   │
│  │  - Cache check/store        - Fallback chain         │   │
│  │  - Usage logging            - Word timestamps        │   │
│  └──────────────────────────────────────────────────────┘   │
│               ↓                           ↓                  │
│     ┌─────────────────┐      ┌──────────────────────┐       │
│     │ tts_audio_cache │      │ voice_usage_logs     │       │
│     │ + Storage bucket│      │ (cost tracking)      │       │
│     └─────────────────┘      └──────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                       ↓ Cloud APIs
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Providers                           │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐  │
│  │  Azure   │   │  Google  │   │ OpenAI   │   │ Device  │  │
│  │ Cognitive│   │  Cloud   │   │ Whisper  │   │   TTS   │  │
│  │  Speech  │   │  STT/TTS │   │   API    │   │ (final) │  │
│  └──────────┘   └──────────┘   └──────────┘   └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Routing Logic

**TTS (Text → Speech)**:
```
af/zu/xh → Azure Neural TTS (style: friendly)
         ↓ (timeout 2s or error)
         → Google Cloud TTS
         ↓ (timeout 2s or error)
         → Device TTS (expo-speech)

nso/st → Azure Neural TTS (if available in region)
       ↓ (timeout 2s or error)
       → Google Cloud TTS
       ↓ (timeout 2s or error)
       → Device TTS (expo-speech)
```

**STT (Speech → Text)**:
```
af/zu/xh → Azure STT (real-time)
         ↓ (timeout 2s or error)
         → Google Cloud STT
         ↓ (timeout 2s or error)
         → OpenAI Whisper
         ↓ (timeout 8s or error)
         → Device STT (best-effort)

nso/st → OpenAI Whisper (primary)
       ↓ (timeout 8s or error)
       → Azure STT (if supported)
       ↓ (timeout 2s or error)
       → Google Cloud STT
       ↓ (timeout 8s or error)
       → Device STT
```

---

## 🚀 Implementation Phases

### PHASE 1: Research & Provider Verification (1 week)

**Objectives**:
- Verify Azure voice availability for af-ZA, zu-ZA, xh-ZA, nso-ZA in your region
- Create PoC with 10-20 curated utterances per language
- Measure accuracy (WER), latency, and cost per language/provider

**Deliverables**:
- Provider capability matrix (Google Sheet or Markdown table)
- Test audio corpus (20 clips × 4 languages = 80 samples)
- Latency/accuracy benchmark report

**Scripts**:
```bash
# Test Azure STT
curl -X POST "https://<region>.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zu-ZA" \
  -H "Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY" \
  --data-binary @test-zulu.wav

# Test Google Cloud STT
gcloud ml speech recognize test-zulu.wav --language-code=zu-ZA
```

---

### PHASE 2: Edge Functions Setup (2 weeks)

#### 2.1 Create `tts-proxy` Edge Function

**File**: `supabase/functions/tts-proxy/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const AZURE_SPEECH_KEY = Deno.env.get('AZURE_SPEECH_KEY')!;
const AZURE_SPEECH_REGION = Deno.env.get('AZURE_SPEECH_REGION')!;
const GOOGLE_TTS_API_KEY = Deno.env.get('GOOGLE_CLOUD_TTS_API_KEY');

interface TTSRequest {
  text: string;
  lang: 'af' | 'zu' | 'xh' | 'st' | 'nso';
  voiceId?: string;
  style?: 'friendly' | 'empathetic' | 'professional';
  rate?: number; // -50 to +50
  pitch?: number; // -50 to +50
  format?: 'mp3' | 'ogg' | 'wav';
}

serve(async (req) => {
  const { text, lang, voiceId, style, rate, pitch, format = 'mp3' }: TTSRequest = await req.json();
  
  // Map lang to provider code
  const langMap = { af: 'af-ZA', zu: 'zu-ZA', xh: 'xh-ZA', st: 'nso-ZA', nso: 'nso-ZA' };
  const providerLang = langMap[lang];
  
  // Check cache
  const cacheHash = hashTTSRequest(text, lang, voiceId, style, rate, pitch);
  const cached = await checkTTSCache(cacheHash);
  if (cached) {
    return new Response(JSON.stringify({ audioUrl: cached.url, provider: cached.provider, cacheHit: true }));
  }
  
  // Try Azure first
  try {
    const audioUrl = await synthesizeAzure(text, providerLang, voiceId, style, rate, pitch);
    await storeTTSCache(cacheHash, audioUrl, 'azure', text, lang);
    return new Response(JSON.stringify({ audioUrl, provider: 'azure', cacheHit: false }));
  } catch (azureError) {
    console.error('Azure TTS failed:', azureError);
  }
  
  // Fallback to Google
  if (GOOGLE_TTS_API_KEY) {
    try {
      const audioUrl = await synthesizeGoogle(text, providerLang);
      await storeTTSCache(cacheHash, audioUrl, 'google', text, lang);
      return new Response(JSON.stringify({ audioUrl, provider: 'google', cacheHit: false }));
    } catch (googleError) {
      console.error('Google TTS failed:', googleError);
    }
  }
  
  // Final fallback: instruct client to use device TTS
  return new Response(JSON.stringify({ fallback: 'device', lang }), { status: 200 });
});

async function synthesizeAzure(text: string, lang: string, voiceId?: string, style?: string, rate?: number, pitch?: number): Promise<string> {
  // Build SSML with style/rate/pitch
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
      <voice name="${voiceId || getDefaultAzureVoice(lang)}">
        <prosody rate="${rate || 0}%" pitch="${pitch || 0}%">
          <mstts:express-as style="${style || 'friendly'}">
            ${text}
          </mstts:express-as>
        </prosody>
      </voice>
    </speak>
  `;
  
  const response = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: ssml,
  });
  
  if (!response.ok) throw new Error(`Azure TTS failed: ${response.status}`);
  
  const audioBlob = await response.blob();
  const storagePath = `tts-cache/${Date.now()}-${Math.random().toString(36)}.mp3`;
  await uploadToStorage(storagePath, audioBlob);
  
  return getSignedUrl(storagePath);
}

function getDefaultAzureVoice(lang: string): string {
  const voiceMap = {
    'af-ZA': 'af-ZA-AdriNeural', // Female, update to male if preferred
    'zu-ZA': 'zu-ZA-ThandoNeural', // Male
    'xh-ZA': 'xh-ZA-YaandeNeural', // Female
    'nso-ZA': 'af-ZA-WillemNeural', // Fallback to Afrikaans if nso not available
  };
  return voiceMap[lang] || voiceMap['af-ZA'];
}
```

#### 2.2 Enhance `transcribe-audio` Edge Function

**File**: `supabase/functions/transcribe-audio/index.ts` (EXISTING - ENHANCE)

Add language detection and multi-provider routing:

```typescript
// Add after existing providers
async function transcribeWithAzure(audioUrl: string, language: string): Promise<TranscriptionResponse> {
  const AZURE_SPEECH_KEY = Deno.env.get('AZURE_SPEECH_KEY')!;
  const AZURE_SPEECH_REGION = Deno.env.get('AZURE_SPEECH_REGION')!;
  
  const response = await fetch(
    `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav',
      },
      body: await fetch(audioUrl).then(r => r.blob()),
    }
  );
  
  if (!response.ok) throw new Error(`Azure STT failed: ${response.status}`);
  
  const result = await response.json();
  return {
    transcript: result.DisplayText,
    language,
    confidence: result.NBest?.[0]?.Confidence,
  };
}

// Update transcribeAudio to use provider chain
async function transcribeAudio(request: Request): Promise<Response> {
  // ... existing code ...
  
  const langMap = { af: 'af-ZA', zu: 'zu-ZA', xh: 'xh-ZA', st: 'nso-ZA', nso: 'nso-ZA' };
  const providerLang = langMap[language] || 'en-US';
  
  // Try Azure first for af/zu/xh
  if (['af-ZA', 'zu-ZA', 'xh-ZA'].includes(providerLang) && AZURE_SPEECH_KEY) {
    try {
      transcription = await transcribeWithAzure(audioUrl, providerLang);
      providerUsed = 'azure';
    } catch (azureError) {
      console.error('Azure STT failed, trying fallback:', azureError);
    }
  }
  
  // Fallback to Whisper for nso or if Azure failed
  if (!transcription) {
    transcription = await transcribeWithOpenAI(audioUrl, language);
    providerUsed = 'whisper';
  }
  
  // ... rest of existing code ...
}
```

#### 2.3 Environment Variables

Add to Supabase project settings (Dashboard → Settings → Edge Functions):

```bash
AZURE_SPEECH_KEY=your_azure_key_here
AZURE_SPEECH_REGION=southafricanorth  # or your region
GOOGLE_CLOUD_TTS_API_KEY=your_google_key_here
GOOGLE_CLOUD_STT_API_KEY=your_google_key_here
STORAGE_BUCKET_TTS=tts-cache
FUNCTION_VOICE_FEATURE_ENABLED=true
```

---

### PHASE 3: Client-Side Integration (2 weeks)

#### 3.1 Enhance VoicePipeline

**File**: `lib/voice-pipeline.ts` (EXISTING - ENHANCE)

Add TTS synthesis method:

```typescript
export class VoicePipeline {
  // ... existing code ...
  
  /**
   * Synthesize text to speech via cloud or device
   */
  public async synthesize(
    text: string,
    lang: SupportedLanguage = 'en',
    options?: {
      voiceId?: string;
      style?: 'friendly' | 'empathetic' | 'professional';
      rate?: number;
      pitch?: number;
    }
  ): Promise<{ uri: string; provider: string; cached: boolean }> {
    try {
      // Check client-side cache first
      const cacheKey = this.getTTSCacheKey(text, lang, options);
      const cachedUri = await this.getTTSFromCache(cacheKey);
      if (cachedUri) {
        return { uri: cachedUri, provider: 'cache', cached: true };
      }
      
      // Call tts-proxy Edge Function
      const response = await supabase.functions.invoke('tts-proxy', {
        body: { text, lang, ...options },
      });
      
      if (response.error) throw response.error;
      
      const { audioUrl, provider, fallback } = response.data;
      
      // If cloud failed, use device TTS
      if (fallback === 'device') {
        const deviceUri = await this.synthesizeDevice(text, lang);
        return { uri: deviceUri, provider: 'device', cached: false };
      }
      
      // Download and cache audio
      const localUri = await this.downloadAndCache(audioUrl, cacheKey);
      
      track('edudash.voice.tts_success', { lang, provider, cached: false });
      
      return { uri: localUri, provider, cached: false };
    } catch (error) {
      logger.error('TTS synthesis failed, falling back to device', error);
      const deviceUri = await this.synthesizeDevice(text, lang);
      return { uri: deviceUri, provider: 'device', cached: false };
    }
  }
  
  private async synthesizeDevice(text: string, lang: string): Promise<string> {
    // Use expo-speech to synthesize
    const langMap = { af: 'af-ZA', zu: 'zu-ZA', xh: 'xh-ZA', st: 'nso-ZA', nso: 'nso-ZA' };
    const speechLang = langMap[lang] || 'en-US';
    
    // Note: expo-speech doesn't return file URI, so we play directly
    // For consistency, return a pseudo-URI
    await Speech.speak(text, {
      language: speechLang,
      rate: 0.9,
      pitch: 1.0,
    });
    
    return 'device://inline';
  }
  
  private getTTSCacheKey(text: string, lang: string, options?: any): string {
    const hash = Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify({ text, lang, options })
    );
    return hash;
  }
}
```

#### 3.2 Create VoicePreferencesService

**File**: `lib/services/VoicePreferencesService.ts` (NEW)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface VoicePreferences {
  languageCode: string;
  ttsProvider: 'auto' | 'azure' | 'google' | 'device';
  sttProvider: 'auto' | 'azure' | 'google' | 'whisper' | 'device';
  voiceId?: string;
  rate: number; // -50 to +50
  pitch: number; // -50 to +50
  style?: 'friendly' | 'empathetic' | 'professional';
}

const PREFS_KEY = '@edudash_voice_prefs';

export class VoicePreferencesService {
  private cachedPrefs: VoicePreferences | null = null;
  
  async getPreferences(): Promise<VoicePreferences> {
    if (this.cachedPrefs) return this.cachedPrefs;
    
    // Try local storage first
    const local = await AsyncStorage.getItem(PREFS_KEY);
    if (local) {
      this.cachedPrefs = JSON.parse(local);
      return this.cachedPrefs;
    }
    
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('voice_preferences')
      .select('*')
      .single();
    
    if (error || !data) {
      // Return defaults
      return this.getDefaultPreferences();
    }
    
    this.cachedPrefs = {
      languageCode: data.language_code,
      ttsProvider: 'auto',
      sttProvider: 'auto',
      voiceId: data.tts_voice_id,
      rate: data.tts_rate || 0,
      pitch: data.tts_pitch || 0,
      style: data.tts_style,
    };
    
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(this.cachedPrefs));
    return this.cachedPrefs;
  }
  
  async setPreferences(prefs: Partial<VoicePreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    
    // Save locally
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    this.cachedPrefs = updated;
    
    // Sync to Supabase (fire-and-forget)
    supabase.from('voice_preferences').upsert({
      language_code: updated.languageCode,
      tts_voice_id: updated.voiceId,
      tts_rate: updated.rate,
      tts_pitch: updated.pitch,
      tts_style: updated.style,
    });
  }
  
  async previewVoice(text: string, lang: string, voiceId?: string): Promise<void> {
    const voicePipeline = new VoicePipeline();
    const { uri } = await voicePipeline.synthesize(text, lang as any, { voiceId });
    await voicePipeline.playAudio(uri);
  }
  
  private getDefaultPreferences(): VoicePreferences {
    return {
      languageCode: 'en',
      ttsProvider: 'auto',
      sttProvider: 'auto',
      rate: 0,
      pitch: 0,
      style: 'friendly',
    };
  }
}

export const voicePreferencesService = new VoicePreferencesService();
```

---

### PHASE 4: Database Schema (1 week)

#### 4.1 Create Migration

```bash
cd /home/king/Desktop/edudashpro
supabase migration new voice_preferences_system
```

**File**: `supabase/migrations/[timestamp]_voice_preferences_system.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Voice preferences table
CREATE TABLE IF NOT EXISTS public.voice_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'principal', 'teacher', 'parent', 'student')),
  language_code TEXT NOT NULL CHECK (language_code IN ('en', 'af', 'zu', 'xh', 'st', 'nso')),
  provider_preference JSONB NOT NULL DEFAULT '{"tts": ["azure", "google", "device"], "stt": ["azure", "google", "whisper", "device"]}',
  tts_voice_id TEXT,
  tts_rate INTEGER DEFAULT 0 CHECK (tts_rate BETWEEN -50 AND 50),
  tts_pitch INTEGER DEFAULT 0 CHECK (tts_pitch BETWEEN -50 AND 50),
  tts_style TEXT CHECK (tts_style IN ('friendly', 'empathetic', 'professional')),
  last_good_tts_provider TEXT,
  last_good_stt_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (preschool_id, user_id)
);

CREATE INDEX idx_voice_prefs_preschool_lang ON public.voice_preferences(preschool_id, language_code);

-- TTS audio cache table
CREATE TABLE IF NOT EXISTS public.tts_audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  hash TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  language_code TEXT NOT NULL,
  voice_id TEXT,
  provider TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER,
  hit_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tts_cache_preschool_lang ON public.tts_audio_cache(preschool_id, language_code);
CREATE INDEX idx_tts_cache_provider ON public.tts_audio_cache(provider);
CREATE INDEX idx_tts_cache_last_used ON public.tts_audio_cache(last_used_at);

-- Voice usage logs table
CREATE TABLE IF NOT EXISTS public.voice_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service TEXT NOT NULL CHECK (service IN ('tts', 'stt')),
  provider TEXT NOT NULL,
  language_code TEXT NOT NULL,
  units NUMERIC NOT NULL, -- chars for TTS, seconds for STT
  cost_estimate_usd NUMERIC,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_usage_preschool_date ON public.voice_usage_logs(preschool_id, created_at);
CREATE INDEX idx_voice_usage_lang ON public.voice_usage_logs(language_code);
CREATE INDEX idx_voice_usage_provider ON public.voice_usage_logs(provider);

-- Add language_code to voice_notes if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'voice_notes' AND column_name = 'language_code'
  ) THEN
    ALTER TABLE public.voice_notes ADD COLUMN language_code TEXT DEFAULT 'en';
    CREATE INDEX idx_voice_notes_lang ON public.voice_notes(preschool_id, language_code);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.voice_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_audio_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_preferences
CREATE POLICY "Users can view their own voice preferences"
  ON public.voice_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice preferences"
  ON public.voice_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice preferences"
  ON public.voice_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tts_audio_cache (tenant-scoped)
CREATE POLICY "Preschool can view their TTS cache"
  ON public.tts_audio_cache FOR SELECT
  USING (preschool_id = (auth.jwt()->>'preschool_id')::uuid);

CREATE POLICY "Preschool can insert TTS cache"
  ON public.tts_audio_cache FOR INSERT
  WITH CHECK (preschool_id = (auth.jwt()->>'preschool_id')::uuid);

-- RLS Policies for voice_usage_logs (write-only for clients)
CREATE POLICY "Users can insert their own usage logs"
  ON public.voice_usage_logs FOR INSERT
  WITH CHECK (true); -- Service role will handle reads

-- Supabase Storage bucket for TTS cache
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-cache', 'tts-cache', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload TTS cache"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tts-cache' AND auth.role() = 'authenticated');

CREATE POLICY "Users can read TTS cache"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tts-cache' AND auth.role() = 'authenticated');

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voice_preferences_updated_at
  BEFORE UPDATE ON public.voice_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 4.2 Apply Migration

```bash
# Lint SQL
npm run lint:sql

# Push to remote (production DB as per WARP.md)
supabase db push

# Verify no schema drift
supabase db diff  # Should show "No changes"
```

---

### PHASE 5: i18n Integration (1 week)

#### 5.1 Add Xhosa Support

**File**: `lib/i18n.ts` (UPDATE)

```typescript
// Add to SUPPORTED_LANGUAGES
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', rtl: false },
  zu: { name: 'Zulu', nativeName: 'IsiZulu', rtl: false },
  xh: { name: 'Xhosa', nativeName: 'IsiXhosa', rtl: false }, // NEW
  st: { name: 'Sepedi', nativeName: 'Sepedi', rtl: false }, // Note: maps to nso-ZA for voice
} as const;

// Remove xh from COMING_SOON_LANGUAGES
export const COMING_SOON_LANGUAGES = {
  tn: { name: 'Tswana', nativeName: 'Setswana', rtl: false },
  ss: { name: 'Swati', nativeName: 'SiSwati', rtl: false },
  nr: { name: 'Ndebele', nativeName: 'IsiNdebele', rtl: false },
  ve: { name: 'Venda', nativeName: 'Tshivenda', rtl: false },
  ts: { name: 'Tsonga', nativeName: 'Xitsonga', rtl: false },
} as const;

// Add Xhosa loader
const LANGUAGE_LOADERS: Record<SupportedLanguage, () => Promise<any>> = {
  en: async () => ({ common: (await import('../locales/en/common.json')).default || en }),
  es: async () => ({ common: (await import('../locales/es/common.json')).default }),
  fr: async () => ({ common: (await import('../locales/fr/common.json')).default }),
  pt: async () => ({ common: (await import('../locales/pt/common.json')).default }),
  de: async () => ({ common: (await import('../locales/de/common.json')).default }),
  af: async () => ({ common: (await import('../locales/af/common.json')).default }),
  zu: async () => ({ common: (await import('../locales/zu/common.json')).default }),
  xh: async () => ({ common: (await import('../locales/xh/common.json')).default }), // NEW
  st: async () => ({ common: (await import('../locales/st/common.json')).default }),
};

/**
 * Map i18n language codes to voice provider language codes
 * Note: 'st' (Sepedi in UI) maps to 'nso-ZA' for cloud providers
 */
export const mapI18nToVoiceLang = (lang: SupportedLanguage): string => {
  const map: Record<SupportedLanguage, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    pt: 'pt-BR',
    de: 'de-DE',
    af: 'af-ZA',
    zu: 'zu-ZA',
    xh: 'xh-ZA',
    st: 'nso-ZA', // Sepedi
  };
  return map[lang] || 'en-US';
};
```

#### 5.2 Create Xhosa Locale File

**File**: `locales/xh/common.json` (NEW)

```json
{
  "welcome": "Wamkelekile",
  "hello": "Molo",
  "goodbye": "Hamba kakuhle",
  "yes": "Ewe",
  "no": "Hayi",
  "dashboard": "Ibhodi yolawulo",
  "settings": "Izicwangciso",
  "language": "Ulwimi",
  "voice_settings": "Izicwangciso zelizwi",
  "teacher": "Utitshala",
  "parent": "Umzali",
  "student": "Umfundi",
  "save": "Gcina",
  "cancel": "Rhoxisa",
  "loading": "Iyalayisha...",
  "error": "Impazamo",
  "success": "Impumelelo",
  "dash_greeting": "Molo! NdinguDash, umncedisi wakho we-AI.",
  "voice_preview": "Mamela isampulu yelizwi",
  "voice_quality": {
    "full": "Iphelele",
    "partial": "Inxenye",
    "fallback": "Ukubuyela emva"
  }
}
```

---

### PHASE 6: Testing & Quality Assurance (2 weeks)

#### 6.1 Create Test Corpus

**Directory**: `tests/voice/corpus/`

Structure:
```
corpus/
├── af/
│   ├── teacher_attendance.m4a
│   ├── parent_question.m4a
│   └── student_response.m4a
├── zu/
│   ├── teacher_attendance.m4a
│   └── ...
├── xh/
│   └── ...
└── nso/
    └── ...
```

#### 6.2 Automated Testing Script

**File**: `scripts/test-voice-accuracy.ts` (NEW)

```typescript
import { supabase } from '../lib/supabase';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface TestResult {
  language: string;
  file: string;
  provider: string;
  transcript: string;
  expectedTranscript: string;
  wer: number; // Word Error Rate
  latency: number;
}

async function testSTTAccuracy() {
  const results: TestResult[] = [];
  const languages = ['af', 'zu', 'xh', 'nso'];
  
  for (const lang of languages) {
    const corpusDir = join(__dirname, '../tests/voice/corpus', lang);
    const files = await readdir(corpusDir);
    
    for (const file of files) {
      if (!file.endsWith('.m4a')) continue;
      
      const audioPath = join(corpusDir, file);
      const audioBuffer = await readFile(audioPath);
      
      // Get expected transcript from .txt file
      const expectedPath = audioPath.replace('.m4a', '.txt');
      const expected = (await readFile(expectedPath, 'utf-8')).trim();
      
      // Test transcription
      const start = Date.now();
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { file: audioBuffer, lang },
      });
      const latency = Date.now() - start;
      
      if (error) {
        console.error(`Error transcribing ${lang}/${file}:`, error);
        continue;
      }
      
      const { text, provider } = data;
      const wer = calculateWER(expected, text);
      
      results.push({
        language: lang,
        file,
        provider,
        transcript: text,
        expectedTranscript: expected,
        wer,
        latency,
      });
      
      console.log(`${lang}/${file} - Provider: ${provider}, WER: ${wer.toFixed(2)}%, Latency: ${latency}ms`);
    }
  }
  
  // Generate report
  const report = generateReport(results);
  console.log('\n' + report);
  
  // Save to file
  await writeFile(
    join(__dirname, '../tests/voice/results.json'),
    JSON.stringify(results, null, 2)
  );
}

function calculateWER(expected: string, actual: string): number {
  // Simplified WER calculation (use levenshtein distance library in production)
  const expectedWords = expected.toLowerCase().split(/\s+/);
  const actualWords = actual.toLowerCase().split(/\s+/);
  
  let errors = 0;
  for (let i = 0; i < expectedWords.length; i++) {
    if (expectedWords[i] !== actualWords[i]) errors++;
  }
  
  return (errors / expectedWords.length) * 100;
}

function generateReport(results: TestResult[]): string {
  const byLanguage = results.reduce((acc, r) => {
    if (!acc[r.language]) acc[r.language] = [];
    acc[r.language].push(r);
    return acc;
  }, {} as Record<string, TestResult[]>);
  
  let report = '=== Voice STT Accuracy Report ===\n\n';
  
  for (const [lang, tests] of Object.entries(byLanguage)) {
    const avgWER = tests.reduce((sum, t) => sum + t.wer, 0) / tests.length;
    const avgLatency = tests.reduce((sum, t) => sum + t.latency, 0) / tests.length;
    const providers = [...new Set(tests.map(t => t.provider))];
    
    report += `${lang.toUpperCase()}:\n`;
    report += `  Avg WER: ${avgWER.toFixed(2)}%\n`;
    report += `  Avg Latency: ${avgLatency.toFixed(0)}ms\n`;
    report += `  Providers Used: ${providers.join(', ')}\n`;
    report += `  Tests: ${tests.length}\n\n`;
  }
  
  return report;
}

testSTTAccuracy().catch(console.error);
```

Run with:
```bash
npx tsx scripts/test-voice-accuracy.ts
```

---

### PHASE 7: Documentation (1 week)

#### 7.1 User-Facing Documentation

**File**: `docs/features/MULTILINGUAL_VOICE_SYSTEM.md` (THIS FILE)

#### 7.2 Architecture Documentation

**File**: `docs/architecture/VOICE_ARCHITECTURE.md` (NEW)

See separate section below for detailed architecture diagrams and API contracts.

---

## 📈 Cost Estimation

### Monthly Cost per 1000 Active Users

Assumptions:
- Avg 10 voice messages/user/day
- Avg 5 seconds per message
- 50% TTS (avg 100 chars), 50% STT
- 30% cache hit rate

**STT Costs**:
- Azure: 1000 users × 10 msg × 0.5 × 5s × 30 days × 0.7 (cache miss) = 525,000 seconds = 145.8 hours
- Cost: 145.8 hours × $1.50/hour = **$218.70/month**

**TTS Costs**:
- Azure Neural: 1000 × 10 × 0.5 × 100 chars × 30 × 0.7 = 10,500,000 chars
- Cost: 10.5M chars × $16/1M = **$168.00/month**

**Storage**:
- Supabase Storage: ~50GB cache × $0.021/GB = **$1.05/month**

**Total Monthly Cost**: ~$387.75 for 1000 active users = **$0.39 per user/month**

### Cost Optimization Strategies

1. **Aggressive Caching**: 30% → 70% cache hit saves ~$155/month
2. **Tiered Limits**: Free tier uses device TTS only
3. **Whisper for Sepedi**: Use cheaper Whisper API for nso-ZA
4. **Batch Processing**: Queue non-urgent TTS requests

---

## 🎯 Success Metrics

### Performance KPIs

- **TTS Latency**: <2s from request to playback (P95)
- **STT Latency**: <3s for 5s audio (P95)
- **Cache Hit Rate**: >50% for TTS
- **Provider Availability**: >99.5% uptime

### Quality KPIs

- **Word Error Rate (WER)**:
  - Afrikaans: <10%
  - Zulu: <15%
  - Xhosa: <15%
  - Sepedi: <20% (Whisper fallback)
- **User Satisfaction**: >4.5/5 rating for voice quality

### Business KPIs

- **Adoption Rate**: >60% of users try voice features within first week
- **Cost per User**: <$0.50/month
- **Premium Conversion**: Voice features drive +15% premium upgrades

---

## 🚨 Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Azure doesn't support nso-ZA | High | Medium | Use Whisper primary + custom SSML pronunciation |
| Latency on 3G networks | Medium | High | Aggressive client caching + preload common phrases |
| Cost overruns | High | Medium | Per-tenant quotas + alerts + device fallback |
| Sepedi i18n code confusion (st vs nso) | Low | Low | Clear mapping layer + TODO for future migration |
| Provider outages | Medium | Low | Multi-provider fallback chain |

---

## 📝 Next Steps

### Week 1: Research Phase
- [ ] Sign up for Azure Cognitive Services (free tier)
- [ ] Sign up for Google Cloud (free $300 credit)
- [ ] Test Azure voices for af-ZA, zu-ZA, xh-ZA, nso-ZA availability
- [ ] Create test audio corpus (20 clips per language)
- [ ] Run PoC benchmark script
- [ ] Document provider capability matrix

### Week 2-3: Backend Implementation
- [ ] Create `tts-proxy` Edge Function
- [ ] Enhance `transcribe-audio` with multi-provider routing
- [ ] Add environment variables to Supabase project
- [ ] Test Edge Functions with Postman/curl
- [ ] Create database migration
- [ ] Apply migration and verify RLS policies

### Week 4-5: Client Integration
- [ ] Enhance `VoicePipeline` class
- [ ] Create `VoicePreferencesService`
- [ ] Integrate with `DashAIAssistant`
- [ ] Build minimal Voice Settings screen
- [ ] Test on Android device with all 4 languages

### Week 6: i18n & Polish
- [ ] Add Xhosa to i18n system
- [ ] Create `locales/xh/common.json` starter file
- [ ] Update `LanguageSelector` component
- [ ] Fix st→nso mapping for voice providers
- [ ] Update UI to show language coverage badges

### Week 7: Testing
- [ ] Run automated STT accuracy tests
- [ ] Conduct subjective TTS quality tests
- [ ] Measure end-to-end latency on 3G/4G
- [ ] Test fallback chains (simulate timeouts)
- [ ] Recruit native speaker testers

### Week 8: Documentation & Launch Prep
- [ ] Write user guide and troubleshooting docs
- [ ] Create architecture diagrams
- [ ] Update `.env.example`
- [ ] Prepare feature flag rollout plan
- [ ] Set up monitoring dashboards
- [ ] Submit for stakeholder review

### Week 9+: Gradual Rollout
- [ ] Enable for internal team (10 users)
- [ ] Enable for beta cohort (100 users)
- [ ] Monitor metrics for 1 week
- [ ] Enable for premium tier users
- [ ] Full rollout after 2 weeks of stable metrics

---

## 🤝 Support & Maintenance

### Provider Support Channels
- **Azure**: https://azure.microsoft.com/support/
- **Google Cloud**: https://cloud.google.com/support
- **OpenAI**: https://help.openai.com/

### Internal Contacts
- **Technical Lead**: [Your Name]
- **Product Manager**: [PM Name]
- **QA/Testing**: [QA Team]

### Quarterly Reviews
- Re-validate provider language support (APIs change)
- Review cost trends and optimize
- Collect user feedback and iterate on voice quality
- Update test corpus with real-world failures

---

## 📚 References

- [Azure Cognitive Services Speech Documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/)
- [Google Cloud TTS/STT Documentation](https://cloud.google.com/speech-to-text/docs)
- [OpenAI Whisper Model Card](https://github.com/openai/whisper)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [React Native Audio Best Practices](https://reactnative.dev/docs/audio)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-14  
**Author**: Warp AI Assistant  
**Status**: Draft - Pending Stakeholder Approval
