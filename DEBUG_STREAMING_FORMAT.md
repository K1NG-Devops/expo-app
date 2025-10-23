# Debug Streaming Format - Test Guide

## Purpose

Added comprehensive debug logs to see the EXACT format that DashAI sends in streaming callbacks.

## What Changed

**File**: `components/ai/dash-voice-mode/useDashVoiceSession.ts` (lines 256-272)

Added debug logging before the SSE parser to capture:
- Type of chunk (string/object)
- Length of chunk
- Full content of chunk
- First 200 characters
- Whether it contains newlines
- Whether it starts with "data:"
- Whether it contains expected JSON keys
- Whether it's valid JSON

## How to Test

### 1. Reload App on Android
```bash
# Ensure dev client is running
npm run dev:android
```

### 2. Open Voice Orb
- Tap the Voice Orb button
- Speak clearly: "Hello Dash, how are you?"
- Wait for AI response to start streaming

### 3. Watch Console Logs
Look for repeated blocks like:
```
==================== STREAM CHUNK DEBUG ====================
[STREAM] Type: string
[STREAM] Length: 156
[STREAM] Full content: data: {"type":"content_block_delta","delta":{"text":"Hello"}}

[STREAM] First 200 chars: data: {"type":"content_block_delta",...
[STREAM] Has newlines: true
[STREAM] Has double newlines: true
[STREAM] Starts with "data:": true
[STREAM] Includes "content_block_delta": true
[STREAM] Includes "delta": true
[STREAM] Is valid JSON: false
============================================================
```

### 4. Collect Information

**Copy the debug output** and note:

**Pattern A**: Complete JSON per chunk
```
data: {"type":"content_block_delta","delta":{"text":"Hi"}}

```

**Pattern B**: Split JSON across chunks
```
Chunk 1: data: {"type":"content_block_delta","del
Chunk 2: ta":{"text":"Hi"}}

```

**Pattern C**: Multiple events per chunk
```
data: {"type":"content_block_start"...}

data: {"type":"content_block_delta","delta":{"text":"Hi"}}

```

**Pattern D**: Already parsed objects (not strings)
```
{type: "content_block_delta", delta: {text: "Hi"}}
```

## What to Look For

### Critical Questions:

1. **Is chunk a string or object?**
   - If object: DashAI is pre-parsing, adjust parser
   - If string: Continue with SSE parsing

2. **Does it start with "data:"?**
   - Yes: Standard SSE format
   - No: Custom format

3. **Is it valid JSON?**
   - Yes: Single complete event, can parse directly
   - No: Split across chunks, need buffer

4. **Has double newlines (`\n\n`)?**
   - Yes: Event separator present, can split on it
   - No: Events might be incomplete

5. **Pattern of lengths?**
   - Consistent (e.g., 150-200): Likely complete events
   - Varying wildly (50, 180, 85): Likely split events

## Next Steps

### Once you have the logs:

**Scenario 1**: Chunk is already an object
```typescript
// No SSE parsing needed
const response = await dashInstance.sendMessage(transcript, undefined, undefined, (chunk: any) => {
  if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
    const text = chunk.delta.text;
    // Use text...
  }
});
```

**Scenario 2**: Chunk is complete SSE string
```typescript
// Simple parser
const response = await dashInstance.sendMessage(transcript, undefined, undefined, (chunk: string) => {
  const jsonStr = chunk.replace(/^data: /, '').trim();
  const event = JSON.parse(jsonStr);
  if (event.type === 'content_block_delta') {
    const text = event.delta.text;
    // Use text...
  }
});
```

**Scenario 3**: Chunk is incomplete SSE (split mid-JSON)
```typescript
// Buffered parser (from STREAMING_VOICE_RESEARCH.md)
const bufferRef = useRef('');

const response = await dashInstance.sendMessage(transcript, undefined, undefined, (chunk: string) => {
  bufferRef.current += chunk;
  const events = bufferRef.current.split('\n\n');
  bufferRef.current = events.pop() || '';
  
  for (const eventStr of events) {
    const match = eventStr.match(/^data: (.+)$/m);
    if (match) {
      const event = JSON.parse(match[1]);
      if (event.type === 'content_block_delta') {
        const text = event.delta.text;
        // Use text...
      }
    }
  }
});
```

## Cleanup

Once you determine the correct format, **remove the debug logs**:

```bash
# Edit useDashVoiceSession.ts
# Delete lines 256-272 (the debug block)
# Keep only the working parser
```

## Expected Outcome

After testing, you should know:
- ✅ Exact format DashAI sends
- ✅ Whether JSON is complete or split
- ✅ Whether buffering is needed
- ✅ Correct parser implementation

Then implement the right parser from `docs/features/STREAMING_VOICE_RESEARCH.md`.

---

**Status**: Debug logs added, ready for testing  
**File Modified**: `components/ai/dash-voice-mode/useDashVoiceSession.ts`  
**Next**: Test on Android and collect console output