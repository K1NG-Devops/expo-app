# Hybrid Real-Time Transcription Architecture Plan

**Date:** 2025-10-14  
**Status:** 📋 PLANNING  
**Priority:** 🔴 HIGH  
**Target:** Real-time user feedback using batch method + ASR

---

## 🎯 Executive Summary

**Problem:** Current batch transcription is too slow (5-10 seconds), creating poor UX for Dash voice interactions.

**Solution:** Hybrid 3-tier approach combining:
1. **Tier 1**: On-device ASR (instant feedback, <500ms)
2. **Tier 2**: Chunked batch transcription (progressive updates, 1-2s cadence)
3. **Tier 3**: Final pass with Whisper (accuracy, 3-5s)

**Key Principle:** Keep using batch method (OpenAI Whisper) but make it feel real-time through chunking and on-device ASR masking.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  [🎤 Recording] → [📝 Instant Text] → [🔄 Progressive] → [✓ Final]│
│   Device ASR      Device interim      Chunked batch    Whisper  │
│   <500ms          ~200-800ms          ~1-2s cadence    ~3-5s    │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   HYBRID TRANSCRIPTION MANAGER                  │
│                  (lib/speech/hybrid-transcription.ts)           │
│                                                                 │
│  Orchestrates 3 tiers:                                         │
│  • Tier 1: On-Device ASR (instant UX)                          │
│  • Tier 2: Chunked Batch (progressive accuracy)                │
│  • Tier 3: Final Pass (full accuracy)                          │
│                                                                 │
│  Merging Strategy:                                             │
│  • Show device interim for current segment                     │
│  • Replace with chunk results as they arrive                   │
│  • Replace entire transcript with final on stop                │
└─────────────────────────────────────────────────────────────────┘
         ▼                    ▼                    ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   TIER 1       │  │   TIER 2       │  │   TIER 3       │
│  On-Device ASR │  │ Chunked Batch  │  │  Final Pass    │
├────────────────┤  ├────────────────┤  ├────────────────┤
│ Web:           │  │ Web:           │  │ All Platforms: │
│ - Web Speech   │  │ - MediaRecorder│  │ - Full audio   │
│   API          │  │ - 1s timeslice │  │ - Upload once  │
│ - interimRes.  │  │ - POST chunks  │  │ - Whisper API  │
│                │  │                │  │ - 3-5s SLA     │
│ Mobile:        │  │ Mobile:        │  │ - Replace all  │
│ - iOS Speech   │  │ - expo-av      │  │   text         │
│ - Android ASR  │  │ - 2s chunks    │  │ - Deepgram     │
│ - react-native │  │ - stop/start   │  │   fallback     │
│   -voice       │  │ - upload each  │  │                │
│                │  │                │  │                │
│ Latency:       │  │ Latency:       │  │ Latency:       │
│ <500ms         │  │ 1-2s per chunk │  │ 3-5s total     │
└────────────────┘  └────────────────┘  └────────────────┘
                              ▼
                    ┌────────────────┐
                    │  AI-PROXY-ASR  │
                    │  Edge Functions│
                    ├────────────────┤
                    │ /transcribe-   │
                    │  chunk         │
                    │ /transcribe-   │
                    │  final         │
                    │ /transcribe-   │
                    │  health        │
                    └────────────────┘
                              ▼
                    ┌────────────────┐
                    │  OpenAI Whisper│
                    │  (Primary)     │
                    │                │
                    │  Deepgram      │
                    │  (Fallback)    │
                    └────────────────┘
```

---

## 📊 Performance Targets

### Current State (Batch Only)
```
User stops speaking
  ↓
Recording stops: ~100ms
  ↓
Upload to storage: 1-2s
  ↓
Edge function downloads: 200-500ms
  ↓
Whisper transcription: 3-5s
  ↓
TOTAL: 5-10 seconds ❌
```

### Target State (Hybrid)
```
User starts speaking
  ↓
On-device ASR starts: <500ms ✓ (INSTANT FEEDBACK)
  ↓
First chunk transcribed: ~1.5s ✓ (PROGRESSIVE UPDATE)
  ↓
Subsequent chunks: ~1-2s each ✓ (REAL-TIME FEEL)
  ↓
User stops speaking
  ↓
Final pass completes: 3-5s ✓ (ACCURACY)
  ↓
PERCEIVED LATENCY: <500ms to first text ✅
ACTUAL ACCURACY: Same or better than current ✅
```

### SLA Targets

| Metric | Target | Current |
|--------|--------|---------|
| **First Feedback** | <500ms (device) | 5-10s |
| **First Chunk** | <1.5s | N/A |
| **Chunk Cadence** | 1-2s | N/A |
| **Final Accuracy** | ≥ current | baseline |
| **Error Rate** | <5% | unknown |
| **Perceived Speed** | 10x faster | baseline |

---

## 🔧 Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Quick wins + infrastructure

1. ✅ **Audio Compression** (15 min)
   - Update `lib/voice-pipeline.ts` recording config
   - 16kHz, mono, 32kbps → 84% size reduction
   - Expected: 80-120 KB per 30s chunk

2. ✅ **Backend Endpoints** (2-3 hours)
   - Create `supabase/functions/ai-proxy-asr/transcribe-chunk/`
   - Create `supabase/functions/ai-proxy-asr/transcribe-final/`
   - Create `supabase/functions/ai-proxy-asr/transcribe-health/`
   - JWT auth, rate limiting, logging

3. ✅ **On-Device ASR Wrappers** (2-3 hours)
   - `lib/speech/web-asr.ts` (Web Speech API)
   - `lib/speech/native-asr.ts` (iOS/Android)
   - `lib/speech/asr-manager.ts` (unified interface)

4. ✅ **Web Chunked Streaming** (3-4 hours)
   - Update `lib/voice-pipeline.ts`
   - MediaRecorder with 1s timeslice
   - POST chunks to edge function
   - Maintain chunk map and stitch results

**Deliverable:** Web users see instant device feedback + progressive chunks

### Phase 2: Mobile Optimization (Week 2)
**Goal:** Mobile-first improvements

1. ✅ **Mobile Chunking** (2-3 hours)
   - Implement stop/start chunking with expo-av
   - 2s chunks to reduce gaps
   - Double-buffering pattern

2. ✅ **Hybrid Manager** (3-4 hours)
   - Create `lib/speech/hybrid-transcription.ts`
   - Orchestrate 3 tiers
   - Smart merging logic
   - Handle dropped chunks

3. ✅ **UI/UX Integration** (2-3 hours)
   - Update `components/ai/VoiceRecorderSheet.tsx`
   - Update `components/ai/DashAssistant.tsx`
   - Progress states and badges
   - Accessibility support

**Deliverable:** Mobile users see device ASR + chunked batch + final

### Phase 3: Advanced Streaming (Week 3 - Optional)
**Goal:** Sub-second updates for power users

1. ⚠️ **WebSocket Pseudo-Stream** (4-6 hours)
   - Implement `lib/speech/ws-streamer.ts`
   - Edge function WebSocket endpoint
   - 200-300ms frames → 1s micro-batches
   - SSE or WS for partials

2. ⚠️ **Native Streaming Module** (6-8 hours)
   - Add `react-native-live-audio-stream`
   - Replace stop/start with PCM frames
   - 200-500ms frame rate
   - Requires EAS dev client

**Deliverable:** 300-600ms latency for web power users

---

## 📁 File Structure

```
edudashpro/
├── lib/
│   ├── speech/                          # NEW DIRECTORY
│   │   ├── web-asr.ts                  # Web Speech API wrapper
│   │   ├── native-asr.ts               # iOS/Android ASR
│   │   ├── asr-manager.ts              # Unified interface
│   │   ├── hybrid-transcription.ts     # Orchestrator
│   │   └── ws-streamer.ts              # Optional WebSocket client
│   └── voice-pipeline.ts               # UPDATED: chunking logic
├── services/
│   └── DashAIAssistant.ts              # UPDATED: use HybridManager
├── components/ai/
│   ├── VoiceRecorderSheet.tsx          # UPDATED: progressive UI
│   └── DashAssistant.tsx               # UPDATED: state badges
├── supabase/functions/
│   └── ai-proxy-asr/                   # NEW EDGE FUNCTIONS
│       ├── transcribe-chunk/
│       │   └── index.ts                # Chunk endpoint
│       ├── transcribe-final/
│       │   └── index.ts                # Final endpoint
│       └── transcribe-health/
│           └── index.ts                # Health check
└── docs/voice/
    └── HYBRID_REALTIME_TRANSCRIPTION_PLAN.md  # This file
```

---

## 🔐 Security & Compliance

### Authentication
- All `ai-proxy-asr` endpoints require Supabase JWT
- Verify `preschool_id` context for multi-tenant isolation
- Service role key only server-side (WARP rule compliance)

### Rate Limiting
- Max 60 chunks per session
- 1 request/sec per session baseline
- Burst up to 3 requests/sec
- JWT-based user identification

### Data Handling
- **DO NOT** store chunk audio files
- Store only final transcript in database
- Log usage metrics in `ai_usage_logs`:
  - `preschool_id`, `user_id`
  - `feature: "asr"`
  - `tier: "chunk" | "final" | "device"`
  - `tokens`, `latency_ms`

### PII Protection
- No audio stored beyond transcription window
- Final transcript only persisted
- No cross-tenant data leakage

### Cost Controls
- If audio duration > 90s, increase chunk size to 2s
- Adaptive throttling based on API quotas
- Timeouts: 10s for chunks, 60s for final

---

## 🧪 Testing Strategy

### Test Matrix

| Test | Description | Platform | Expected |
|------|-------------|----------|----------|
| **T1** | Normal flow | All | Device <500ms, chunks ~1.5s, final 3-5s |
| **T2** | Offline mode | All | Device only, banner shown |
| **T3** | Network jitter | All | Drop 10-20% chunks, recover in final |
| **T4** | Long recording (60s) | All | 60 chunks, coherent stitching |
| **T5** | Provider failure | All | Fallback to Deepgram, badge shown |
| **T6** | WebSocket stream | Web | 300-600ms partials |
| **T7** | Low-end Android | Mobile | CPU/memory acceptable |
| **T8** | Permissions | All | Graceful degradation |

### Performance Benchmarks

```typescript
// Track metrics
analytics.track('hybrid_transcription_performance', {
  device_asr_latency_ms: 450,
  first_chunk_latency_ms: 1300,
  avg_chunk_latency_ms: 1100,
  final_transcription_latency_ms: 4200,
  total_audio_duration_ms: 30000,
  chunk_count: 30,
  chunk_drop_rate: 0.03,
  network_type: '4g',
  platform: 'web'
});
```

### Alerts
- Alert if first_feedback > 800ms (web) or > 1200ms (mobile)
- Alert if error_rate > 5%
- Alert if final_latency > 8s

---

## 💡 Key Design Decisions

### Why Batch Method?
- **Cost:** Whisper batch is significantly cheaper than Realtime API
- **Accuracy:** Whisper batch has better accuracy for SA languages
- **Simplicity:** Fewer moving parts than true WebRTC streaming
- **Compliance:** Easier to log/audit batch calls vs streaming

### Why 3 Tiers?
- **Tier 1 (Device):** Instant UX, masks network latency
- **Tier 2 (Chunks):** Progressive accuracy, feels real-time
- **Tier 3 (Final):** Full accuracy, clean punctuation

### Why 1s Chunks?
- Balance between API QPS and perceived latency
- 2s chunks = more accurate but slower feel
- 500ms chunks = too many API calls, higher cost
- 1s is the sweet spot

### Fallback Strategy
1. Try on-device ASR (if available)
2. Try chunked batch (if online)
3. Try final pass with Whisper
4. Fallback to Deepgram
5. If all fail, keep stitched chunks

---

## 📈 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| First Feedback | 5-10s | <500ms | **90-95%** ✅ |
| User Perception | "Slow" | "Instant" | **Subjective Win** ✅ |
| Accuracy | Baseline | Same or better | **No Regression** ✅ |
| Cost per minute | $0.006 | $0.006-0.009 | **Minimal increase** ✅ |
| Network usage | 500 KB | 420 KB | **16% reduction** ✅ |
| Error recovery | None | Graceful | **Better UX** ✅ |

---

## 🚀 Rollout Plan

### Week 1: Foundation
- [ ] Audio compression (all platforms)
- [ ] Backend edge functions
- [ ] On-device ASR wrappers
- [ ] Web chunked streaming
- [ ] Basic UI states
- **Deploy to:** Internal testing (dev environment)

### Week 2: Mobile + Polish
- [ ] Mobile chunking
- [ ] Hybrid transcription manager
- [ ] UI/UX polish
- [ ] Performance monitoring
- [ ] Security hardening
- **Deploy to:** Beta testers (10% rollout)

### Week 3: Advanced (Optional)
- [ ] WebSocket pseudo-stream (web)
- [ ] Native streaming module (mobile)
- [ ] Fine-tuning and optimization
- **Deploy to:** Power users (50% rollout)

### Week 4: Full Rollout
- [ ] Monitor metrics and alerts
- [ ] Fix any critical issues
- [ ] Documentation updates
- **Deploy to:** All users (100% rollout)

### Rollback Plan
- Feature flags allow instant rollback to batch-only
- Keep old transcription path as fallback
- SLO monitoring triggers automatic rollback if error rate > 5%

---

## 🎓 User Experience Flow

### Current Experience
```
User: [Speaks for 30s]
      [Releases button]
      [Waits... 5-10 seconds... 🕐]
      [Finally sees transcript]
      
Feedback: "Is it working? Did it hear me?"
```

### New Hybrid Experience
```
User: [Speaks for 30s]
      [Sees text appearing instantly as they speak] ✨
      [Releases button]
      [Text refines in 1-2 seconds]
      [Final polished version appears in 3-5s] ✓
      
Feedback: "Wow, it's so fast! It understands me!"
```

---

## 🔧 Configuration & Feature Flags

### Environment Variables (.env)

```bash
# Feature Flags
EXPO_PUBLIC_ENABLE_HYBRID_TRANSCRIPTION=true
EXPO_PUBLIC_ENABLE_ON_DEVICE_ASR=true
EXPO_PUBLIC_ENABLE_CHUNKED_TRANSCRIPTION=true
EXPO_PUBLIC_ENABLE_WEBRTC_STREAMING=false
EXPO_PUBLIC_CHUNK_DURATION_MS=1000

# Backend (Edge Function Secrets)
TRANSCRIPTION_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_TRANSCRIPTION_MODEL=whisper-1
DEEPGRAM_API_KEY=...  # Optional fallback

# Tuning
ASR_CHUNK_TIMEOUT_MS=10000
ASR_FINAL_TIMEOUT_MS=60000
ASR_MAX_CHUNKS_PER_SESSION=60
ASR_MAX_CHUNK_SIZE_MB=2
```

### Runtime Feature Toggles

```typescript
// Via PostHog or custom feature flag service
const config = {
  hybridTranscription: {
    enabled: true,
    deviceASR: true,
    chunkedBatch: true,
    webrtcStreaming: false,
    chunkDurationMs: 1000
  }
};
```

---

## 📚 Related Documentation

- [VOICE_TRANSCRIPTION_ENHANCEMENTS.md](../VOICE_TRANSCRIPTION_ENHANCEMENTS.md) - Previous batch improvements
- [TRANSCRIPTION_SPEED_OPTIMIZATION.md](../../docs/performance/TRANSCRIPTION_SPEED_OPTIMIZATION.md) - Speed analysis
- [STREAMING_TRANSCRIPTION_MIGRATION_TODO.md](../STREAMING_TRANSCRIPTION_MIGRATION_TODO.md) - WebRTC migration notes
- [CLIENT_INTEGRATION.md](./CLIENT_INTEGRATION.md) - Voice API usage guide

---

## ✅ Success Criteria

### Technical
- [x] First feedback latency < 500ms (device ASR)
- [ ] First chunk latency < 1.5s
- [ ] Chunk cadence 1-2s
- [ ] Final accuracy ≥ current baseline
- [ ] Error rate < 5%
- [ ] Works on low-end Android

### User Experience
- [ ] Users perceive 10x speed improvement
- [ ] No regression in transcription quality
- [ ] Graceful offline degradation
- [ ] Clear progress indicators

### Business
- [ ] Cost increase < 50% (chunking overhead)
- [ ] Network usage reduced by audio compression
- [ ] Rollout without incidents
- [ ] Positive user feedback

---

## 🐛 Known Limitations & Future Work

### Current Limitations
1. **English Only:** Device ASR and initial chunking English-only (no i18n yet)
2. **Web First:** Mobile streaming is stop/start chunks (gaps possible)
3. **No Offline Queue:** Chunks lost if network drops (final pass recovers)
4. **Punctuation:** Chunks have minimal punctuation (final pass fixes)

### Future Enhancements
1. **Multi-Language ASR:** Support Afrikaans, Zulu, Xhosa on-device models
2. **Native Streaming:** Replace stop/start with continuous PCM frames on mobile
3. **WebRTC True Streaming:** Sub-second updates via WebRTC data channels
4. **Offline Queue:** Cache chunks when offline, sync when online
5. **Speaker Diarization:** Multi-speaker detection for classroom recordings
6. **Custom Vocabulary:** Domain-specific terms (education, SA context)

---

## 🙏 Acknowledgments

This design synthesizes:
- Existing batch transcription infrastructure (`transcribe-audio` Edge Function)
- WebRTC/streaming research (`STREAMING_TRANSCRIPTION_MIGRATION_TODO.md`)
- Performance optimization insights (`TRANSCRIPTION_SPEED_OPTIMIZATION.md`)
- WARP.md governance rules (AI calls via ai-proxy, server-side secrets)
- Real-world mobile constraints (low-end Android, unreliable networks)

**Design Philosophy:** Maximize perceived speed without sacrificing accuracy or cost-effectiveness, using battle-tested batch APIs as the foundation.

---

**Status:** ✅ Ready for Implementation  
**Next Step:** Begin Phase 1 - Foundation (audio compression + backend endpoints)  
**Owner:** Development Team  
**Timeline:** 3-4 weeks for full rollout

*This document will be updated with implementation progress and benchmark results.*
