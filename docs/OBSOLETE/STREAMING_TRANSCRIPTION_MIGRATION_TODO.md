# Streaming Transcription Migration TODO

This document tracks the tasks to migrate from batch transcription to OpenAI Realtime streaming (WebRTC) with ephemeral tokens. Keep API keys server-side only.

## Why migrate
- Near real-time partial transcripts (ChatGPT-like experience)
- Lower perceived latency vs uploading full files
- Better UX for long voice notes (progressive text)

## Current state
- Batch transcription via OpenAI using `OPENAI_TRANSCRIPTION_MODEL` (default: `gpt-4o-mini-transcribe`)
- Ephemeral token mint function deployed: `openai-realtime-token`

## Target state
- Client connects via WebRTC to OpenAI Realtime using ephemeral token
- UI shows live partial transcripts and finalization
- Seamless fallback to batch transcription when streaming unavailable

---

## Backend (Supabase Edge Functions)
- [ ] Harden `openai-realtime-token` security
  - [ ] Require Supabase Auth JWT and validate user/role
  - [ ] Restrict allowed origins (for web) via allowlist
  - [ ] Rate limit per user/IP (basic token bucket or DB counter)
  - [ ] Add structured logs and error codes
  - [ ] Return minimal session config (no secrets beyond `client_secret`)
- [ ] Observability
  - [ ] Add log fields: user_id, role, model, timestamp, request_id
  - [ ] Emit usage metrics (function invocations, failures)
- [ ] Configuration
  - [ ] Confirm `OPENAI_REALTIME_MODEL` correctness and quotas
  - [ ] Document session TTL and renewal strategy

Example redeploy:
```bash path=null start=null
supabase functions deploy openai-realtime-token
```

---

## Client (React Native)
- [ ] Dependencies & permissions
  - [ ] Add `react-native-webrtc`
  - [ ] Expo prebuild (if using managed workflow)
  - [ ] Microphone permissions (Android/iOS)
- [ ] Token fetch
  - [ ] POST to `openai-realtime-token` to retrieve ephemeral `client_secret`
- [ ] WebRTC session
  - [ ] Create `RTCPeerConnection` with STUN server
  - [ ] Capture mic audio, add track to connection
  - [ ] Create SDP offer, POST to `https://api.openai.com/v1/realtime?model=...` with `client_secret`
  - [ ] Set remote SDP answer
  - [ ] Consume events on `oai-events` data channel
- [ ] UI/UX
  - [ ] Live caption area for partial transcripts
  - [ ] Clear indicators: Listening / Processing / Final
  - [ ] Stop button to end turn, auto VAD support toggles
  - [ ] Retry/fallback to batch when streaming fails
  - [ ] Feature flag to enable streaming per user/org
- [ ] Error handling
  - [ ] Network drops, reconnection policy
  - [ ] Token expiration—graceful session renewal or end
  - [ ] Permission denials

Minimal token fetch example:
```ts path=null start=null
const res = await fetch('https://<PROJECT_REF>.functions.supabase.co/openai-realtime-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_JWT}`
  },
  body: JSON.stringify({})
});
const { client_secret, model } = await res.json();
```

---

## QA & Performance
- [ ] Device matrix: low-end Android, iOS
- [ ] Network profiles: 3G/4G/poor WiFi, airplane mode recovery
- [ ] CPU/memory/battery observations during streaming
- [ ] End-to-end latency measurements (first partial, final)
- [ ] Background/interrupt behavior (incoming call, app switch)
- [ ] Language accuracy acceptance checks

---

## Security & Privacy
- [ ] Ephemeral token TTL and scoping (minimize capabilities)
- [ ] Strictly no API key on client
- [ ] Data handling: ensure no raw audio stored unless user consents
- [ ] Update privacy policy/consent screens for live audio

---

## Rollout Plan
- [ ] Launch behind feature flag
- [ ] Internal dogfood; fix issues
- [ ] Canary to small cohort
- [ ] Gradual rollout, monitor metrics
- [ ] Kill-switch ready (server flag)

Success metrics:
- [ ] Median time-to-first-partial < 700ms on good networks
- [ ] User completion rate equal or better vs batch flow
- [ ] Error rate < 1% per session

---

## Monitoring & Alerts
- [ ] Function errors and latency in Supabase logs
- [ ] Client crash reports
- [ ] Cost/usage monitoring on OpenAI account

---

## Reference snippets
WebRTC skeleton (client):
```ts path=null start=null
import { RTCPeerConnection, mediaDevices } from 'react-native-webrtc';

async function startRealtime(clientSecret: string, model: string) {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });

  pc.ondatachannel = (evt) => {
    if (evt.channel?.label === 'oai-events') {
      evt.channel.onmessage = (msg) => {
        try { const e = JSON.parse(msg.data); /* update UI with partials */ } catch {}
      };
    }
  };

  const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);

  const r = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
    body: offer.sdp,
  });
  const answerSdp = await r.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  return () => { pc.close(); stream.getTracks().forEach(t => t.stop()); };
}
```

---

## Open items tracker
- [ ] Backend: auth, rate-limit, logs for `openai-realtime-token`
- [ ] Client: RN WebRTC setup + UI partials
- [ ] Fallback strategy finalized
- [ ] QA pass and performance benchmarks
- [ ] Rollout and monitoring
