# Streaming Voice Chat: Research & Best Practices

## Problem Statement

Voice Orb streaming responses are not working optimally - getting raw JSON instead of clean text.

## Research Sources

### 1. OpenAI Whisper API (Official)
**Source**: https://platform.openai.com/docs/guides/speech-to-text

**Recommendations**:
- Use Whisper for **complete audio files**, not chunked streaming
- Audio format: m4a, mp3, mp4, mpeg, mpga, wav, webm
- Optimal: 16kHz sample rate, mono channel
- Process entire recording at once for best accuracy

**✅ Current Implementation**: Using non-streaming Whisper via stt-proxy - CORRECT

### 2. Anthropic Claude Streaming (Official)
**Source**: https://docs.anthropic.com/claude/reference/messages-streaming

**SSE Event Format**:
```json
// Event types:
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_delta  
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: message_stop
data: {"type":"message_stop"}
```

**Key Points**:
- Only `content_block_delta` events contain text
- Extract: `event.delta.text` (NOT `event.text`)
- Ignore all other event types for text accumulation

**⚠️ Current Issue**: Parser assumes format but actual format may differ

### 3. Expo AV Recording (Official)
**Source**: https://docs.expo.dev/versions/v53.0.0/sdk/av/

**Best Practices**:
```typescript
// ✅ CORRECT: Record complete audio
recording.prepareToRecordAsync(options);
recording.startAsync();
// ... user speaks ...
await recording.stopAndUnloadAsync(); // May throw if already stopped
const uri = recording.getURI();

// Transcribe complete file
const result = await whisper.transcribe(uri);
```

**Error Handling**:
- `stopAndUnloadAsync()` throws if already stopped → wrap in try-catch
- Always check URI exists before transcription
- Validate file size > 1024 bytes

**✅ Current Implementation**: Correct per docs

### 4. React Native Streaming Best Practices

**Pattern** (Industry Standard):
```typescript
// 1. STT: Complete audio → text
const transcript = await stt.transcribe(audioFile);

// 2. LLM: Text → streaming response
let accumulated = '';
const stream = await llm.chat(transcript, {
  stream: true,
  onChunk: (chunk) => {
    // CRITICAL: Know the exact format your LLM returns
    // Option A: Plain text chunks
    if (typeof chunk === 'string') {
      accumulated += chunk;
    }
    // Option B: SSE format
    else if (chunk.type === 'content_block_delta') {
      accumulated += chunk.delta.text;
    }
    // Option C: Custom format
    else {
      accumulated += extractText(chunk);
    }
    
    // Display + speak complete sentences
    if (hasSentenceEnd(accumulated)) {
      speak(accumulated);
    }
  }
});

// 3. TTS: Clean text → speech
await tts.speak(accumulated);
```

## Diagnosis: What's Wrong

Based on your log:
```
WARN  [useDashVoiceSession] 🚫 TTS TEMPORARILY DISABLED (would speak): data: {"type":"content_block_delta","delta":{"text
```

**Problem**: The streaming callback is receiving the raw SSE string format (`data: {...}`), but your parser expects either:
1. `chunk.startsWith('data:')` - which it DOES match
2. But then `JSON.parse()` might be failing on incomplete JSON

**Root Cause**: The chunk might be:
- Incomplete JSON (split mid-object)
- Multiple events concatenated  
- Has newlines/whitespace that breaks parsing

## Solution: Robust SSE Parser

```typescript
// components/ai/dash-voice-mode/useDashVoiceSession.ts

// Add buffer to accumulate incomplete SSE chunks
const sseBufferRef = useRef<string>('');

const response = await dashInstance.sendMessage(transcript, undefined, undefined, (chunk: string) => {
  if (abortSpeechRef.current) return;
  
  // ROBUST SSE PARSER
  sseBufferRef.current += chunk;
  
  // Split on double newline (SSE event separator)
  const events = sseBufferRef.current.split('\\n\\n');
  
  // Keep last incomplete event in buffer
  sseBufferRef.current = events.pop() || '';
  
  for (const eventStr of events) {
    if (!eventStr.trim()) continue;
    
    try {
      // Extract data line
      const dataMatch = eventStr.match(/^data: (.+)$/m);
      if (!dataMatch) continue;
      
      const jsonStr = dataMatch[1];
      const event = JSON.parse(jsonStr);
      
      // Extract text from content_block_delta only
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const textChunk = event.delta.text;
        
        accumulatedResponse += textChunk;
        sentenceBuffer += textChunk;
        setAiResponse(accumulatedResponse);
        
        // Speak complete sentences
        if (sentenceEndRegex.test(sentenceBuffer.trim())) {
          const sentence = sentenceBuffer.trim();
          sentenceBuffer = '';
          if (__DEV__) console.log('[Stream] Sentence:', sentence);
          speakText(sentence); // Don't await - speak in background
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[Stream] Parse error:', eventStr.substring(0, 100), e);
    }
  }
});

// Reset buffer after stream completes
sseBufferRef.current = '';
```

## Alternative: Check What DashAI Actually Sends

**Debug First**:
```typescript
const response = await dashInstance.sendMessage(transcript, undefined, undefined, (chunk: string) => {
  // LOG EXACT FORMAT
  console.log('[STREAM DEBUG] Type:', typeof chunk);
  console.log('[STREAM DEBUG] Length:', chunk.length);
  console.log('[STREAM DEBUG] First 200 chars:', chunk.substring(0, 200));
  console.log('[STREAM DEBUG] Has newlines:', chunk.includes('\\n'));
  console.log('[STREAM DEBUG] Starts with data:', chunk.startsWith('data:'));
  
  // Then parse based on actual format
});
```

## Recommended Action Plan

1. ✅ **Keep non-streaming Whisper** - working correctly
2. ⚠️ **Fix streaming parser** - add buffer for incomplete chunks
3. ✅ **Keep JSON guards** - prevent speaking raw JSON
4. ⚠️ **Add debug logs** - see exact format DashAI sends
5. ✅ **Test end-to-end** - verify clean text flow

## Documentation References

Per WARP.md requirements:

1. **Anthropic Claude Streaming**: https://docs.anthropic.com/claude/reference/messages-streaming
   - Used for: SSE format understanding, event types, text extraction
   
2. **OpenAI Whisper API**: https://platform.openai.com/docs/guides/speech-to-text
   - Used for: Complete audio transcription best practices
   
3. **Expo AV v15.1.7**: https://docs.expo.dev/versions/v53.0.0/sdk/av/
   - Used for: Recording lifecycle, error handling
   
4. **React Native 0.79**: https://reactnative.dev/docs/0.79/getting-started
   - Used for: useCallback patterns, ref handling

## Next Steps

1. Add SSE buffer logic to handle incomplete chunks
2. Add debug logs to see exact callback format
3. Test with real voice input
4. Remove debug logs once working
5. Document final working pattern

---

**Status**: Research complete, implementation guidance provided  
**Author**: AI Development Team  
**Date**: October 22, 2025