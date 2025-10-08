import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Realtime voice streaming hook (client-side scaffolding)
// - Streams audio chunks to a websocket endpoint if enabled
// - Emits partial transcript, final transcript, and assistant token events coming back from server
// - If not enabled or no backend, it safely no-ops and falls back to existing flow
//
// Usage:
// const realtime = useRealtimeVoice({ enabled, url, tokenProvider, onPartialTranscript, onFinalTranscript, onAssistantToken, onStatusChange })
// realtime.startStream()
// realtime.stopStream()
// realtime.cancel()
//
// Expected backend websocket messages (example):
// { type: 'partial_transcript', text: string }
// { type: 'final_transcript', text: string }
// { type: 'assistant_token', text: string }
// { type: 'done' }
//
// Audio: On web, we use MediaRecorder with 250ms timeslices and send ArrayBuffer chunks.
// Native support requires additional work; this hook will no-op on native platforms unless implemented.

export type RealtimeStatus = 'disconnected' | 'connecting' | 'streaming' | 'finished' | 'error';

interface UseRealtimeVoiceOptions {
  enabled?: boolean;
  url?: string; // wss:// endpoint for streaming
  tokenProvider?: () => Promise<string | null>; // return auth token or null
  timesliceMs?: number; // MediaRecorder timeslice
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onAssistantToken?: (tok: string) => void;
  onStatusChange?: (status: RealtimeStatus) => void;
}

export function useRealtimeVoice(opts: UseRealtimeVoiceOptions = {}) {
  const {
    enabled = false,
    url = (process.env.EXPO_PUBLIC_DASH_STREAM_URL as string) || '',
    tokenProvider,
    timesliceMs = 250,
    onPartialTranscript,
    onFinalTranscript,
    onAssistantToken,
    onStatusChange,
  } = opts;

  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setStatusSafe = useCallback((s: RealtimeStatus) => {
    setStatus(s);
    try { onStatusChange?.(s); } catch {}
  }, [onStatusChange]);

  const startStream = useCallback(async () => {
    if (!enabled) return false;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    try {
      setStatusSafe('connecting');
      let wsUrl = url;
      let token = '';
      try { token = (await tokenProvider?.()) || ''; } catch {}
      if (token) {
        const hasQuery = wsUrl.includes('?');
        wsUrl += `${hasQuery ? '&' : '?'}token=${encodeURIComponent(token)}`;
      }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Start microphone
        try {
          const media = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = media;
          const mr = new MediaRecorder(media, { mimeType: 'audio/webm' });
          mediaRef.current = mr;
          mr.ondataavailable = async (ev: BlobEvent) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            if (ev.data && ev.data.size > 0) {
              const buf = await ev.data.arrayBuffer();
              ws.send(buf);
            }
          };
          mr.start(Math.max(50, timesliceMs));
          setStatusSafe('streaming');
        } catch (e) {
          console.error('[RealtimeVoice] getUserMedia failed:', e);
          setStatusSafe('error');
          try { ws.close(); } catch {}
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'partial_transcript') {
            onPartialTranscript?.(String(msg.text || ''));
          } else if (msg?.type === 'final_transcript') {
            onFinalTranscript?.(String(msg.text || ''));
          } else if (msg?.type === 'assistant_token') {
            onAssistantToken?.(String(msg.text || ''));
          } else if (msg?.type === 'done') {
            setStatusSafe('finished');
          }
        } catch {
          // silently ignore non-JSON frames
        }
      };

      ws.onerror = () => {
        setStatusSafe('error');
      };

      ws.onclose = () => {
        setStatusSafe('disconnected');
      };

      return true;
    } catch (e) {
      console.error('[RealtimeVoice] startStream failed:', e);
      setStatusSafe('error');
      return false;
    }
  }, [enabled, url, tokenProvider, timesliceMs, onPartialTranscript, onFinalTranscript, onAssistantToken, setStatusSafe]);

  const stopStream = useCallback(async () => {
    try {
      if (mediaRef.current && mediaRef.current.state !== 'inactive') {
        mediaRef.current.stop();
      }
    } catch {}
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'done' }));
        wsRef.current.close();
      }
    } catch {}
    setStatusSafe('finished');
  }, [setStatusSafe]);

  const cancel = useCallback(async () => {
    try { mediaRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
    try { wsRef.current?.close(); } catch {}
    setStatusSafe('disconnected');
  }, [setStatusSafe]);

  // Cleanup on unmount
  useEffect(() => () => {
    try { mediaRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks()?.forEach((t) => t.stop()); } catch {}
    try { wsRef.current?.close(); } catch {}
  }, []);

  return {
    enabled,
    status,
    startStream,
    stopStream,
    cancel,
  };
}
