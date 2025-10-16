# Dash Voice System (Concise Guide)

This document merges the technical Azure TTS integration guide and the user-facing Voice System guide into one concise reference.

## 1) What works where

- Transcription (STT)
  - English/Afrikaans: OpenAI Realtime (WebRTC) or Azure (auto‑selected when language is SA)
  - Zulu/Xhosa/Sepedi: Azure Speech (auto‑selected)
- Text‑to‑Speech (TTS)
  - SA languages (af/zu/xh/nso): Azure TTS via `tts-proxy`
  - Other: Device TTS (expo-speech)

Routing is automatic based on the current app language.

## 2) Client behavior

- Tap mic → start streaming transcription immediately.
- Slide up while recording → lock; tap again → stop & send.
- For SA languages, the client uses Azure streaming; for others, OpenAI Realtime.
- If streaming fails or no transcript arrives, you’ll see “Voice input unavailable”. This usually indicates a provider/language mismatch, not a mic permission issue.

## 3) Configuration (Azure)

Set Supabase function secrets:

- AZURE_SPEECH_KEY
- AZURE_SPEECH_REGION (e.g. southafricanorth)

Deploy functions:

- supabase functions deploy azure-speech-token
- supabase functions deploy tts-proxy

## 4) Key files

- hooks/useRealtimeVoice.ts – streaming hook (auto picks Azure for SA languages)
- lib/voice/azureProvider.ts – Azure Speech streaming session
- lib/voice/realtimeToken.ts – fetch OpenAI or Azure tokens (Edge Functions)
- supabase/functions/azure-speech-token – mints Azure Speech auth token
- services/DashAIAssistant.ts – Azure TTS for SA languages, device TTS fallback

## 5) Language mapping

- af → af-ZA
- zu → zu-ZA
- xh → xh-ZA
- nso/st → nso-ZA
- en → en-ZA (mobile) / en-US (iOS default)

## 6) Troubleshooting

- Voice input unavailable: usually provider mismatch; ensure SA languages are not coerced to English. Verify logs show Azure session started.
- No transcript after stop: the controller waits up to 2s for final events; if still empty, check provider logs.
- Mic prompts repeating: we use PermissionsAndroid.check() before requesting.

## 7) Verification checklist

- Language set to af/zu/xh/nso → Azure streaming starts
- Edge function azure-speech-token returns token+region
- TTS for SA languages plays via Azure (logs show Azure TTS)
- Second play of same text is instant (cache hit via tts-proxy)

## 8) Commands

- supabase secrets set AZURE_SPEECH_KEY=…
- supabase secrets set AZURE_SPEECH_REGION=southafricanorth
- supabase functions deploy azure-speech-token
- supabase functions deploy tts-proxy

That’s it—one button, smart routing, native SA voices.