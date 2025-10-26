# Azure Cognitive Services Setup Guide

**Status**: Phase 1 - Research & Testing  
**Goal**: Verify Azure voice support for SA languages

---

## 🔑 Step 1: Get Your Azure Credentials

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Speech Service**:
   - Search for "Speech Services" in the top search bar
   - Click "+ Create"
   - Fill in:
     - **Subscription**: Your Azure subscription
     - **Resource Group**: Create new or use existing (e.g., `edudash-voice`)
     - **Region**: **South Africa North** (recommended for SA languages)
     - **Name**: Choose a name (e.g., `edudash-speech`)
     - **Pricing Tier**: Start with **F0 (Free)** or **S0 (Standard)**
   - Click "Review + Create"
   - Wait for deployment (~2 minutes)

3. **Get Your API Key**:
   - Go to your newly created Speech Service
   - Click "Keys and Endpoint" in left sidebar
   - Copy **KEY 1** (or KEY 2)
   - Note the **Location/Region** (e.g., `southafricanorth`)

---

## 🧪 Step 2: Test Azure Voices

### Set Environment Variables

```bash
# In your terminal:
export AZURE_SPEECH_KEY="your-key-from-step-3-here"
export AZURE_SPEECH_REGION="southafricanorth"  # or your chosen region
```

**Important**: Don't commit these to git! Add to `.env` for local development only.

### Run the Test Script

```bash
cd /home/king/Desktop/edudashpro

# Run the test
./scripts/test-azure-voices.sh
```

### What This Tests

1. ✅ Lists all available Azure voices
2. ✅ Filters for South African languages (af-ZA, zu-ZA, xh-ZA, nso-ZA)
3. ✅ Generates test audio samples for each language
4. ✅ Tests STT (Speech-to-Text) language support
5. ✅ Saves results to `tests/voice/`

---

## 📊 Expected Results

### TTS (Text-to-Speech) Voices

Based on Azure's current offerings (as of 2024), you should see:

| Language | Locale | Expected Voices | Gender |
|----------|--------|-----------------|--------|
| Afrikaans | af-ZA | AdriNeural, WillemNeural | Female, Male |
| Zulu | zu-ZA | ThandoNeural, ThembiNeural | Male, Female |
| Xhosa | xh-ZA | YaandeNeural | Female |
| Sepedi | nso-ZA | ⚠️ May not be available | - |

**Note**: If Sepedi (nso-ZA) is not available, we'll use OpenAI Whisper as the primary provider for Sepedi.

### STT (Speech-to-Text) Support

Expected support:
- ✅ Afrikaans (af-ZA): Full support
- ✅ Zulu (zu-ZA): Full support
- ✅ Xhosa (xh-ZA): Full support
- ⚠️ Sepedi (nso-ZA): May be limited/unavailable

---

## 🎧 Step 3: Listen to Samples

After running the script, audio samples are saved to:
```
tests/voice/samples/
├── af-test.mp3  (Afrikaans)
├── zu-test.mp3  (Zulu)
├── xh-test.mp3  (Xhosa)
└── nso-test.mp3 (Sepedi - if available)
```

### Play Samples

**Option 1: Using mpg123** (if installed):
```bash
mpg123 tests/voice/samples/af-test.mp3
mpg123 tests/voice/samples/zu-test.mp3
mpg123 tests/voice/samples/xh-test.mp3
```

**Option 2: Copy to your machine** (if SSH):
```bash
# From your local machine:
scp king@server:/home/king/Desktop/edudashpro/tests/voice/samples/*.mp3 ./
```

**Option 3: Open in file manager** and play with default audio player

---

## 📝 Step 4: Document Findings

Create a simple report of what you found:

```bash
cd /home/king/Desktop/edudashpro
nano tests/voice/AZURE_TEST_RESULTS.md
```

Template:
```markdown
# Azure Voice Test Results

**Date**: 2025-10-14
**Region**: southafricanorth
**Tester**: [Your Name]

## TTS Voices Found

### Afrikaans (af-ZA)
- [ ] AdriNeural (Female) - Quality: ⭐⭐⭐⭐⭐
- [ ] WillemNeural (Male) - Quality: ⭐⭐⭐⭐⭐

### Zulu (zu-ZA)
- [ ] ThandoNeural (Male) - Quality: ⭐⭐⭐⭐⭐
- [ ] ThembiNeural (Female) - Quality: ⭐⭐⭐⭐⭐

### Xhosa (xh-ZA)
- [ ] YaandeNeural (Female) - Quality: ⭐⭐⭐⭐⭐

### Sepedi (nso-ZA)
- [ ] Available: Yes/No
- [ ] Voice Name: _______
- [ ] Quality: ⭐⭐⭐⭐⭐

## STT Support

- [x] Afrikaans: Supported
- [x] Zulu: Supported
- [x] Xhosa: Supported
- [ ] Sepedi: Supported / Not Available

## Preferred Voices

Based on testing, recommend:
- **Afrikaans**: WillemNeural (warm, friendly male)
- **Zulu**: ThandoNeural (clear, professional male)
- **Xhosa**: YaandeNeural (natural, friendly female)
- **Sepedi**: [Voice name or "Use Whisper"]

## Notes

- Voice quality: [Excellent/Good/Fair]
- Pronunciation accuracy: [Notes]
- Any issues: [Notes]
```

---

## 🔧 Troubleshooting

### Error: "Failed to fetch voices"

**Possible causes**:
1. Invalid API key → Check you copied the full key
2. Wrong region → Verify your region matches the Speech Service region
3. Subscription issue → Check your Azure subscription is active

**Fix**:
```bash
# Verify your credentials work with a simple test
curl "https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list" \
  -H "Ocp-Apim-Subscription-Key: ${AZURE_SPEECH_KEY}"
```

### Error: "jq: command not found"

The script will still work, but won't format output nicely.

**Install jq** (optional):
```bash
sudo apt-get install jq  # Debian/Ubuntu/Kali
```

### Error: "sox: command not found"

STT tests will be skipped, but that's okay for now.

**Install sox** (optional):
```bash
sudo apt-get install sox  # Debian/Ubuntu/Kali
```

---

## 📋 Next Steps After Testing

Once you've verified Azure voices:

1. ✅ **Document your findings** (see Step 4)
2. ✅ **Choose preferred voices** for each language
3. ✅ **Add credentials to Supabase**:
   - Go to Supabase Dashboard → Project Settings → Edge Functions
   - Add secrets:
     - `AZURE_SPEECH_KEY`
     - `AZURE_SPEECH_REGION`
4. ✅ **Move to Phase 2**: Create `tts-proxy` Edge Function

---

## 🔐 Security Reminders

- ❌ **Never commit** `AZURE_SPEECH_KEY` to git
- ✅ **Add to `.env`** for local development
- ✅ **Store in Supabase** secrets for production
- ✅ **Use environment variables** in Edge Functions

---

## 💰 Pricing Information

**Free Tier (F0)**:
- TTS: 0.5M characters/month free
- STT: 5 audio hours/month free
- Perfect for testing!

**Standard Tier (S0)** (when you scale):
- TTS Neural: ~$16 per 1M characters
- STT: ~$1-$1.60 per audio hour
- See full pricing: https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/

---

## 📚 Useful Links

- **Azure Speech Documentation**: https://learn.microsoft.com/azure/ai-services/speech-service/
- **Supported Languages**: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
- **SSML Reference**: https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup
- **API Reference**: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech

---

**Ready?** Run the test script and document your findings!
