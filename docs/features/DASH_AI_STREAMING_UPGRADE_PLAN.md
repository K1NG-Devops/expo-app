# Dash AI Streaming Upgrade Plan (Phase 2)

**Status:** Planned for Phase 2 (Week 2)  
**Priority:** Medium (AI Performance Optimization)  
**Effort:** 3-4 hours  
**Roadmap Reference:** `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md` Phase 2

---

## Current Implementation (Phase 0)

**Non-Streaming Request/Response:**
- ✅ Works on all platforms (Android, iOS, web)
- ✅ Reliable, simple implementation
- ✅ Response time: ~6-7 seconds (acceptable for Phase 0)
- ❌ User sees nothing until full response is ready
- ❌ No progressive rendering of AI responses

**Location:** `services/dash-ai/DashAICore.ts::callAIService()`

```typescript
// Current: Traditional fetch with JSON response
const { data, error } = await this.supabaseClient.functions.invoke('ai-gateway', {
  body: { action: 'general_assistance', messages, context }
});
// User waits ~6-7s, then sees full response at once
```

---

## Planned Upgrade: WebSocket Streaming (Phase 2)

### Why WebSocket?
- ✅ Native support in React Native (no polyfill needed)
- ✅ True bidirectional streaming
- ✅ Can handle interruptions/cancellations mid-stream
- ✅ Lower latency than HTTP long-polling
- ✅ Works on Android, iOS, and web

### Technical Approach

#### 1. Create WebSocket Edge Function
**File:** `supabase/functions/ai-gateway-ws/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Upgrade HTTP to WebSocket
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onmessage = async (event) => {
    const { action, messages, context } = JSON.parse(event.data);
    
    // Stream AI response using Anthropic SDK
    const stream = await anthropic.messages.stream({
      model: "claude-3-5-sonnet-20241022",
      messages,
      max_tokens: 4096,
      stream: true,
    });

    // Forward chunks to client
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta") {
        socket.send(JSON.stringify({
          type: "chunk",
          content: chunk.delta.text,
        }));
      }
    }

    // Signal completion
    socket.send(JSON.stringify({ type: "done" }));
  };

  socket.onerror = (e) => console.error("[WS] Error:", e);
  socket.onclose = () => console.log("[WS] Connection closed");

  return response;
});
```

#### 2. Update DashAICore Streaming Logic
**File:** `services/dash-ai/DashAICore.ts`

```typescript
private async callAIServiceStreaming(
  params: any,
  onChunk: (chunk: string) => void
): Promise<any> {
  // Detect platform and choose protocol
  if (Platform.OS === 'web') {
    // Use SSE on web (already implemented)
    return this.callAIServiceStreamingSSE(params, onChunk);
  } else {
    // Use WebSocket on React Native
    return this.callAIServiceStreamingWS(params, onChunk);
  }
}

private async callAIServiceStreamingWS(
  params: any,
  onChunk: (chunk: string) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const wsUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL!.replace('https', 'wss')}/functions/v1/ai-gateway-ws`;
    const ws = new WebSocket(wsUrl);

    let accumulated = '';

    ws.onopen = () => {
      // Send request
      ws.send(JSON.stringify({
        action: params.action,
        messages: params.messages,
        context: params.context,
        model: params.model,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chunk') {
        accumulated += data.content;
        onChunk(data.content);
      } else if (data.type === 'done') {
        ws.close();
        resolve({ content: accumulated, metadata: {} });
      } else if (data.type === 'error') {
        ws.close();
        reject(new Error(data.message));
      }
    };

    ws.onerror = (error) => {
      reject(error);
    };

    ws.onclose = () => {
      console.log('[DashAICore] WebSocket closed');
    };
  });
}
```

#### 3. Update UI Components
**File:** `components/ai/DashAssistant.tsx`

```typescript
// Enable streaming on all platforms
const streamingEnabled = 
  process.env.EXPO_PUBLIC_AI_STREAMING_ENABLED === 'true' || 
  process.env.EXPO_PUBLIC_ENABLE_AI_STREAMING === 'true';

// No platform check needed - works everywhere now
```

---

## Implementation Checklist

### Backend (Supabase Edge Functions)
- [ ] Create `supabase/functions/ai-gateway-ws/index.ts`
- [ ] Implement WebSocket upgrade handler
- [ ] Add authentication (JWT token validation)
- [ ] Add error handling and connection timeouts
- [ ] Add usage tracking (same as HTTP version)
- [ ] Deploy to Supabase: `supabase functions deploy ai-gateway-ws`

### Frontend (DashAICore)
- [ ] Add `callAIServiceStreamingWS()` method
- [ ] Update `callAIServiceStreaming()` to detect platform
- [ ] Add WebSocket connection pooling (reuse connections)
- [ ] Add reconnection logic for network interruptions
- [ ] Add cancellation support (user stops mid-stream)
- [ ] Update loading states to show "Streaming..." vs "Thinking..."

### UI Updates
- [ ] Remove Platform.OS check in `DashAssistant.tsx`
- [ ] Update typing indicator to show progressive chunks
- [ ] Add "Stop streaming" button during response
- [ ] Test on Android physical device
- [ ] Test on iOS simulator
- [ ] Test on web browser

### Testing
- [ ] Unit tests for WebSocket connection lifecycle
- [ ] Integration tests for streaming responses
- [ ] Test interruption/cancellation mid-stream
- [ ] Test network failure recovery
- [ ] Load test with multiple concurrent streams
- [ ] Monitor memory usage during long streams

---

## Success Metrics (Phase 2)

From `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md`:

**Phase 2 Goals:**
- ✅ First token latency < 1.5s (vs current ~6s for full response)
- ✅ Progressive rendering: user sees response within 1s
- ✅ Concurrent requests: 3+ conversations without queue blocking
- ✅ Memory: stable under 150MB during streaming

**Measurement:**
```typescript
// Add analytics in DashAICore
track('edudash.dash_ai.streaming_metrics', {
  first_token_ms: Date.now() - requestStartTime,
  total_duration_ms: Date.now() - requestStartTime,
  chunks_received: chunkCount,
  bytes_streamed: totalBytes,
  platform: Platform.OS,
});
```

---

## Dependencies

- ✅ Deno WebSocket support (already available in Supabase Edge Functions)
- ✅ React Native WebSocket API (built-in)
- ✅ Anthropic SDK streaming API (already in use)
- ⚠️  Authentication: Need to pass JWT token in WebSocket handshake

---

## Migration Path

### Phase 0 → Phase 2
1. **Deploy new edge function** alongside existing `ai-gateway`
2. **Feature flag rollout:**
   ```typescript
   // .env
   EXPO_PUBLIC_AI_STREAMING_ENABLED=true
   EXPO_PUBLIC_USE_WEBSOCKET_STREAMING=true
   ```
3. **Gradual rollout:**
   - Week 2 Day 1-2: Internal testing (dev builds)
   - Week 2 Day 3-4: Beta users (10% rollout)
   - Week 2 Day 5+: Full production rollout
4. **Monitor metrics** for 48 hours before full rollout
5. **Keep HTTP fallback** for unsupported environments

### Rollback Plan
If WebSocket streaming causes issues:
1. Set `EXPO_PUBLIC_USE_WEBSOCKET_STREAMING=false`
2. App immediately falls back to HTTP non-streaming
3. No code changes needed, no new deployment
4. Investigate issues, fix, re-enable flag

---

## Related Files

**Implementation:**
- `services/dash-ai/DashAICore.ts` - Main streaming logic
- `supabase/functions/ai-gateway-ws/index.ts` - WebSocket edge function
- `components/ai/DashAssistant.tsx` - UI progressive rendering

**Documentation:**
- `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md` - Phase 2 roadmap
- `docs/features/streaming-ai-chat-implementation.md` - Original streaming spec

**Testing:**
- `tests/ai/streaming.test.ts` - Unit tests (to be created)
- `tests/integration/websocket-streaming.test.ts` - Integration tests (to be created)

---

## Notes

- **Do not implement during Phase 0** - non-streaming works fine for quick wins
- **Phase 2 priority** - combine with concurrency fixes and memory optimization
- **Estimated total effort:** 3-4 hours (1h backend, 2h frontend, 1h testing)
- **User impact:** Perceived response time goes from ~6s to <1.5s
- **Technical debt:** None - clean implementation, no breaking changes

---

**Last Updated:** 2025-10-20  
**Next Review:** Phase 2 kickoff (Week 2)
