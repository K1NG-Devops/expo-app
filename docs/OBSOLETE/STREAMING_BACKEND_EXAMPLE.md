# Realtime Voice Streaming – Backend Example and Token Validation

This document provides a minimal example of a WebSocket backend for Dash’s realtime voice streaming feature and how to validate Supabase JWTs provided by the client.

IMPORTANT
- The code here is an example you can adapt to your environment; it is not meant for production without hardening (rate limiting, timeouts, error handling, etc.).
- Replace placeholders like YOUR_SUPABASE_PROJECT_REF and SUPABASE_JWKS_URL accordingly.

Client behavior (already integrated on the frontend)
- Client opens a WebSocket to EXPO_PUBLIC_DASH_STREAM_URL
- It includes a token query param with the user’s Supabase access token: wss://host/voice-stream?token=SUPABASE_JWT
- Client sends binary audio frames (webm chunks) ~ every 250ms
- Backend should emit:
  - {"type":"partial_transcript","text":"..."}
  - {"type":"final_transcript","text":"..."}
  - {"type":"assistant_token","text":"..."}
  - {"type":"done"}

Option A: Node + ws example

```ts path=null start=null
// server.ts (Node)
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 8787;
const JWKS_URL = process.env.SUPABASE_JWKS_URL || 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/keys';

async function getJwks() {
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  return res.json();
}

function getKey(header: any, callback: any, jwks: any) {
  try {
    const key = jwks.keys.find((k: any) => k.kid === header.kid);
    if (!key) return callback(new Error('No matching JWKS key'));
    // Convert JWKS to PEM
    const pub = `-----BEGIN PUBLIC KEY-----\n${key.x5c?.[0] || ''}\n-----END PUBLIC KEY-----\n`;
    callback(null, pub);
  } catch (e) {
    callback(e);
  }
}

async function verifySupabaseToken(token: string) {
  const jwks = await getJwks();
  return new Promise((resolve, reject) => {
    jwt.verify(token, (header: any, cb: any) => getKey(header, cb, jwks), (err: any, payload: any) => {
      if (err) return reject(err);
      resolve(payload);
    });
  });
}

const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/voice-stream' });

wss.on('connection', async (ws, req) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || '';
    if (!token) {
      ws.close(1008, 'Auth required');
      return;
    }

    // Validate JWT
    let user: any = null;
    try {
      user = await verifySupabaseToken(token);
    } catch (e) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // You now have user info (sub, email, etc.)
    console.log('WS connected:', user?.sub);

    ws.on('message', async (data, isBinary) => {
      // data is an audio chunk (webm). Buffer it or stream to STT provider.
      // For demo, we mock transcription + assistant streaming:
      try {
        // Emit fake partial transcript every few chunks
        ws.send(JSON.stringify({ type: 'partial_transcript', text: 'Listening…' }));

        // TODO: Send data to your STT provider, aggregate partial + final
        // TODO: Call your LLM with transcript and stream tokens back
      } catch (e) {
        console.error('WS message error', e);
      }
    });

    ws.on('close', () => {
      console.log('WS closed:', user?.sub);
    });
  } catch (e) {
    try { ws.close(1011, 'Server error'); } catch {}
  }
});

server.listen(PORT, () => console.log(`WS server listening on :${PORT}`));
```

Notes
- SUPABASE_JWKS_URL should be:
  https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/keys
- Alternatively, use Supabase’s Admin API with supabase-js server client to inspect the token.
- In production, build a streaming pipeline:
  - Audio -> STT (partial + final) -> LLM (stream tokens) -> WS
  - Ensure backpressure and rate limiting.

Option B: Supabase Edge Functions (Deno) note
- Edge Functions currently focus on HTTP; WebSocket support exists via Deno’s std/http/upgrades in newer runtimes, but may be limited.
- If using Edge Functions, you can still validate the token by reading the Authorization header (for HTTP) or managing a custom gateway that upgrades to WS and validates the token.

Client help
- Frontend already attaches the Supabase access token via tokenProvider().
- If your gateway prefers headers, update useRealtimeVoice to send Sec-WebSocket-Protocol or query params accordingly.

Security checklist
- Validate JWT and enforce RLS on your AI services.
- Rate limit inbound WS connections and per-user concurrency.
- Cap stream duration (e.g., 60–120 seconds) and chunk size limits.
- Close idle or abusive connections.
