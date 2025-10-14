// Enhanced WebRTC provider with robust cleanup semantics
// Prevents hangs during transcription stop by ensuring deterministic cleanup

import { withTimeout, wait } from '@/lib/utils/async';

export interface StartOptions {
  token: string;
  url: string; // provider endpoint for SDP/WS signaling
  onPartialTranscript?: (t: string) => void;
  onFinalTranscript?: (t: string) => void;
  onAssistantToken?: (t: string) => void;
}

export interface WebRTCSession {
  start: (opts: StartOptions) => Promise<boolean>;
  stop: () => Promise<void>;
  isActive: () => boolean;
}

/**
 * Wait for ICE connection state to reach target
 * @param pc RTCPeerConnection
 * @param targetStates Target states
 * @param timeoutMs Maximum wait time
 */
async function waitForIceState(
  pc: any,
  targetStates: string[],
  timeoutMs: number = 1500
): Promise<void> {
  return withTimeout(
    new Promise<void>((resolve) => {
      if (!pc || targetStates.includes(pc.iceConnectionState)) {
        resolve();
        return;
      }
      
      const handler = () => {
        if (targetStates.includes(pc.iceConnectionState)) {
          pc.removeEventListener?.('iceconnectionstatechange', handler);
          resolve();
        }
      };
      
      pc.addEventListener?.('iceconnectionstatechange', handler);
    }),
    timeoutMs,
    { fallback: undefined } // Resolve on timeout, don't hang
  );
}

export function createWebRTCSession(): WebRTCSession {
  let active = false;
  let closed = false;
  let pc: any = null;
  let dc: any = null;
  let localStream: any = null;
  let eventHandlers: Array<{ target: any; event: string; handler: any }> = [];

  /**
   * Track event listeners for symmetric cleanup
   */
  const addEventListener = (target: any, event: string, handler: any) => {
    if (target && typeof target.addEventListener === 'function') {
      target.addEventListener(event, handler);
      eventHandlers.push({ target, event, handler });
    }
  };

  const removeAllEventListeners = () => {
    eventHandlers.forEach(({ target, event, handler }) => {
      try {
        target?.removeEventListener?.(event, handler);
      } catch {}
    });
    eventHandlers = [];
  };

  return {
    async start(opts: StartOptions) {
      if (closed) {
        console.warn('[webrtcProvider] Session was closed, cannot restart');
        return false;
      }

      try {
        // Dynamic import to avoid web bundlers failing
        const webrtcModule = await import('react-native-webrtc');
        const { RTCPeerConnection, mediaDevices } = webrtcModule;
        
        // Validate mediaDevices is available
        if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
          throw new Error('mediaDevices.getUserMedia not available on this platform');
        }

        // Prepare PeerConnection (no ICE servers needed for OpenAI Realtime)
        pc = new RTCPeerConnection({
          iceServers: [],
        } as any);

        // Data channel to receive events (partial/final transcripts, assistant tokens)
        dc = pc.createDataChannel('oai-events');
        
        const dcMessageHandler = (ev: any) => {
          try {
            const msg = JSON.parse(String(ev.data || ''));
            if (msg?.type === 'partial_transcript' && opts.onPartialTranscript) opts.onPartialTranscript(msg.text || '');
            if (msg?.type === 'final_transcript' && opts.onFinalTranscript) opts.onFinalTranscript(msg.text || '');
            if (msg?.type === 'assistant_token' && opts.onAssistantToken) opts.onAssistantToken(msg.text || '');
          } catch {
            // Ignore non-JSON frames
          }
        };
        
        addEventListener(dc, 'message', dcMessageHandler);

        // Get microphone audio and add to PC
        localStream = await mediaDevices.getUserMedia({ audio: true, video: false } as any);
        localStream.getTracks().forEach((t: any) => pc.addTrack(t, localStream));

        // Create offer (audio only)
        const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false } as any);
        await pc.setLocalDescription(offer);

        // Exchange SDP with provider; for OpenAI Realtime, POST to https endpoint
        // Derive POST url from ws url by replacing wss:// with https://
        const postUrl = opts.url.startsWith('wss://') ? opts.url.replace('wss://', 'https://') : opts.url;
        const resp = await fetch(postUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${opts.token}`,
            'Content-Type': 'application/sdp',
            // Required by OpenAI Realtime API
            'OpenAI-Beta': 'realtime=v1',
          },
          body: offer.sdp,
        });
        
        if (!resp.ok) {
          throw new Error(`SDP exchange failed: ${resp.status} ${resp.statusText}`);
        }
        
        const answerSdp = await resp.text();
        
        // Validate answer SDP is not empty
        if (!answerSdp || answerSdp.trim().length === 0) {
          throw new Error('Received empty SDP answer from server');
        }
        
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp } as any);

        active = true;
        return true;
      } catch (e) {
        console.warn('[webrtcProvider] start failed:', e);
        // Cleanup on failure
        try { localStream?.getTracks?.().forEach((t: any) => t.stop()); } catch {}
        try { dc?.close?.(); } catch {}
        try { pc?.close?.(); } catch {}
        removeAllEventListeners();
        active = false;
        return false;
      }
    },
    
    async stop() {
      // Prevent re-entry
      if (closed || !active) {
        console.log('[webrtcProvider] Already stopped or not active');
        return;
      }
      
      closed = true;
      active = false;
      
      console.log('[webrtcProvider] Beginning robust cleanup...');
      
      try {
        // Step 1: Stop all local media tracks
        if (localStream) {
          try {
            const tracks = localStream.getTracks?.() || [];
            console.log(`[webrtcProvider] Stopping ${tracks.length} media tracks`);
            tracks.forEach((track: any) => {
              try {
                track.stop?.();
              } catch (e) {
                console.warn('[webrtcProvider] Track stop error:', e);
              }
            });
          } catch (e) {
            console.warn('[webrtcProvider] Stream getTracks error:', e);
          }
        }
        
        // Step 2: Close data channel
        if (dc) {
          try {
            console.log('[webrtcProvider] Closing data channel');
            dc.close?.();
          } catch (e) {
            console.warn('[webrtcProvider] Data channel close error:', e);
          }
        }
        
        // Step 3: Stop transceivers if available
        if (pc && typeof pc.getTransceivers === 'function') {
          try {
            const transceivers = pc.getTransceivers();
            console.log(`[webrtcProvider] Stopping ${transceivers.length} transceivers`);
            transceivers.forEach((transceiver: any) => {
              try {
                transceiver.stop?.();
              } catch (e) {
                console.warn('[webrtcProvider] Transceiver stop error:', e);
              }
            });
          } catch (e) {
            console.warn('[webrtcProvider] Get transceivers error:', e);
          }
        }
        
        // Step 4: Close peer connection
        if (pc) {
          try {
            console.log('[webrtcProvider] Closing peer connection');
            pc.close?.();
            
            // Wait for ICE connection to fully close (with timeout)
            await waitForIceState(pc, ['closed', 'disconnected', 'failed'], 1500);
            console.log('[webrtcProvider] ICE connection closed');
          } catch (e) {
            console.warn('[webrtcProvider] Peer connection close error:', e);
          }
        }
        
        // Step 5: Remove all event listeners
        removeAllEventListeners();
        
        // Step 6: Clear all references
        pc = null;
        dc = null;
        localStream = null;
        
        console.log('[webrtcProvider] Cleanup complete');
      } catch (error) {
        console.error('[webrtcProvider] Stop error:', error);
        // Still clear references even on error
        pc = null;
        dc = null;
        localStream = null;
        removeAllEventListeners();
      }
    },
    
    isActive() {
      return active && !closed;
    },
  };
}
