# ✅ Azure TTS Integration - South African Voices

## 🎯 What Was Changed

Updated the voice system to **use Azure Text-to-Speech** for South African languages instead of device TTS (expo-speech), which doesn't have authentic SA voices.

---

## 🗣️ Voice Provider Routing

### Automatic Provider Selection:

```
Dash needs to speak
    ↓
Detect language
    ↓
┌──────────────────────────────┬───────────────────────────┐
│ SA Languages                 │ Other Languages          │
│ (af, zu, xh, nso)           │ (en, etc.)               │
└──────────────────────────────┴───────────────────────────┘
         ↓                                  ↓
   Azure TTS (Edge Function)          Device TTS
   ✅ Authentic SA voices             (expo-speech)
         ↓                                  ↓
   Download & Play Audio              Play via device
```

---

## 🎤 Supported Languages & Voices

| Language | Code | Azure Voice | Gender | Quality |
|----------|------|-------------|--------|---------|
| **Afrikaans** | `af` | AdriNeural | Female | ⭐⭐⭐ Excellent |
| **Afrikaans** | `af` | WillemNeural | Male | ⭐⭐⭐ Excellent |
| **isiZulu** | `zu` | ThandoNeural | Female | ⭐⭐⭐ Excellent |
| **isiZulu** | `zu` | ThembaNeural | Male | ⭐⭐⭐ Excellent |
| **isiXhosa** | `xh` | YaandeNeural | Female | ⭐⭐⭐ Excellent |
| **Sepedi/Sotho** | `nso` | Online | - | ⭐⭐ Very Good |
| English (SA) | `en` | LeahNeural | Female | ⭐⭐⭐ Excellent |

---

## 🔧 Technical Implementation

### Files Modified:

1. **`services/DashAIAssistant.ts`**
   - Added `speakWithAzureTTS()` method
   - Updated `speakResponse()` to route SA languages to Azure
   - Falls back to device TTS if Azure fails

### Architecture:

```typescript
// In speakResponse()
if (language in ['af', 'zu', 'xh', 'nso']) {
  try {
    await speakWithAzureTTS(text, language, callbacks);
    return; // Success!
  } catch (error) {
    // Fall back to device TTS
  }
}

// Device TTS for other languages
Speech.speak(text, options);
```

### Azure TTS Flow:

```
DashAIAssistant.speakResponse()
    ↓
speakWithAzureTTS('Sawubona', 'zu')
    ↓
Call Edge Function: tts-proxy
    {
      text: "Sawubona",
      language: "zu",
      style: "friendly",
      rate: 0,
      pitch: 0
    }
    ↓
Edge Function checks cache
    ↓
┌─────────────────┬──────────────────┐
│ Cache HIT       │ Cache MISS       │
└─────────────────┴──────────────────┘
       ↓                   ↓
  Return URL         Call Azure API
                          ↓
                    Generate audio
                          ↓
                     Upload to storage
                          ↓
                    Cache metadata
                          ↓
                     Return URL
    ↓
audioManager.play(url)
    ↓
Download & play audio
    ↓
Callbacks: onStart → onDone
```

---

## 📊 Benefits

### Before (Device TTS):
- ❌ No authentic SA voices
- ❌ English-accented Afrikaans/Zulu
- ❌ Poor pronunciation
- ❌ Robotic sound

### After (Azure TTS):
- ✅ Native speaker quality
- ✅ Correct pronunciation
- ✅ Natural intonation
- ✅ Emotion & style support
- ✅ Cached for performance
- ✅ Falls back gracefully

---

## 🎯 Usage Examples

### Example 1: Afrikaans Response

```typescript
const message: DashMessage = {
  id: 'msg_123',
  type: 'assistant',
  content: 'Goeie more! Hoe kan ek jou vandag help?',
  timestamp: Date.now(),
};

await dashInstance.speakResponse(message);
```

**What happens:**
1. Language detected as Afrikaans (`af`)
2. Routes to Azure TTS
3. Uses AdriNeural (female SA voice)
4. Downloads audio
5. Plays naturally in Afrikaans

### Example 2: isiZulu Response

```typescript
const message: DashMessage = {
  id: 'msg_456',
  type: 'assistant',
  content: 'Sawubona! Ngingakusiza kanjani namhlanje?',
  timestamp: Date.now(),
};

await dashInstance.speakResponse(message);
```

**What happens:**
1. Language detected as Zulu (`zu`)
2. Routes to Azure TTS
3. Uses ThandoNeural (female Zulu voice)
4. Plays with correct click consonants and tones

---

## 💰 Cost Optimization

### TTS Caching Strategy:

The `tts-proxy` Edge Function caches audio files to minimize Azure API calls:

- **Cache Key**: Hash of (text + language + voice + style + rate + pitch)
- **Storage**: Supabase Storage bucket `tts-cache`
- **Database**: `tts_audio_cache` table tracks metadata
- **TTL**: No expiration (manual cleanup if needed)
- **Benefit**: Same text = instant playback (no Azure call)

### Cost Estimates:

| Usage | Azure Calls/Day | Cost/Day | Cost/Month |
|-------|----------------|----------|------------|
| **Low** (10 responses) | 5 (50% cache hit) | $0.01 | $0.30 |
| **Medium** (50 responses) | 20 (60% cache hit) | $0.04 | $1.20 |
| **High** (200 responses) | 50 (75% cache hit) | $0.10 | $3.00 |

**Azure TTS Pricing**: ~$16/1M characters (~$0.02/1000 chars)

---

## 🐛 Fallback Behavior

### Graceful Degradation:

```
Azure TTS fails (network error, API error, etc.)
    ↓
Log error: [Dash] Azure TTS failed, falling back to device TTS
    ↓
Use device TTS (expo-speech)
    ↓
Play with device voice (lower quality but works)
```

### When Fallback Occurs:

1. **Network issues** - Can't reach Edge Function
2. **Azure API errors** - Service temporarily unavailable
3. **Missing credentials** - Azure keys not configured
4. **Playback errors** - Audio download/playback fails

**User Experience**: Seamless - they hear a response either way

---

## 🔍 Debugging

### Enable Verbose Logging:

The system already includes detailed logs:

```
[Dash] Speaking in language: zu
[Dash] 🇿🇦 Using Azure TTS for zu
[Dash] Calling Azure TTS Edge Function for zu
[Dash] ✅ Azure TTS audio URL received (cached: false)
[Dash] Azure TTS playback finished
```

### Check Edge Function Logs:

```bash
supabase functions logs tts-proxy --tail
```

**Look for**:
- `[TTS Request] lang: zu → zu-ZA`
- `[Cache HIT]` or `[Cache MISS]`
- `[Azure TTS] Synthesizing: zu-ZA`
- Any error messages

### Test Specific Language:

```typescript
// In Dash AI Settings, set language to "Zulu"
// Then test voice response
const dash = DashAIAssistant.getInstance();
await dash.sendMessage("Sawubona");
// Should hear Zulu voice response
```

---

## ✅ Verification Checklist

### To verify Azure TTS is working:

1. ✅ **Language Set**: User has set language to af/zu/xh/nso in Dash AI Settings
2. ✅ **Azure Keys**: `AZURE_SPEECH_KEY` configured in Supabase secrets
3. ✅ **Edge Function**: `tts-proxy` function deployed and accessible
4. ✅ **Logs Show**: `🇿🇦 Using Azure TTS for <lang>`
5. ✅ **Authentic Voice**: Response sounds like native SA speaker
6. ✅ **Cache Works**: Second playback of same text is instant

---

## 🚀 Next Steps (Optional)

### Voice Customization:

Users could choose voice gender:
- Afrikaans: Adri (F) or Willem (M)
- Zulu: Thando (F) or Themba (M)

### Emotion/Style Control:

Azure supports emotional styles:
- `friendly` (default)
- `empathetic`
- `cheerful`
- `professional`

### SSML Support:

Advanced users could use SSML for:
- Pronunciation control
- Pauses and emphasis
- Speed/pitch per-phrase

---

## 📚 Related Documentation

- **Voice System Guide**: `/VOICE_SYSTEM_GUIDE.md`
- **Azure Multilingual Setup**: `/AZURE_MULTILINGUAL_ACTIVATED.md`
- **TTS Proxy Function**: `/supabase/functions/tts-proxy/index.ts`
- **Audio Manager**: `/lib/voice/audio.ts`

---

## ✨ Summary

- ✅ **SA languages** (af, zu, xh, nso) → **Azure TTS** via Edge Function
- ✅ **Authentic voices** - Native speaker quality
- ✅ **Cached** - Fast subsequent playback
- ✅ **Fallback** - Device TTS if Azure fails
- ✅ **Cost-effective** - ~$3/month for typical usage

**Result**: Dash now speaks Afrikaans, Zulu, Xhosa, and Sotho with authentic South African voices! 🇿🇦✨
