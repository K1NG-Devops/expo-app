# Transcription Speed Optimization Plan

**Date**: 2025-01-14  
**Priority**: 🟡 MEDIUM-HIGH  
**Status**: 📋 PLANNED  

---

## 🎯 Goal

Reduce voice transcription latency from current ~5-10 seconds to under 2 seconds for typical voice messages.

---

## 📊 Current Performance Analysis

### Current Flow
```
User releases mic button
    ↓
Audio recording stops (instant)
    ↓
Audio file written to disk (~100-500ms)
    ↓
File uploaded to Supabase Storage (~500-2000ms depending on size/network)
    ↓
Edge Function receives audio URL
    ↓
Edge Function downloads audio from storage (~200-500ms)
    ↓
Edge Function calls Whisper API (~2-5 seconds)
    ↓
Transcription returned to client
    ↓
TOTAL: ~5-10 seconds ❌
```

### Bottlenecks Identified

1. **File Upload Latency** (~1-2s)
   - Uploading to Supabase Storage adds network roundtrip
   - Unnecessary for short audio clips

2. **Edge Function Download** (~200-500ms)
   - Edge function downloads from storage before transcribing
   - Another unnecessary network hop

3. **No Streaming/Progressive Feedback** 
   - User sees no progress during 5-10 second wait
   - Feels broken or frozen

4. **Network Quality Impact**
   - Poor network doubles transcription time
   - No optimization for mobile/unstable connections

---

## ✅ Optimization Strategies

### Strategy 1: Direct Base64 Upload (Fastest)

**Concept**: Send audio directly as base64 in Edge Function call, skip storage entirely

**Current**:
```typescript
// Record → Save to file → Upload to storage → Get URL → Send URL to edge function
const audioUri = recording.getURI();
const { data: uploadData } = await supabase.storage
  .from('voice-notes')
  .upload(filePath, audioBlob);

const { data } = await supabase.functions.invoke('transcribe', {
  body: { audioUrl: uploadData.path }
});
```

**Optimized**:
```typescript
// Record → Convert to base64 → Send directly to edge function
const audioUri = recording.getURI();
const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
  encoding: FileSystem.EncodingType.Base64
});

const { data } = await supabase.functions.invoke('transcribe', {
  body: {
    audioBase64: base64Audio,
    mimeType: 'audio/m4a' // or 'audio/webm', 'audio/wav'
  }
});
```

**Edge Function Changes**:
```typescript
// supabase/functions/transcribe/index.ts
const { audioBase64, audioUrl, mimeType } = await req.json();

let audioBuffer: ArrayBuffer;

if (audioBase64) {
  // Direct base64 - FAST PATH
  audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)).buffer;
} else if (audioUrl) {
  // Legacy storage URL - SLOW PATH
  const response = await fetch(audioUrl);
  audioBuffer = await response.arrayBuffer();
}

// Send to Whisper API
const formData = new FormData();
formData.append('file', new Blob([audioBuffer], { type: mimeType }), 'audio.m4a');
formData.append('model', 'whisper-1');

const transcription = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
  body: formData
});
```

**Benefits**:
- ✅ Saves 1-2 seconds (no storage upload)
- ✅ Saves 200-500ms (no storage download)
- ✅ Works better on poor networks (one request vs two)
- ✅ No storage quota usage

**Tradeoffs**:
- ⚠️ Larger Edge Function payload (base64 is ~33% bigger)
- ⚠️ Max audio size limited by Edge Function request limit (2MB default)
- ✅ Fine for voice messages (typically 50-500KB)

---

### Strategy 2: Progressive UI Feedback

**Problem**: User sees nothing during transcription

**Solution**: Show progressive states

```typescript
enum TranscriptionState {
  IDLE = 'idle',
  ENCODING = 'encoding',      // Converting audio format
  UPLOADING = 'uploading',    // Sending to server
  TRANSCRIBING = 'transcribing', // Waiting for Whisper
  DONE = 'done',
  ERROR = 'error'
}

const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>(TranscriptionState.IDLE);

// In UI
{transcriptionState === TranscriptionState.ENCODING && (
  <View style={styles.progressIndicator}>
    <ActivityIndicator size="small" />
    <Text>Processing audio...</Text>
  </View>
)}

{transcriptionState === TranscriptionState.UPLOADING && (
  <View style={styles.progressIndicator}>
    <ActivityIndicator size="small" />
    <Text>Sending...</Text>
    <ProgressBar progress={uploadProgress} />
  </View>
)}

{transcriptionState === TranscriptionState.TRANSCRIBING && (
  <View style={styles.progressIndicator}>
    <ActivityIndicator size="small" />
    <Text>Transcribing... (this may take a few seconds)</Text>
  </View>
)}
```

**Benefits**:
- ✅ Users know system is working
- ✅ Feels 30-50% faster (perceived performance)
- ✅ Can cancel if taking too long

---

### Strategy 3: Audio Compression

**Problem**: Large audio files take longer to upload/process

**Solution**: Compress audio before sending

```typescript
// Install: expo install expo-av
import { Audio } from 'expo-av';

// Configure recording for optimal size/quality balance
await recording.prepareToRecordAsync({
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 16000,  // Whisper works well with 16kHz
    numberOfChannels: 1, // Mono is enough for speech
    bitRate: 32000,      // 32kbps is fine for voice
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
});
```

**Benefits**:
- ✅ 50-70% smaller file size
- ✅ Faster upload
- ✅ Faster transcription (Whisper processes faster)
- ✅ No quality loss for speech

**Current Settings vs Optimized**:
| Setting | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| Sample Rate | 44100 Hz | 16000 Hz | -64% |
| Channels | 2 (stereo) | 1 (mono) | -50% |
| Bit Rate | 128 kbps | 32 kbps | -75% |
| **File Size** | **~500KB/min** | **~80KB/min** | **-84%** |

---

### Strategy 4: Client-Side Transcription (Advanced)

**Problem**: Server roundtrip always adds latency

**Solution**: Use on-device Whisper model

```typescript
// Use whisper.rn or expo-speech-recognition
// NOTE: Experimental, may have quality/compatibility issues

import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

const { results } = await ExpoSpeechRecognitionModule.recognize({
  audioUri: recording.getURI(),
  lang: 'en-US',
});

const transcription = results[0]?.transcript;
```

**Benefits**:
- ✅ Near-instant transcription (<500ms)
- ✅ Works offline
- ✅ No API costs

**Tradeoffs**:
- ⚠️ Lower accuracy than cloud Whisper
- ⚠️ Larger app bundle size (+5-20MB)
- ⚠️ Only works on newer devices
- ⚠️ Limited language support

**Recommendation**: Hybrid approach
- Use on-device for English
- Fall back to cloud for other languages
- Fall back to cloud if on-device fails

---

### Strategy 5: Parallel Processing

**Problem**: Sequential operations waste time

**Current**:
```
Stop recording → Wait → Upload → Wait → Transcribe → Wait
```

**Optimized**:
```
Stop recording
    ↓
    ├──> Start upload (background)
    └──> Show "Processing..." UI (immediate)
         ↓
         Wait for upload completion
         ↓
         Transcribe
```

**Implementation**:
```typescript
const handleVoiceEnd = async () => {
  // Show UI feedback IMMEDIATELY
  setTranscriptionState(TranscriptionState.ENCODING);
  
  try {
    const recording = await stopRecording();
    
    // Parallel operations
    const [audioData, _] = await Promise.all([
      // Read audio file
      FileSystem.readAsStringAsync(recording.uri, {
        encoding: FileSystem.EncodingType.Base64
      }),
      // Show uploading state after brief delay
      new Promise(resolve => {
        setTimeout(() => {
          setTranscriptionState(TranscriptionState.UPLOADING);
          resolve(null);
        }, 200);
      })
    ]);
    
    setTranscriptionState(TranscriptionState.TRANSCRIBING);
    
    // Send to transcription
    const result = await transcribeAudio(audioData);
    
    setTranscriptionState(TranscriptionState.DONE);
    return result;
    
  } catch (error) {
    setTranscriptionState(TranscriptionState.ERROR);
    throw error;
  }
};
```

---

## 📈 Expected Performance Improvements

| Strategy | Current | Optimized | Improvement |
|----------|---------|-----------|-------------|
| File Storage Upload | 1-2s | 0s (skipped) | **-100%** |
| Storage Download | 200-500ms | 0s (skipped) | **-100%** |
| Audio Compression | 500KB | 80KB | **-84%** |
| Whisper Processing | 3-5s | 2-3s | **-33%** |
| **TOTAL LATENCY** | **5-10s** | **2-3s** | **-60-70%** ✅ |

With on-device fallback:
- English transcription: **<500ms** 🚀
- Other languages: **2-3s**

---

## 🛠️ Implementation Plan

### Phase 1: Quick Wins (Do First) ⚡

1. **Audio Compression Settings**
   - File: `services/DashAIAssistant.ts` or voice recording setup
   - Change: Update recording config to 16kHz, mono, 32kbps
   - Time: 15 minutes
   - Impact: -84% file size, -30% transcription time

2. **Progressive UI Feedback**
   - File: `components/ai/DashAssistant.tsx`
   - Change: Add transcription state tracking + UI
   - Time: 30 minutes
   - Impact: Feels 30-50% faster

### Phase 2: Architecture Change (Bigger Impact) 🚀

3. **Direct Base64 Upload**
   - Files: 
     - `services/DashAIAssistant.ts` (client)
     - `supabase/functions/transcribe/index.ts` (server)
   - Change: Send audio as base64, skip storage
   - Time: 1 hour
   - Impact: -1.5s to -2.5s latency

### Phase 3: Advanced (Optional) 🔬

4. **On-Device Transcription**
   - Add: `expo-speech-recognition` or similar
   - Change: Hybrid on-device/cloud approach
   - Time: 2-3 hours
   - Impact: <500ms for English

---

## 🧪 Testing Strategy

### Performance Benchmarks

```typescript
const benchmarkTranscription = async () => {
  const durations = {
    recording: 0,
    encoding: 0,
    upload: 0,
    transcription: 0,
    total: 0
  };
  
  const start = Date.now();
  
  // ... transcription flow ...
  
  durations.total = Date.now() - start;
  
  console.log('[Transcription Benchmark]', durations);
  
  // Send to analytics
  analytics.track('transcription_performance', durations);
};
```

### Success Criteria

- [ ] 90th percentile latency < 3 seconds
- [ ] 50th percentile latency < 2 seconds
- [ ] No quality degradation vs current
- [ ] Works on slow 3G networks
- [ ] Error rate < 5%

---

## 🔒 Security Considerations

### Base64 Upload Limits

```typescript
// Edge function rate limiting
const MAX_AUDIO_SIZE_MB = 2;
const MAX_DURATION_SECONDS = 60;

// Validate on server
const audioSizeBytes = audioBase64.length * 0.75; // base64 to bytes
if (audioSizeBytes > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
  throw new Error('Audio file too large');
}
```

### Storage vs Base64 Decision

```typescript
// Client-side logic
const shouldUseStorage = (audioSizeKB: number) => {
  // Use storage for files > 1MB
  // Use base64 for files < 1MB
  return audioSizeKB > 1024;
};

if (shouldUseStorage(audioSize)) {
  // Legacy path: upload to storage
  transcribeViaStorage(audioUri);
} else {
  // Fast path: direct base64
  transcribeViaBase64(audioUri);
}
```

---

## 📦 Dependencies

### Required
- ✅ `expo-av` (already installed)
- ✅ `expo-file-system` (already installed)
- ✅ `@supabase/supabase-js` (already installed)

### Optional (for on-device)
- ⚠️ `expo-speech-recognition` (experimental)
- ⚠️ `whisper.rn` (native module)

---

## 💰 Cost Analysis

### Current Costs
- **Storage**: $0.021/GB/month × average usage
- **Bandwidth**: $0.09/GB egress
- **Whisper API**: $0.006/minute

### Optimized Costs
- **Storage**: $0 (no uploads for most messages)
- **Bandwidth**: $0.09/GB (same, but 84% less data)
- **Whisper API**: $0.006/minute (same)

**Savings**: ~90% reduction in storage costs, ~84% reduction in bandwidth

---

## 🚀 Rollout Strategy

### Week 1: Phase 1 (Safe)
- Implement audio compression
- Add progress UI
- Monitor for quality issues

### Week 2: Phase 2 (Test)
- Deploy base64 upload to 10% of users
- A/B test vs old method
- Monitor latency metrics

### Week 3: Phase 2 (Full)
- Roll out to 100% if successful
- Keep storage path as fallback

### Week 4+: Phase 3 (Experimental)
- Test on-device transcription
- Hybrid approach for premium tier

---

## 📊 Monitoring

### Key Metrics

```typescript
// Track these in PostHog/Sentry
analytics.track('voice_transcription_completed', {
  duration_ms: transcriptionTime,
  audio_size_kb: audioSize,
  method: 'base64' | 'storage',
  audio_duration_s: audioDuration,
  quality_score: transcriptionConfidence,
  error: null | errorMessage
});
```

### Alerts

- Alert if P95 latency > 5 seconds
- Alert if error rate > 10%
- Alert if transcription quality drops

---

## ✅ Next Steps

1. **Implement Phase 1** (audio compression + UI feedback)
2. **Test on various devices and networks**
3. **Measure baseline performance**
4. **Implement Phase 2** (base64 upload)
5. **A/B test and validate**
6. **Consider Phase 3** (on-device) based on results

---

**Status**: Ready to implement Phase 1  
**Owner**: Development Team  
**Timeline**: Week 1-2 for Phase 1, Week 3-4 for Phase 2

*This document will be updated with implementation progress and benchmark results.*