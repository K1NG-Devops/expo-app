# SA Multilingual Voice System - Quick Start Guide

**🚀 Goal**: Add robust voice support for Afrikaans, Zulu, Xhosa, and Sepedi

---

## 📋 Implementation Checklist

### Prerequisites (Week 1)
- [ ] Azure Cognitive Services account ([Sign up](https://azure.microsoft.com/free/cognitive-services/))
- [ ] Google Cloud account ([Sign up](https://cloud.google.com/free))
- [ ] Test audio samples in all 4 languages
- [ ] Provider capability verification complete

### Backend Setup (Week 2-3)
- [ ] Create `supabase/functions/tts-proxy/index.ts`
- [ ] Enhance `supabase/functions/transcribe-audio/index.ts`
- [ ] Add environment variables to Supabase:
  ```bash
  AZURE_SPEECH_KEY=...
  AZURE_SPEECH_REGION=southafricanorth
  GOOGLE_CLOUD_TTS_API_KEY=...
  GOOGLE_CLOUD_STT_API_KEY=...
  ```
- [ ] Create database migration: `supabase migration new voice_preferences_system`
- [ ] Apply migration: `npm run lint:sql && supabase db push`

### Client Integration (Week 4-5)
- [ ] Enhance `lib/voice-pipeline.ts` with `synthesize()` method
- [ ] Create `lib/services/VoicePreferencesService.ts`
- [ ] Integrate voice into `services/DashAIAssistant.ts`
- [ ] Build minimal Voice Settings screen

### i18n Updates (Week 6)
- [ ] Add Xhosa to `lib/i18n.ts` SUPPORTED_LANGUAGES
- [ ] Create `locales/xh/common.json`
- [ ] Add `mapI18nToVoiceLang()` helper function
- [ ] Update `LanguageSelector.tsx` with voice badges

### Testing (Week 7)
- [ ] Create test corpus: `tests/voice/corpus/{af,zu,xh,nso}/`
- [ ] Run accuracy tests: `npx tsx scripts/test-voice-accuracy.ts`
- [ ] Test on Android device with all languages
- [ ] Recruit native speaker testers

---

## 🏗️ Key Architecture

```
Client (React Native)
  ↓ VoicePipeline.synthesize(text, lang)
  ↓ HTTPS POST with JWT
Edge Function: tts-proxy
  ↓ Azure TTS (primary)
  ↓ Google TTS (fallback)
  ↓ Device TTS (final fallback)
  ↓ Store in tts_audio_cache
  ↓ Return signed URL
Client
  ↓ Download & cache
  ↓ Play audio
```

---

## 🌍 Language Routing

| Language | i18n Code | Voice Code | Primary Provider | Fallback |
|----------|-----------|------------|------------------|----------|
| Afrikaans | `af` | `af-ZA` | Azure | Google → Device |
| Zulu | `zu` | `zu-ZA` | Azure | Google → Device |
| Xhosa | `xh` | `xh-ZA` | Azure | Google → Device |
| Sepedi | `st` | `nso-ZA` | Whisper | Azure → Device |

---

## 💰 Cost Estimates

**Per 1000 active users/month**:
- STT: ~$220 (Azure + Whisper)
- TTS: ~$170 (Azure Neural)
- Storage: ~$1 (Supabase)
- **Total**: ~$390/month = **$0.39/user**

**Optimization**: 70% cache hit → ~$155/month savings

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| TTS Latency (P95) | <2s |
| STT Latency (P95) | <3s |
| Cache Hit Rate | >50% |
| WER (Afrikaans) | <10% |
| WER (Zulu/Xhosa) | <15% |
| WER (Sepedi) | <20% |
| User Satisfaction | >4.5/5 |

---

## 🚨 Critical Security Rules

1. ✅ **All cloud API calls via Edge Functions** (never expose keys on client)
2. ✅ **Enforce JWT authentication** on all Edge Function requests
3. ✅ **Tenant isolation via RLS** (preschool_id scoping)
4. ✅ **Usage tracking** in `voice_usage_logs` for cost monitoring
5. ✅ **Per-tenant quotas** to prevent cost spikes

---

## 🛠️ Quick Commands

```bash
# Create migration
supabase migration new voice_preferences_system

# Lint SQL
npm run lint:sql

# Apply migration (production DB)
supabase db push

# Verify no drift
supabase db diff

# Test Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/tts-proxy \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Sawubona", "lang": "zu"}'

# Run voice tests
npx tsx scripts/test-voice-accuracy.ts
```

---

## 📚 Key Documentation

- **Full Plan**: `docs/features/SA_MULTILINGUAL_VOICE_SYSTEM.md`
- **Architecture**: `docs/architecture/VOICE_ARCHITECTURE.md` (create)
- **API Docs**: Edge Function contracts in main plan
- **Troubleshooting**: User guide in main plan

---

## 🎯 Phase 1 Action Items (This Week)

1. **Sign up for cloud providers** (Azure + Google Cloud)
2. **Test voice availability**:
   ```bash
   # Azure voices
   curl "https://<region>.tts.speech.microsoft.com/cognitiveservices/voices/list" \
     -H "Ocp-Apim-Subscription-Key: $AZURE_KEY"
   
   # Filter for SA languages (af-ZA, zu-ZA, xh-ZA, nso-ZA)
   ```
3. **Create test corpus**:
   - Record 5 audio samples per language (teacher/parent/student contexts)
   - Create `.txt` files with expected transcripts
   - Save to `tests/voice/corpus/{af,zu,xh,nso}/`
4. **Benchmark accuracy**:
   - Manually test Azure STT/TTS for each language
   - Document WER, latency, voice quality
   - Create provider comparison matrix

---

## 💡 Pro Tips

- **Start with Afrikaans**: Best provider support, easiest testing
- **Use Whisper for Sepedi**: Best accuracy for low-resource language
- **Cache aggressively**: Common phrases like greetings save 50%+ costs
- **Test on real devices**: Android-first per WARP.md
- **Monitor costs daily**: Set billing alerts at $50, $100, $200
- **Feature gate properly**: Free tier = device TTS only

---

## 🆘 Getting Help

- **Azure Issues**: https://azure.microsoft.com/support/
- **Google Cloud**: https://cloud.google.com/support
- **Supabase**: https://supabase.com/docs
- **Project Docs**: `docs/features/SA_MULTILINGUAL_VOICE_SYSTEM.md`

---

**Ready to start?** Begin with Phase 1 (Research) and work through each phase sequentially. The todo list is already created and tracking progress!

**Last Updated**: 2025-10-14
