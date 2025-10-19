# Voice System Guide - Language Support

## 🎤 Two Voice Systems

Your app has **two different voice input methods**, each optimized for different languages:

### 1. 🌟 Voice Mode Orb (OpenAI Realtime API)
- **Technology**: OpenAI Realtime API via WebRTC
- **Best for**: English & Afrikaans users
- **Features**: 
  - ✅ Real-time streaming transcription
  - ✅ Live voice conversation
  - ✅ Instant responses
  - ✅ Pulsing orb animation
- **Supported SA Languages**: 
  - ✅ English (`en`)
  - ✅ Afrikaans (`af`)
  - ❌ Zulu (`zu`) - Not supported
  - ❌ Xhosa (`xh`) - Not supported
  - ❌ Sotho (`nso`) - Not supported

### 2. 🇿🇦 Voice Recording Modal (Azure Speech + OpenAI Whisper)
- **Technology**: Azure Speech Services (fallback to OpenAI Whisper)
- **Best for**: Zulu, Xhosa, and Sotho users
- **Features**:
  - ✅ Record & upload workflow
  - ✅ Azure AI transcription (best quality for SA languages)
  - ✅ Automatic language detection
  - ✅ Fallback to Whisper if Azure fails
- **Supported SA Languages**:
  - ✅ English (`en`)
  - ✅ Afrikaans (`af`) - Uses Azure ⭐⭐⭐
  - ✅ Zulu (`zu`) - Uses Azure ⭐⭐⭐
  - ✅ Xhosa (`xh`) - Uses Azure ⭐⭐⭐
  - ✅ Sotho (`nso`) - Uses Azure ⭐⭐

---

## 🤖 Automatic Language Routing

The mic button in Dash **automatically chooses** the right voice system based on your language preference:

```
User taps mic button
    ↓
Check language setting
    ↓
┌────────────────────────┬─────────────────────────┐
│ English or Afrikaans   │ Zulu, Xhosa, or Sotho  │
│         (en, af)       │      (zu, xh, nso)     │
└────────────────────────┴─────────────────────────┘
         ↓                           ↓
   Voice Mode Orb           Voice Recording Modal
  (OpenAI Realtime)          (Azure Speech)
         ↓                           ↓
  Real-time streaming          Record → Upload
         ↓                           ↓
    Live response              Transcribe → Respond
```

---

## 📱 How to Use

### For English or Afrikaans Users:

1. **Set language** in Dash AI Settings → Voice & Speech → English or Afrikaans
2. **Tap the mic button** in Dash header
3. **Orb appears** with pulsing animation
4. **Speak naturally** - see real-time transcription
5. **Dash responds** with voice and text

### For Zulu, Xhosa, or Sotho Users:

1. **Set language** in Dash AI Settings → Voice & Speech → Zulu/Xhosa/Sotho
2. **Tap the mic button** in Dash header
3. **Recording modal opens** (not the orb)
4. **Tap and hold** to record
5. **Release** to send
6. **Azure transcribes** with high accuracy
7. **Dash responds** with text (and optional voice)

---

## 🎯 Language Quality Comparison

| Language | Voice Mode Orb | Recording Modal (Azure) |
|----------|---------------|------------------------|
| **English (en)** | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent |
| **Afrikaans (af)** | ⭐⭐ Good | ⭐⭐⭐ Excellent |
| **Zulu (zu)** | ❌ Not supported | ⭐⭐⭐ Excellent |
| **Xhosa (xh)** | ❌ Not supported | ⭐⭐⭐ Excellent |
| **Sotho (nso)** | ❌ Not supported | ⭐⭐ Very Good |

---

## 🔧 Technical Details

### Voice Mode Orb Architecture:
```
User speaks
    ↓
Microphone → WebRTC → OpenAI Realtime API
    ↓
Real-time transcription stream
    ↓
DashVoiceMode component
    ↓
Send to Dash AI
    ↓
Response (text + audio)
```

### Recording Modal Architecture:
```
User speaks
    ↓
Microphone → Record audio file
    ↓
Upload to Supabase Storage
    ↓
Edge Function: transcribe-audio
    ↓
Check language → Route to Azure or Whisper
    ↓
Transcription result
    ↓
Send to Dash AI
    ↓
Response (text)
```

---

## 💡 Pro Tips

### For Best Results:

1. **Always set your language** in Dash AI Settings before using voice
2. **Speak clearly** in a quiet environment
3. **English/Afrikaans** → Use the orb (faster, real-time)
4. **Zulu/Xhosa/Sotho** → Use recording modal (better accuracy with Azure)

### Language Preferences:

- The app **remembers your language choice** via AsyncStorage
- Key: `@dash_voice_language`
- Format: `en`, `af`, `zu`, `xh`, `nso`

---

## 🐛 Troubleshooting

### "Voice mode orb not transcribing Zulu"
**Solution**: Tap the mic button - it should automatically open the recording modal instead of the orb for Zulu.

### "Recording modal showing for English"
**Check**: Your language setting in Dash AI Settings. Make sure it's set to "English" not "Zulu".

### "No transcription at all"
1. Check microphone permissions
2. Check network connection
3. View Edge Function logs: `supabase functions logs transcribe-audio --tail`

---

## 🚀 Future Enhancements

Potential improvements:
- [ ] Azure Realtime SDK for streaming SA languages
- [ ] Hybrid approach: OpenAI for English, Azure streaming for SA languages
- [ ] TTS (text-to-speech) responses in Zulu/Xhosa/Afrikaans

---

## 📊 Cost Comparison

| Service | Cost per Minute | Best For |
|---------|----------------|----------|
| **OpenAI Realtime** | ~$0.06/min | English, fast responses |
| **OpenAI Whisper** | ~$0.006/min | English, cost-effective |
| **Azure Speech** | ~$0.027/min | SA languages, high accuracy |

**Recommendation**: Use Azure for SA languages despite higher cost - the accuracy improvement is worth it! 🇿🇦

---

## ✅ Summary

- ✅ English/Afrikaans → **Voice Mode Orb** (OpenAI Realtime)
- ✅ Zulu/Xhosa/Sotho → **Recording Modal** (Azure Speech)
- ✅ Automatic routing based on language preference
- ✅ Both systems work great for their intended languages
- ✅ Set your language once in settings, system does the rest

**The mic button is smart - it knows which system to use!** 🎤✨
