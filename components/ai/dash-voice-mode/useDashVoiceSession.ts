/**
 * useDashVoiceSession - Voice Session State Management Hook
 * 
 * Manages voice recognition session lifecycle, state, and transcription handling
 * for the DashVoiceMode component.
 * 
 * Responsibilities:
 * - Initialize and manage voice session (Azure Speech SDK on mobile)
 * - Handle partial and final transcripts
 * - Manage connection state and errors
 * - Handle interruption logic (user speaks while Dash is talking)
 * - Integrate with DashAI for message processing
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { getStreamingVoiceProvider, type VoiceSession } from '@/lib/voice/unifiedProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVoicePreferences } from '@/lib/voice/hooks';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { audioManager } from '@/lib/voice/audio';
import type { IDashAIAssistant, DashMessage } from '@/services/dash-ai/DashAICompat';
import { DashResponseCache } from '@/services/DashResponseCache';

export interface UseDashVoiceSessionOptions {
  visible: boolean;
  dashInstance: IDashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
  forcedLanguage?: string;
}

export interface DashVoiceSessionState {
  // Session state
  ready: boolean;
  isConnected: boolean;
  speaking: boolean;
  thinking: boolean;
  errorMessage: string;
  
  // Transcripts
  userTranscript: string;
  aiResponse: string;
  
  // Visuals
  audioLevel: number;
  
  // Actions
  handleClose: () => Promise<void>;
  toggleMute: () => void;
  muted: boolean;
  
  // Session ref for external control
  sessionRef: React.MutableRefObject<VoiceSession | null>;
}

export function useDashVoiceSession({
  visible,
  dashInstance,
  onMessageSent,
  forcedLanguage,
}: UseDashVoiceSessionOptions): DashVoiceSessionState {
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [ready, setReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [muted, setMuted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const abortSpeechRef = useRef(false);
  const sessionRef = useRef<VoiceSession | null>(null);
  const mutedRef = useRef(false);
  // Gate to block incoming ASR during TTS regardless of UI mute
  const inputGateRef = useRef(false);
  const processedRef = useRef(false);
  // Streaming helpers: accumulate partials and finalize on silence
  const partialBufferRef = useRef<string>('');
  const finalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPartialAtRef = useRef<number>(0);
  const initialDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Grace period to prevent self-interruption from AI's own voice
  const speakingStartedAtRef = useRef<number>(0);
  const INTERRUPTION_GRACE_PERIOD_MS = 400; // Ignore partials for first 400ms of TTS
  const MIN_INTERRUPTION_LENGTH = 4; // Require at least 4 characters to interrupt
  
  const { preferences } = useVoicePreferences();
  const { i18n } = useTranslation();
  
  // Keep ref in sync with state for event callbacks
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  
  // Map language codes
  const mapLang = useCallback((l?: string) => {
    const base = String(l || '').toLowerCase();
    if (base.startsWith('af')) return 'af';
    if (base.startsWith('zu')) return 'zu';
    if (base.startsWith('xh')) return 'xh';
    if (base.startsWith('nso') || base.startsWith('st') || base.startsWith('so')) return 'nso';
    if (base.startsWith('en')) return 'en';
    return 'en';
  }, []);
  
  // Helper to map to BCP-47
  const toBCP47 = useCallback((code: string) => {
    switch (code) {
      case 'af': return 'af-ZA';
      case 'zu': return 'zu-ZA';
      case 'xh': return 'xh-ZA';
      case 'nso': return 'nso-ZA';
      case 'en':
      default: return 'en-ZA';
    }
  }, []);
  
  // Active language
  const activeLang = useMemo(() => {
    const uiLang = mapLang(i18n?.language);
    const prefLang = mapLang(preferences?.language);
    return forcedLanguage ? mapLang(forcedLanguage) : (prefLang || uiLang);
  }, [forcedLanguage, preferences?.language, i18n?.language, mapLang]);
  
  // Speak text using DashAI TTS (defined before handleTranscript to satisfy no-use-before-define)
  const speakText = useCallback(async (text: string) => {
    if (!dashInstance) {
      console.error('[useDashVoiceSession] Cannot speak: no dashInstance');
      return;
    }
    
    if (abortSpeechRef.current) {
      if (__DEV__) console.log('[useDashVoiceSession] Speech aborted before starting');
      return;
    }
    
    try {
      const dummyMessage: DashMessage = {
        id: `voice_${Date.now()}`,
        type: 'assistant',
        content: text,
        timestamp: Date.now(),
        metadata: { detected_language: activeLang },
      };
      
      // Mute is already set before calling speakText, so no need to mute again here
      // This avoids race conditions with double-muting
      
      await dashInstance.speakResponse(dummyMessage, {
        onStart: () => {
          // Double-safeguard: hard-mute STT right as TTS starts
          inputGateRef.current = true;
          try { sessionRef.current?.setMuted?.(true); } catch {}
          // If an abort came in just before start, stop immediately
          if (abortSpeechRef.current) {
            dashInstance.stopSpeaking();
          }
        },
        onDone: () => {
          // Unmute after a short grace period to avoid echo tail
          setTimeout(() => {
            inputGateRef.current = false;
            try { sessionRef.current?.setMuted?.(false); } catch {}
            if (!abortSpeechRef.current && __DEV__) {
              console.log('[useDashVoiceSession] TTS completed');
            }
          }, 400);
        },
        onStopped: () => {
          // Also unmute when stopped early (with grace)
          setTimeout(() => {
            inputGateRef.current = false;
            try { sessionRef.current?.setMuted?.(false); } catch {}
          }, 400);
        },
        onError: (error: any) => {
          // Unmute on error as well
          setTimeout(() => {
            inputGateRef.current = false;
            try { sessionRef.current?.setMuted?.(false); } catch {}
          }, 200);
          console.error('[useDashVoiceSession] TTS error:', error);
        }
      });
    } catch (error) {
      console.error('[useDashVoiceSession] TTS failed:', error);
      try { sessionRef.current?.setMuted?.(false); } catch {}
    };
  }, [dashInstance, activeLang]);
  
  // Handle transcript and send to AI
  const handleTranscript = useCallback(async (transcript: string) => {
    if (!dashInstance) {
      console.error('[useDashVoiceSession] No dashInstance available');
      setErrorMessage('AI Assistant not ready. Please close and try again.');
      return;
    }
    
    try {
      processedRef.current = true;
      if (__DEV__) console.log('[useDashVoiceSession] Processing transcript:', transcript);
      
      // Check cache first
      const cachedResponse = DashResponseCache.get(transcript);
      if (cachedResponse) {
        if (__DEV__) console.log('[useDashVoiceSession] Using cached response');
        
        const response: DashMessage = {
          id: `cached_${Date.now()}`,
          type: 'assistant',
          content: cachedResponse,
          timestamp: Date.now(),
          metadata: { detected_language: activeLang },
        };
        
        setAiResponse(cachedResponse);
        onMessageSent?.(response);
        
      // Speak cached response
        abortSpeechRef.current = false;
        setThinking(false);
        // MUTE FIRST to prevent self-interruption
        try { sessionRef.current?.setMuted?.(true); } catch {}
        inputGateRef.current = true; // Block incoming partials at hook level
        setSpeaking(true);
        speakingStartedAtRef.current = Date.now();
        await speakText(cachedResponse);
        inputGateRef.current = false;
        
        if (!abortSpeechRef.current) {
          setSpeaking(false);
          processedRef.current = false;
          setUserTranscript('');
          setAiResponse('');
          speakingStartedAtRef.current = 0;
        }
        return;
      }
      
      // Send to AI with streaming enabled for progressive TTS
      if (__DEV__) console.log('[useDashVoiceSession] Sending to AI with streaming...');
      
      let accumulatedResponse = '';
      let sentenceBuffer = '';
      let hasStartedSpeaking = false;
      const sentenceEndRegex = /[.!?…]+[\s]*$/;
      
      const response = await dashInstance.sendMessage(transcript, undefined, undefined, (chunk: string) => {
        if (abortSpeechRef.current) return;
        
        accumulatedResponse += chunk;
        sentenceBuffer += chunk;
        setAiResponse(accumulatedResponse);
        
        // If we have a complete sentence, speak it immediately
        if (sentenceEndRegex.test(sentenceBuffer.trim())) {
          const sentenceToSpeak = sentenceBuffer.trim();
          sentenceBuffer = '';
          
          if (__DEV__) console.log('[useDashVoiceSession] Streaming sentence:', sentenceToSpeak);
          
          // Start speaking first sentence immediately without waiting for full response
          if (!hasStartedSpeaking && sentenceToSpeak.length > 10) {
            hasStartedSpeaking = true;
            setThinking(false);
            abortSpeechRef.current = false;
            try { sessionRef.current?.setMuted?.(true); } catch {}
            inputGateRef.current = true;
            setSpeaking(true);
            speakingStartedAtRef.current = Date.now();
            
            // Speak in background without blocking stream
            speakText(sentenceToSpeak).catch(err => {
              console.error('[useDashVoiceSession] Streaming TTS error:', err);
            });
          }
        }
      });
      
      // Override language for TTS
      if (response.metadata) {
        response.metadata.detected_language = activeLang;
      } else {
        response.metadata = { detected_language: activeLang };
      }
      
      const responseText = response.content || '';
      setAiResponse(responseText);
      onMessageSent?.(response);
      
      // If streaming started speaking, wait for TTS to complete. Otherwise, speak now.
      const shouldSpeak = !(response.metadata as any)?.doNotSpeak;
      if (responseText && shouldSpeak && !hasStartedSpeaking) {
        // No streaming or streaming didn't start TTS - speak entire response now
        abortSpeechRef.current = false;
        setThinking(false);
        try { sessionRef.current?.setMuted?.(true); } catch {}
        inputGateRef.current = true;
        setSpeaking(true);
        speakingStartedAtRef.current = Date.now();
        await speakText(responseText);
        inputGateRef.current = false;
        
        if (!abortSpeechRef.current) {
          setSpeaking(false);
          processedRef.current = false;
          setUserTranscript('');
          setAiResponse('');
          speakingStartedAtRef.current = 0;
        }
      } else if (hasStartedSpeaking) {
        // Streaming TTS already started - just wait for completion
        if (__DEV__) console.log('[useDashVoiceSession] Streaming TTS in progress, letting it complete');
        // Cleanup will happen when TTS onDone callback fires
      } else if (!shouldSpeak) {
        setSpeaking(false);
        processedRef.current = false;
        setUserTranscript('');
        speakingStartedAtRef.current = 0;
      }
    } catch (error) {
      console.error('[useDashVoiceSession] Error processing message:', error);
      if (!abortSpeechRef.current) {
        setSpeaking(false);
        processedRef.current = false;
      }
    }
  }, [dashInstance, activeLang, onMessageSent, speakText]);
  
  // Silence-based finalization: if no partial arrives for 2s, treat current buffer as final
  const clearFinalizeTimer = useCallback(() => {
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  }, []);

  const finalizeFromSilence = useCallback(async () => {
    if (processedRef.current) return;
    const raw = partialBufferRef.current.trim();
    if (!raw) return;

    // Ignore wake-words and too-short utterances
    const tokenCount = raw.split(/\s+/).filter(Boolean).length;
    const lower = raw.toLowerCase();
    const isWakeWordOnly = tokenCount <= 2 && /^(hey\s+)?(ok(ay)?\s+)?dash\.?$/.test(lower);
    if (tokenCount < 3 || isWakeWordOnly) {
      if (__DEV__) console.log('[useDashVoiceSession] Ignored short/wake-only transcript:', raw);
      partialBufferRef.current = '';
      setUserTranscript('');
      return;
    }

    // Ensure sentence termination so downstream UI/AI treats it as a complete thought
    const text = /[.!?…]$/.test(raw) ? raw : raw + '.';
    processedRef.current = true;
    try {
      setThinking(true);
      // Run DB preflight in parallel (non-blocking)
      try { preflightKnowledgeCheck(text); } catch {}
      await handleTranscript(text);
    } finally {
      partialBufferRef.current = '';
      setUserTranscript('');
      processedRef.current = false;
    }
  }, [handleTranscript]);
  

  // Database preflight: check if we have accessible CAPS content related to the query
  const preflightKnowledgeCheck = useCallback(async (text: string) => {
    try {
      const mod = await import('@/services/DashCAPSKnowledge');
      const ctx = await mod.getCAPSContext(text);
      if (__DEV__) {
        console.log('[useDashVoiceSession] Preflight CAPS context:', {
          relevant: ctx.relevant,
          count: ctx.documents?.length || 0,
          grade: ctx.detected_grade,
          subject: ctx.detected_subject,
        });
      }
      // Future: we could attach this to AI context or surface suggestions
    } catch (e) {
      if (__DEV__) console.warn('[useDashVoiceSession] Preflight CAPS context failed:', e);
    }
  }, []);
  
  // Ensure an active conversation when the Orb opens
  useEffect(() => {
    if (!visible || !dashInstance) return;
    let mounted = true;
    (async () => {
      try {
        const currentId = dashInstance.getCurrentConversationId?.();
        if (!currentId) {
          const created = await dashInstance.startNewConversation('Voice session');
          const newId = typeof created === 'string' ? created : (created as any)?.id;
          if (mounted && newId && dashInstance.setCurrentConversationId) {
            dashInstance.setCurrentConversationId(newId);
          }
        }
      } catch {
        // non-fatal
      }
    })();
    return () => { mounted = false; };
  }, [visible, dashInstance]);

  // Initialize voice session
  useEffect(() => {
    if (!visible) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        if (__DEV__) console.log('[useDashVoiceSession] Initializing voice session...');
        
        const provider = await getStreamingVoiceProvider(activeLang);
        if (cancelled) return;
        
        const session = provider.createSession();
        sessionRef.current = session;
        
        const ok = await session.start({
          language: activeLang,
          onPartial: (text) => {
            if (!cancelled) {
              if (mutedRef.current || inputGateRef.current) return; // Hard mute at hook level (UI or TTS gate)
              const partial = String(text || '').trim();
              if (__DEV__) console.log('[useDashVoiceSession] Partial:', partial);
              setUserTranscript(partial);

              // Clear any error messages once we start receiving audio
              if (errorMessage) setErrorMessage('');

              // Visual level bump for orb
              try { setAudioLevel(Math.min(1, 0.3 + partial.length / 40)); } catch {}

              // Accumulate and start/reset 2s finalize timer
              lastPartialAtRef.current = Date.now();
              partialBufferRef.current = partial;
              clearFinalizeTimer();
              finalizeTimerRef.current = setTimeout(finalizeFromSilence, 2000);
              
              // While Dash is speaking, ignore partials entirely to prevent self-hearing.
              if (speaking) {
                if (__DEV__ && partial.length >= 1) {
                  console.log('[useDashVoiceSession] Ignoring partial while speaking');
                }
                return;
              }
            }
          },
          onFinal: async (text) => {
            if (cancelled) return;
            if (mutedRef.current || inputGateRef.current) return; // Hard mute at hook level
            
            const transcript = String(text || '').trim();
            if (__DEV__) console.log('[useDashVoiceSession] Final:', transcript);

          // Clear any pending finalize timer and buffer (real final arrived)
          clearFinalizeTimer();
          partialBufferRef.current = '';
          
          // Show thinking while we process the final transcript
          setThinking(true);
          // Fire DB preflight in parallel (don't block AI send)
          try { preflightKnowledgeCheck(transcript); } catch {}
          
          // Skip if already processing or aborted
            if (processedRef.current || abortSpeechRef.current) {
              if (__DEV__) console.log('[useDashVoiceSession] Skipping (processing or aborted)');
              return;
            }
            
            // Minimum word threshold + wake-word filter
            const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
            const lower = transcript.trim().toLowerCase();
            const isWakeWordOnly = wordCount <= 2 && /^(hey\s+)?(ok(ay)?\s+)?dash\.?$/.test(lower);
            if (!transcript || wordCount < 3 || isWakeWordOnly) {
              if (__DEV__) console.warn('[useDashVoiceSession] Ignoring short/wake-only final:', transcript);
              return;
            }
            
            setUserTranscript(transcript);
            await handleTranscript(transcript);
            setThinking(false);
          },
        });
        
        if (cancelled) return;
        
          if (ok) {
            setReady(true);
            
            // Start a one-shot timer: if no partial is received within 6s, show an error hint
            if (initialDetectTimerRef.current) clearTimeout(initialDetectTimerRef.current);
            initialDetectTimerRef.current = setTimeout(async () => {
              try {
                if (!cancelled && !speaking && lastPartialAtRef.current === 0) {
                  // Attempt a runtime fallback to React Native Voice if Expo SR produced no partials
                  try {
                    const { reactNativeVoiceProvider } = await import('@/lib/voice/reactNativeVoiceProvider');
                    const available = await reactNativeVoiceProvider.isAvailable().catch(() => false);
                    if (!available) {
                      setErrorMessage('No audio detected. Check mic permissions and speak clearly close to the mic.');
                      return;
                    }
                    const fallback = reactNativeVoiceProvider.createSession();
                    try { await session.stop(); } catch {}
                    sessionRef.current = fallback;
                    const started = await fallback.start({
                      language: activeLang,
                      onPartial: (t: string) => {
                        if (mutedRef.current || inputGateRef.current) return;
                        const p = String(t || '').trim();
                        setUserTranscript(p);
                        // Clear error once fallback provider receives audio
                        if (errorMessage) setErrorMessage('');
                        try { setAudioLevel(Math.min(1, 0.3 + p.length / 40)); } catch {}
                        lastPartialAtRef.current = Date.now();
                        partialBufferRef.current = p;
                        clearFinalizeTimer();
                        finalizeTimerRef.current = setTimeout(finalizeFromSilence, 2000);
                      },
                      onFinal: async (t: string) => {
                        if (mutedRef.current || inputGateRef.current) return;
                        clearFinalizeTimer();
                        partialBufferRef.current = '';
                        setThinking(true);
                        try { preflightKnowledgeCheck(String(t || '').trim()); } catch {}
                        if (processedRef.current || abortSpeechRef.current) return;
                        const transcript = String(t || '').trim();
                        if (!transcript) return;
                        setUserTranscript(transcript);
                        await handleTranscript(transcript);
                        setThinking(false);
                      },
                    });
                    if (!started) {
                      setErrorMessage('No audio detected. Check mic permissions and speak clearly close to the mic.');
                    }
                  } catch {
                    setErrorMessage('No audio detected. Check mic permissions and speak clearly close to the mic.');
                  }
                }
              } catch {}
            }, 3000);
            
            // Poll for connection (faster timeout for Azure: 2s instead of 5s)
            const checkConnection = setInterval(() => {
            if (cancelled) {
              clearInterval(checkConnection);
              return;
            }
            
            const connected = session.isConnected();
            if (connected) {
              setIsConnected(true);
              clearInterval(checkConnection);
              if (__DEV__) console.log('[useDashVoiceSession] Connected');
            }
          }, 100);
          
          // Reduced timeout from 5s to 2s (Azure is faster)
          setTimeout(() => {
            clearInterval(checkConnection);
            if (!session.isConnected()) {
              console.warn('[useDashVoiceSession] Connection timeout');
              setIsConnected(true); // Show UI anyway
            }
          }, 2000);
        } else {
          setErrorMessage('Failed to start voice recognition');
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[useDashVoiceSession] Initialization error:', e);
          setErrorMessage('Voice initialization failed');
        }
      }
    })();
    
    return () => {
      cancelled = true;
      if (__DEV__) console.log('[useDashVoiceSession] Cleanup: stopping session');
      sessionRef.current?.stop().catch(() => {});
      processedRef.current = false;
      abortSpeechRef.current = false;
      clearFinalizeTimer();
      partialBufferRef.current = '';
    };
  }, [visible, activeLang, speaking, dashInstance, handleTranscript, clearFinalizeTimer, finalizeFromSilence]);
  
  // Simple decay for orb audio level
  useEffect(() => {
    const id = setInterval(() => {
      setAudioLevel((prev) => Math.max(0, prev - 0.05));
    }, 120);
    return () => clearInterval(id);
  }, []);

  // Keep Dash internal language in sync for reply consistency
  useEffect(() => {
    (async () => {
      if (!dashInstance) return;
      try { await dashInstance.setLanguage?.(toBCP47(activeLang)); } catch {}
    })();
  }, [dashInstance, activeLang, toBCP47]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    try { sessionRef.current?.setMuted?.(newMuted); } catch {}
    
    // When muting, clear any pending buffers/timers to avoid late finalization
    if (newMuted) {
      clearFinalizeTimer();
      partialBufferRef.current = '';
      setUserTranscript('');
      processedRef.current = false;
    }
  }, [muted, clearFinalizeTimer]);
  
  // Close handler
  const handleClose = useCallback(async () => {
      if (sessionRef.current) {
        try {
          await sessionRef.current.stop();
        } catch (e) {
          console.warn('[useDashVoiceSession] Error stopping session:', e);
        }
      }
      
      processedRef.current = false;
      abortSpeechRef.current = false;
      clearFinalizeTimer();
      if (initialDetectTimerRef.current) clearTimeout(initialDetectTimerRef.current);
      partialBufferRef.current = '';
      try { await audioManager.stop(); } catch (e) {
        console.warn('[useDashVoiceSession] Error stopping TTS:', e);
      }
      
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, [dashInstance]);
  
  return {
    ready,
    isConnected,
    speaking,
    errorMessage,
    userTranscript,
    aiResponse,
    
    // visuals
    audioLevel,
    
    handleClose,
    toggleMute,
    muted,
    sessionRef,
    thinking,
  };
}
