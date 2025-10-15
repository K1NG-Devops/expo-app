# 🎤 Streaming & Multilingual Voice Testing Guide

## Part 1: Testing OpenAI Realtime Streaming ⚡

### ✅ What I Already Did:
1. Enabled `EXPO_PUBLIC_DASH_STREAMING=true` in your `.env`
2. Your WebRTC implementation is already built and ready!

### 🚀 Step 1: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart with cache clear:
npm run start:clear

# Wait for it to start, then test on:
npm run web          # Web browser
# OR
npm run dev:android  # Your Android device
```

### 🧪 Step 2: Test Dash Voice Streaming

1. **Open Dash Assistant**
   - Look for the Dash icon/button in your app
   - Or navigate to wherever you have Dash integrated

2. **Start Voice Recording**
   - Tap the microphone button
   - **Grant microphone permission** if prompted

3. **Speak and Watch**
   - Start talking
   - You should see **partial transcripts appearing in real-time** as you speak!
   - The text should update **every 100-300ms** while you're talking

4. **Check Console Logs**
   Look for these success indicators:
   ```
   [webrtcProvider] Starting...
   [webrtcProvider] ICE connection: connected  ✅
   [RealtimeVoice] Streaming enabled, using WebRTC  ✅
   [RealtimeVoice] Partial transcript: "Hello this is..."  ✅
   ```

### 📊 Expected Performance:

**Before (Batch Whisper)**:
- First response: 1500-3000ms ⏱️
- Each chunk: 1200-2500ms
- Total feel: **Slow and laggy** 😞

**After (OpenAI Realtime Streaming)**:
- Connection: 300-500ms ⚡
- Partial transcripts: 100-300ms ⚡⚡
- Total feel: **Instant and magical!** ✨

### 🐛 Troubleshooting Streaming:

#### Issue: "Still using batch transcription"
**Symptoms**: Logs show "Using batch transcription" instead of "WebRTC"

**Fix**:
```bash
# 1. Verify .env flag
grep EXPO_PUBLIC_DASH_STREAMING /home/king/Desktop/edudashpro/.env
# Should show: EXPO_PUBLIC_DASH_STREAMING=true

# 2. Clear all caches
npm run start:clear

# 3. Restart completely
killall node
npm run web
```

#### Issue: "WebRTC connection failed"
**Symptoms**: Logs show connection errors

**Possible causes**:
1. OpenAI API key doesn't have Realtime API access
2. Network/firewall blocking WebRTC
3. Browser doesn't support WebRTC (unlikely on Chrome/Edge)

**Fix**:
1. Check your OpenAI API key has Realtime API enabled
2. Try different network (mobile hotspot)
3. Check browser console for WebRTC errors

#### Issue: "No microphone permission"
**Fix**: Grant permission in browser/app settings

---

## Part 2: Azure Multilingual Voice (Afrikaans + isiZulu) 🌍

### 📝 Current Status:

**What you have**:
- ✅ OpenAI Whisper supports: `af` (Afrikaans), `zu` (isiZulu)
- ✅ Your `transcribe-audio` function already has language mapping
- ✅ Language codes in place: `'af'`, `'zu'`, `'st'` (Sesotho)

**What you DON'T have yet**:
- ❌ Azure Speech Services integration
- ❌ High-quality neural TTS for SA languages
- ❌ Better STT accuracy for Afrikaans/isiZulu

### 🎯 Why Add Azure?

| Feature | OpenAI Whisper | Azure Cognitive Speech |
|---------|---------------|----------------------|
| **Afrikaans (af-ZA)** | ✅ Basic support | ⭐ Native neural voices |
| **isiZulu (zu-ZA)** | ✅ Limited support | ⭐ Native neural voices |
| **TTS Quality** | ❌ No TTS | ⭐ Natural, expressive |
| **STT Accuracy** | ✅ Good | ⭐⭐ Excellent for SA |
| **Latency** | ~2-3s | ~1-2s ⚡ |
| **Cost** | $0.006/min | $1.60/hr STT, $16/1M chars TTS |

**Bottom line**: Azure is **much better** for Afrikaans and isiZulu!

### 🔑 Step 1: Get Azure Speech API Key

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Speech Service**:
   - Search "Speech Services"
   - Click "+ Create"
   - **Region**: Choose `southafricanorth` or `westeurope`
   - **Pricing**: F0 (free tier) or S0 (standard)
   - Click "Create"

3. **Get Your Keys**:
   - Go to your Speech resource
   - Click "Keys and Endpoint"
   - Copy **Key 1** and **Region**

### 🔧 Step 2: Configure Azure in Supabase

Set these secrets in Supabase:

```bash
# Set Azure Speech credentials
supabase secrets set AZURE_SPEECH_KEY=your_azure_key_here
supabase secrets set AZURE_SPEECH_REGION=southafricanorth

# Deploy updated transcribe-audio function (I'll help you update it)
supabase functions deploy transcribe-audio
```

### 📝 Step 3: Update transcribe-audio Function

I can help you add Azure support to your existing function. Here's what we'll add:

**New function** (`transcribeWithAzure`):
```typescript
async function transcribeWithAzure(
  audioUrl: string, 
  language: string
): Promise<TranscriptionResponse> {
  const AZURE_SPEECH_KEY = Deno.env.get('AZURE_SPEECH_KEY')!
  const AZURE_SPEECH_REGION = Deno.env.get('AZURE_SPEECH_REGION')!
  
  // Map to Azure language codes
  const langMap = {
    'af': 'af-ZA',  // Afrikaans South Africa
    'zu': 'zu-ZA',  // isiZulu South Africa
    'xh': 'xh-ZA',  // isiXhosa South Africa
    'en': 'en-ZA'   // English South Africa
  }
  
  const azureLang = langMap[language] || 'en-ZA'
  
  // Download audio
  const audioBlob = await fetch(audioUrl).then(r => r.blob())
  
  // Call Azure STT
  const response = await fetch(
    `https://${AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${azureLang}`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'audio/wav',
      },
      body: await audioBlob.arrayBuffer(),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Azure STT failed: ${response.status}`)
  }
  
  const result = await response.json()
  
  return {
    transcript: result.DisplayText || '',
    language: azureLang,
    confidence: result.NBest?.[0]?.Confidence || 0,
  }
}
```

**Updated routing logic**:
```typescript
// Use Azure for Afrikaans/Zulu, Whisper as fallback
if (['af', 'zu', 'xh'].includes(language) && AZURE_SPEECH_KEY) {
  try {
    transcription = await transcribeWithAzure(audioUrl, language)
    provider = 'azure'
  } catch (error) {
    console.error('Azure failed, falling back to Whisper:', error)
    transcription = await transcribeWithOpenAI(audioUrl, language)
    provider = 'openai'
  }
} else {
  // Use OpenAI Whisper for English and other languages
  transcription = await transcribeWithOpenAI(audioUrl, language)
  provider = 'openai'
}
```

### 🧪 Step 4: Test Multilingual Support

1. **Test Afrikaans**:
   ```typescript
   // In your Dash Assistant, set language to 'af'
   const result = await voicePipeline.transcribe(audioBlob, 'af')
   // Speak in Afrikaans: "Hallo, hoe gaan dit?"
   // Expected: "Hallo, hoe gaan dit?" ✅
   ```

2. **Test isiZulu**:
   ```typescript
   // Set language to 'zu'
   const result = await voicePipeline.transcribe(audioBlob, 'zu')
   // Speak in isiZulu: "Sawubona, kunjani?"
   // Expected: "Sawubona, kunjani?" ✅
   ```

3. **Check Logs**:
   ```bash
   supabase functions logs transcribe-audio --tail
   
   # Look for:
   # "Transcribing with Azure: af-ZA" ✅
   # OR
   # "Azure failed, falling back to Whisper" (if no Azure key)
   ```

### 🎨 Step 5: Add TTS (Text-to-Speech) Support

Once Azure STT is working, we can add neural TTS:

**Available Azure Voices**:
- **Afrikaans**: `af-ZA-AdriNeural` (Female), `af-ZA-WillemNeural` (Male)
- **isiZulu**: `zu-ZA-ThandoNeural` (Male), `zu-ZA-ThembaNeural` (Female)
- **isiXhosa**: `xh-ZA-YaandeNeural` (Female)

**Usage in Dash**:
```typescript
// Dash responds in user's language
const audioUrl = await voicePipeline.synthesize(
  "Sawubona! Ungakwazi ukukhuluma isiZulu?",
  'zu',  // isiZulu
  { voiceId: 'zu-ZA-ThandoNeural' }
)
```

---

## 🚀 Quick Start Commands

### For Streaming Test:
```bash
# 1. Restart dev server
npm run start:clear

# 2. Test in browser
npm run web

# 3. Open Dash and try voice recording
```

### For Azure Setup:
```bash
# 1. Set Azure secrets
supabase secrets set AZURE_SPEECH_KEY=your_key
supabase secrets set AZURE_SPEECH_REGION=southafricanorth

# 2. I'll help you update the function code

# 3. Deploy
supabase functions deploy transcribe-audio

# 4. Test with Afrikaans or isiZulu audio
```

---

## 📊 Language Support Matrix

| Language | Code | OpenAI Whisper | Azure STT | Azure TTS |
|----------|------|---------------|-----------|-----------|
| English | `en` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Afrikaans | `af` | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| isiZulu | `zu` | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| isiXhosa | `xh` | ⭐ | ⭐⭐⭐ | ⭐⭐ |
| Sesotho | `st` | ⭐ | ❌ | ❌ |

**Legend**: ⭐⭐⭐ Excellent, ⭐⭐ Good, ⭐ Basic, ❌ Not supported

---

## 🎯 Recommended Approach

### For Your South African Users:

1. **Phase 1 (Now)**: 
   - ✅ Enable OpenAI Realtime Streaming (DONE!)
   - Test with English first

2. **Phase 2 (This Week)**:
   - Add Azure STT for Afrikaans/isiZulu
   - Keep Whisper as fallback

3. **Phase 3 (Next Week)**:
   - Add Azure TTS for natural SA language responses
   - Let Dash speak Afrikaans/isiZulu naturally!

4. **Phase 4 (Future)**:
   - Add language auto-detection
   - Support code-switching (mixing languages)
   - Add more SA languages (Sepedi, Setswana, etc.)

---

## 💰 Cost Considerations

### OpenAI Realtime Streaming:
- **Audio input**: $0.06/minute
- **Audio output**: $0.24/minute
- **Example**: 5 min conversation = ~$1.50 💰

### OpenAI Whisper (Batch):
- **$0.006/minute** = 10x cheaper!
- **Example**: 5 min audio = $0.03 ✅

### Azure Speech:
- **STT**: ~$1.60/hour = $0.027/minute
- **TTS Neural**: ~$16/1M characters
- **Example**: 5 min STT + 200 words TTS = ~$0.14

**Recommendation**: 
- Use **Realtime Streaming** for premium/paid users (best UX)
- Use **Batch Whisper + Azure** for free tier (good balance)
- Use **Azure** for all Afrikaans/isiZulu (best quality)

---

## 🎤 Next Steps

1. **Test streaming right now**:
   ```bash
   npm run start:clear
   npm run web
   # Try Dash voice - should be super fast!
   ```

2. **Get Azure keys** (if you want multilingual):
   - Go to portal.azure.com
   - Create Speech Service
   - Copy keys

3. **Let me know** if you want me to:
   - ✅ Update `transcribe-audio` function with Azure support
   - ✅ Create `tts-proxy` function for neural voices
   - ✅ Add language selector UI in Dash settings
   - ✅ Help you test Afrikaans/isiZulu

**Ready to test streaming now? Let me know what you see!** 🚀
