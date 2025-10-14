import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { withTimeout, wait } from '@/lib/utils/async';

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

export type RealtimeStatus = 'disconnected' | 'connecting' | 'streaming' | 'stopping' | 'finished' | 'error';

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
  const webrtcRef = useRef<{ stop: () => Promise<void>; isActive: () => boolean } | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const isStoppingRef = useRef(false);

  const setStatusSafe = useCallback((s: RealtimeStatus) => {
    setStatus(s);
    try { onStatusChange?.(s); } catch {}
  }, [onStatusChange]);

  const startStream = useCallback(async () => {
    if (!enabled) return false;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    try {
      setStatusSafe('connecting');

      // Resolve URL + token
      let wsUrl = url;
      let token = '';

      // Prefer caller tokenProvider; fallback to Edge Function token
      try { token = (await tokenProvider?.()) || ''; } catch {}
      if (!wsUrl || !token) {
        try {
          const { getRealtimeToken } = await import('@/lib/voice/realtimeToken');
          const rt = await getRealtimeToken();
          if (rt?.url) wsUrl = wsUrl || rt.url;
          if (rt?.token) token = token || rt.token;
        } catch (e) {
          console.warn('[RealtimeVoice] Failed to fetch realtime token/url:', e);
        }
      }

      if (!wsUrl) {
        console.warn('[RealtimeVoice] No websocket URL configured');
        setStatusSafe('error');
        return false;
      }

      // Prefer native WebRTC on iOS/Android if available
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          const { createWebRTCSession } = await import('@/lib/voice/webrtcProvider');
          const sess = createWebRTCSession();
          const started = await sess.start({
            token: token || '',
            url: wsUrl,
            onPartialTranscript,
            onFinalTranscript,
            onAssistantToken,
          });
          if (started) {
            webrtcRef.current = sess;
            setStatusSafe('streaming');
            return true;
          }
        } catch (e) {
          console.warn('[RealtimeVoice] WebRTC start failed on native, will not fallback to browser MediaRecorder:', e);
          // On native, avoid falling back to browser MediaRecorder path which is not available
          setStatusSafe('error');
          return false;
        }
        // If WebRTC didn't throw but didn't start, treat as error on native to avoid MediaRecorder fallback
        setStatusSafe('error');
        return false;
      }

      if (token) {
        const hasQuery = wsUrl.includes('?');
        wsUrl += `${hasQuery ? '&' : '?'}token=${encodeURIComponent(token)}`;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        // Start microphone (web only)
        try {
          const nav: any = typeof navigator !== 'undefined' ? navigator : null;
          if (!nav?.mediaDevices?.getUserMedia) {
            throw new Error('mediaDevices.getUserMedia is not available in this environment');
          }
          const media = await nav.mediaDevices.getUserMedia({ audio: true });
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
    // Idempotent: if already stopping, return the in-flight promise
    if (isStoppingRef.current && stopPromiseRef.current) {
      console.log('[RealtimeVoice] Stop already in progress, returning existing promise');
      return stopPromiseRef.current;
    }

    // Mark as stopping to prevent concurrent calls
    isStoppingRef.current = true;
    console.log('[RealtimeVoice] Beginning idempotent stop sequence');
    
    const stopPromise = (async () => {
      try {
        // Step 1: Transition to stopping state
        setStatusSafe('stopping');
        
        // Step 2: Stop WebRTC provider with timeout (3 seconds)
        if (webrtcRef.current && webrtcRef.current.isActive()) {
          console.log('[RealtimeVoice] Stopping WebRTC provider...');
          await withTimeout(
            webrtcRef.current.stop(),
            3000,
            {
              fallback: undefined,
              onTimeout: () => console.warn('[RealtimeVoice] WebRTC stop timed out, continuing...')
            }
          );
          webrtcRef.current = null;
        }
        
        // Step 3: Stop MediaRecorder if active
        if (mediaRef.current && mediaRef.current.state !== 'inactive') {
          try {
            console.log('[RealtimeVoice] Stopping MediaRecorder...');
            mediaRef.current.stop();
            mediaRef.current = null;
          } catch (e) {
            console.warn('[RealtimeVoice] MediaRecorder stop error:', e);
          }
        }
        
        // Step 4: Stop all media tracks
        if (streamRef.current) {
          try {
            console.log('[RealtimeVoice] Stopping media tracks...');
            streamRef.current.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (e) {
                console.warn('[RealtimeVoice] Track stop error:', e);
              }
            });
            streamRef.current = null;
          } catch (e) {
            console.warn('[RealtimeVoice] Stream getTracks error:', e);
          }
        }
        
        // Step 5: Send done signal and close WebSocket with timeout
        if (wsRef.current) {
          try {
            if (wsRef.current.readyState === WebSocket.OPEN) {
              console.log('[RealtimeVoice] Sending done signal to WebSocket...');
              wsRef.current.send(JSON.stringify({ type: 'done' }));
              // Brief wait for server to process
              await wait(100);
            }
            console.log('[RealtimeVoice] Closing WebSocket...');
            wsRef.current.close();
            wsRef.current = null;
          } catch (e) {
            console.warn('[RealtimeVoice] WebSocket close error:', e);
          }
        }
        
        // Step 6: Brief wait for UI smoothness before finalizing
        await wait(200);
        
        console.log('[RealtimeVoice] Stop sequence complete');
      } catch (error) {
        console.error('[RealtimeVoice] Stop error:', error);
      } finally {
        // Always transition to finished, even on error
        isStoppingRef.current = false;
        stopPromiseRef.current = null;
        setStatusSafe('finished');
      }
    })();

    // Store the promise for idempotency
    stopPromiseRef.current = stopPromise;
    return stopPromise;
  }, [setStatusSafe]);

  const cancel = useCallback(async () => {
    try { await webrtcRef.current?.stop(); webrtcRef.current = null; } catch {}
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
