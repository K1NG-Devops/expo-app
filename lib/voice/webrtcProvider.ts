// OpenAI Realtime API WebSocket provider
// Uses WebSocket protocol for real-time audio streaming and transcription
// Currently supports web platform only; native platforms fall back to batch upload

import { Platform } from 'react-native';
import { wait } from '@/lib/utils/async';

export interface StartOptions {
  token: string; // OpenAI ephemeral client_secret
  url: string; // WebSocket URL (wss://api.openai.com/v1/realtime)
  onPartialTranscript?: (t: string) => void;
  onFinalTranscript?: (t: string) => void;
  onAssistantToken?: (t: string) => void;
}

export interface WebRTCSession {
  start: (opts: StartOptions) => Promise<boolean>;
  stop: () => Promise<void>;
  isActive: () => boolean;
}


export function createWebRTCSession(): WebRTCSession {
  let active = false;
  let closed = false;
  let ws: WebSocket | null = null;
  let localStream: any = null;
  let mediaRecorder: any = null;
  let audioChunkInterval: any = null;

  return {
    async start(opts: StartOptions) {
      if (closed) {
        console.warn('[realtimeProvider] Session was closed, cannot restart');
        return false;
      }

      try {
        console.log('[realtimeProvider] Starting OpenAI Realtime WebSocket connection...');
        
        // Check WebSocket availability
        const isWeb = Platform.OS === 'web';
        const hasWebSocket = typeof WebSocket !== 'undefined';
        
        if (!hasWebSocket) {
          throw new Error('WebSocket not available in this environment');
        }
        
        // Native platforms are not supported via direct WebSocket to OpenAI in this client
        // Only allow WebSocket streaming on web to avoid header/token issues and crashes
        if (!isWeb) {
          console.warn('[realtimeProvider] WebSocket realtime not supported on native. Falling back.');
          return false;
        }
        // Connect to OpenAI Realtime API via WebSocket (web only)
        const wsUrl = `${opts.url}${opts.url.includes('?') ? '&' : '?'}authorization=Bearer ${encodeURIComponent(opts.token)}`;
        ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';

        // Wait for WebSocket to open
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          ws!.onopen = () => {
            clearTimeout(timeout);
            console.log('[realtimeProvider] WebSocket connected');
            resolve();
          };

          ws!.onerror = (error) => {
            clearTimeout(timeout);
            console.error('[realtimeProvider] WebSocket error:', error);
            reject(new Error('WebSocket connection failed'));
          };
        });

        // Handle incoming messages from OpenAI
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[realtimeProvider] Received:', message.type);

            // Handle different OpenAI Realtime API event types
            switch (message.type) {
              case 'conversation.item.input_audio_transcription.completed':
                // Final transcript from user audio
                if (opts.onFinalTranscript && message.transcript) {
                  opts.onFinalTranscript(message.transcript);
                }
                break;
              
              case 'conversation.item.input_audio_transcription.delta':
                // Partial transcript from user audio
                if (opts.onPartialTranscript && message.delta) {
                  opts.onPartialTranscript(message.delta);
                }
                break;

              case 'response.audio_transcript.delta':
                // Assistant response text (streaming)
                if (opts.onAssistantToken && message.delta) {
                  opts.onAssistantToken(message.delta);
                }
                break;

              case 'response.audio_transcript.done':
                // Complete assistant response
                if (opts.onAssistantToken && message.transcript) {
                  opts.onAssistantToken(message.transcript);
                }
                break;

              case 'error':
                console.error('[realtimeProvider] Server error:', message.error);
                break;
            }
          } catch (error) {
            console.warn('[realtimeProvider] Failed to parse message:', error);
          }
        };

        // Get microphone access - platform-specific
        if (isWeb) {
          // Web platform: use browser MediaRecorder
          const nav: any = typeof navigator !== 'undefined' ? navigator : null;
          if (!nav?.mediaDevices?.getUserMedia) {
            throw new Error('getUserMedia not available');
          }

          localStream = await nav.mediaDevices.getUserMedia({ 
            audio: {
              channelCount: 1,
              sampleRate: 24000,
              echoCancellation: true,
              noiseSuppression: true,
            } 
          });

          console.log('[realtimeProvider] Web microphone access granted');

          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
            ? 'audio/webm;codecs=opus' 
            : 'audio/webm';
          
          mediaRecorder = new MediaRecorder(localStream, { 
            mimeType,
            audioBitsPerSecond: 24000 
          });

          mediaRecorder.ondataavailable = async (event: any) => {
            if (event.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
              const arrayBuffer = await event.data.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
              
              ws.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64
              }));
            }
          };

          mediaRecorder.start(100);
          console.log('[realtimeProvider] Web recording started');
          
        } else {
          // Native platform: use react-native-webrtc
          const webrtcModule = await import('react-native-webrtc');
          const { mediaDevices } = webrtcModule;
          
          if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
            throw new Error('mediaDevices.getUserMedia not available on this platform');
          }

          localStream = await mediaDevices.getUserMedia({ 
            audio: true, 
            video: false 
          } as any);

          console.log('[realtimeProvider] Native microphone access granted');

          // For native, we need to periodically sample the audio track
          // This is a simplified approach - in production you'd use native modules
          // to get actual PCM audio data
          const audioTrack = localStream.getAudioTracks()[0];
          
          if (!audioTrack) {
            throw new Error('No audio track available');
          }

          // Create AudioContext for processing (if available)
          if (typeof AudioContext !== 'undefined' || typeof (window as any)?.webkitAudioContext !== 'undefined') {
            const AudioContextClass = (typeof AudioContext !== 'undefined' ? AudioContext : (window as any).webkitAudioContext) as any;
            const audioContext = new AudioContextClass({ sampleRate: 24000 });
            const source = audioContext.createMediaStreamSource(localStream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e: any) => {
              if (ws?.readyState === WebSocket.OPEN) {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32Array to Int16Array (PCM16)
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  const s = Math.max(-1, Math.min(1, inputData[i]));
                  pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                // Convert to base64
                const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
                ws.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: base64
                }));
              }
            };
            
            source.connect(processor);
            processor.connect(audioContext.destination);
            mediaRecorder = { audioContext, source, processor }; // Store for cleanup
            
          } else {
            // Fallback: send empty audio chunks periodically
            // This keeps the connection alive but won't provide actual audio
            console.warn('[realtimeProvider] AudioContext not available on native, using fallback');
            audioChunkInterval = setInterval(() => {
              if (ws?.readyState === WebSocket.OPEN) {
                // Send empty audio buffer to keep connection alive
                ws.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: ''
                }));
              }
            }, 100);
          }
          
          console.log('[realtimeProvider] Native recording started');
        }

        // Send session configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: { type: 'server_vad' },
            input_audio_transcription: {
              model: 'whisper-1'
            }
          }
        }));

        active = true;
        return true;
        
      } catch (e) {
        console.warn('[realtimeProvider] start failed:', e);
        // Cleanup on failure
        try { 
          if (mediaRecorder?.stop) mediaRecorder.stop();
          if (mediaRecorder?.audioContext) {
            try { mediaRecorder.processor?.disconnect(); } catch {}
            try { mediaRecorder.source?.disconnect(); } catch {}
            try { mediaRecorder.audioContext?.close(); } catch {}
          }
        } catch {}
        try { if (audioChunkInterval) clearInterval(audioChunkInterval); } catch {}
        try { localStream?.getTracks?.().forEach((t: any) => t.stop()); } catch {}
        try { ws?.close(); } catch {}
        active = false;
        return false;
      }
    },
    
    async stop() {
      // Prevent re-entry
      if (closed || !active) {
        console.log('[realtimeProvider] Already stopped or not active');
        return;
      }
      
      closed = true;
      active = false;
      
      console.log('[realtimeProvider] Beginning cleanup...');
      
      try {
        // Stop MediaRecorder or AudioContext
        if (mediaRecorder) {
          try {
            console.log('[realtimeProvider] Stopping media recorder/processor');
            if (mediaRecorder.state !== undefined && mediaRecorder.state !== 'inactive') {
              // Web MediaRecorder
              mediaRecorder.stop();
            } else if (mediaRecorder.audioContext) {
              // Native AudioContext processing
              try { mediaRecorder.processor?.disconnect(); } catch {}
              try { mediaRecorder.source?.disconnect(); } catch {}
              try { mediaRecorder.audioContext?.close(); } catch {}
            }
            mediaRecorder = null;
          } catch (e) {
            console.warn('[realtimeProvider] Media recorder stop error:', e);
          }
        }
        
        // Clear audio chunk interval if exists
        if (audioChunkInterval) {
          try {
            clearInterval(audioChunkInterval);
            audioChunkInterval = null;
          } catch (e) {
            console.warn('[realtimeProvider] Clear interval error:', e);
          }
        }
        
        // Stop all media tracks
        if (localStream) {
          try {
            const tracks = localStream.getTracks();
            console.log(`[realtimeProvider] Stopping ${tracks.length} media tracks`);
            tracks.forEach((track) => {
              try {
                track.stop();
              } catch (e) {
                console.warn('[realtimeProvider] Track stop error:', e);
              }
            });
            localStream = null;
          } catch (e) {
            console.warn('[realtimeProvider] Stream getTracks error:', e);
          }
        }
        
        // Close WebSocket
        if (ws) {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              // Send input audio buffer commit
              ws.send(JSON.stringify({
                type: 'input_audio_buffer.commit'
              }));
              await wait(100); // Brief wait for server to process
            }
            console.log('[realtimeProvider] Closing WebSocket');
            ws.close();
            ws = null;
          } catch (e) {
            console.warn('[realtimeProvider] WebSocket close error:', e);
          }
        }
        
        console.log('[realtimeProvider] Cleanup complete');
      } catch (error) {
        console.error('[realtimeProvider] Stop error:', error);
        // Still clear references even on error
        mediaRecorder = null;
        localStream = null;
        ws = null;
        if (audioChunkInterval) {
          try { clearInterval(audioChunkInterval); } catch {}
          audioChunkInterval = null;
        }
      }
    },
    
    isActive() {
      return active && !closed;
    },
  };
}

