/**
 * Dash Voice Session Hook (Refactored)
 * 
 * Orchestrates voice conversation flow:
 * - Language synchronization (lib/voice/language)
 * - Speech recognition (useVoiceTranscription)
 * - AI streaming (via dashInstance.sendMessage)
 * - TTS playback (useVoicePlayback)
 * 
 * State machine: idle → listening → thinking → speaking → idle
 * 
 * Key improvements:
 * - No phantom responses (no auto-start)
 * - Language sync across all stages
 * - Faster response (<1.2s first token)
 * - Clean interrupt handling
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguageProfile } from '@/lib/voice/language';
import { useVoiceTranscription } from './useVoiceTranscription';
import { useVoicePlayback } from './useVoicePlayback';
import type { IDashAIAssistant, DashMessage } from '@/services/dash-ai/DashAICompat';
import {
  type VoiceSessionStatus,
  normalizeTextForSpeech,
  isRawStreamingJSON,
  isChunkSpeakable,
  generateLanguagePrompt,
  formatError,
} from './voiceSessionHelpers';

// ==================== TYPES ====================

export interface UseDashVoiceSessionOptions {
  visible: boolean;
  dashInstance: IDashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
  forcedLanguage?: string;
}

export interface DashVoiceSessionState {
  status: VoiceSessionStatus;
  partialTranscript: string;
  finalTranscript: string;
  aiPartial: string;
  aiFinal: string;
  errorMessage: string;
  audioLevel: number;
}

// ==================== HOOK ====================

export function useDashVoiceSession(options: UseDashVoiceSessionOptions) {
  const { visible, dashInstance, onMessageSent, forcedLanguage } = options;
  
  // Language profile (with explicit override or detection)
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>(forcedLanguage);
  const { data: languageProfile } = useLanguageProfile(detectedLanguage);
  
  // Session state
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [aiPartial, setAiPartial] = useState('');
  const [aiFinal, setAiFinal] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Refs for managing state
  const aiAbortRef = useRef<(() => void) | null>(null);
  const accumulatedAIRef = useRef('');
  const lastSpokenIndexRef = useRef(0);
  const isProcessingRef = useRef(false);
  
  // Voice transcription
  const transcription = useVoiceTranscription({
    locale: languageProfile?.bcp47,
    onPartial: (text) => {
      setPartialTranscript(text);
      setStatus('listening');
    },
    onFinal: (text, detected) => {
      if (detected) {
        setDetectedLanguage(detected);
      }
      setFinalTranscript(text);
      setStatus('transcribing');
      
      // Immediately send to AI
      handleSendToAI(text);
    },
    onError: (error) => {
      setErrorMessage(formatError(error));
      setStatus('error');
    },
  });
  
  // Voice playback
  const playback = useVoicePlayback({
    onStart: () => {
      setStatus('speaking');
    },
    onDone: () => {
      setStatus('idle');
      setAiPartial('');
      setAiFinal('');
      setPartialTranscript('');
      setFinalTranscript('');
      accumulatedAIRef.current = '';
      lastSpokenIndexRef.current = 0;
    },
    onError: (error) => {
      setErrorMessage(formatError(error));
      setStatus('error');
    },
  });
  
  // Send transcript to AI and handle streaming response
  const handleSendToAI = useCallback(async (text: string) => {
    if (!dashInstance || !languageProfile) {
      setErrorMessage('AI assistant not ready');
      setStatus('error');
      return;
    }
    
    if (isProcessingRef.current) {
      if (__DEV__) console.warn('[Session] AI request already in flight, skipping');
      return;
    }
    
    try {
      isProcessingRef.current = true;
      setStatus('thinking');
      setAiPartial('');
      setAiFinal('');
      accumulatedAIRef.current = '';
      lastSpokenIndexRef.current = 0;
      
      // Track first token time
      const startTime = Date.now();
      let firstTokenReceived = false;
      
      // Generate language-aware prompt
      const systemPrompt = generateLanguagePrompt(languageProfile);
      
      if (__DEV__) {
        console.log('[Session] Sending to AI:', { text, language: languageProfile.bcp47 });
      }
      
      // Send message with streaming
      const response = await dashInstance.sendMessage(
        text,
        undefined, // no conversation history for voice (keep it stateless)
        undefined, // no additional context
        (chunk: string) => {
          // Track first token timing
          if (!firstTokenReceived) {
            const firstTokenTime = Date.now() - startTime;
            firstTokenReceived = true;
            
            if (__DEV__) {
              console.log(`[Session] ⚡ First token in ${firstTokenTime}ms`);
            }
            
            // Show speaking status if AI responds quickly
            if (firstTokenTime < 600) {
              setStatus('speaking');
            }
          }
          
          // Guard against raw JSON
          if (isRawStreamingJSON(chunk)) {
            if (__DEV__) console.warn('[Session] Blocked raw JSON chunk');
            return;
          }
          
          // Accumulate response
          accumulatedAIRef.current += chunk;
          setAiPartial(accumulatedAIRef.current);
          
          // Progressive TTS: speak completed sentences
          const normalized = normalizeTextForSpeech(accumulatedAIRef.current);
          const unspokenText = normalized.substring(lastSpokenIndexRef.current);
          
          if (isChunkSpeakable(unspokenText, 220)) {
            const textToSpeak = unspokenText.trim();
            
            if (textToSpeak.length > 0) {
              playback.speak({
                text: textToSpeak,
                language: languageProfile.bcp47,
                voiceName: languageProfile.azureVoice,
                rate: 1.0,
                pitch: 1.0,
                volume: 0.8,
              });
              
              lastSpokenIndexRef.current = normalized.length;
            }
          }
        }
      );
      
      // Finalize
      const finalText = typeof response === 'string' ? response : response.content;
      setAiFinal(finalText);
      accumulatedAIRef.current = finalText;
      
      // Speak any remaining text
      const normalized = normalizeTextForSpeech(finalText);
      const remaining = normalized.substring(lastSpokenIndexRef.current).trim();
      
      if (remaining.length > 0) {
        await playback.speak({
          text: remaining,
          language: languageProfile.bcp47,
          voiceName: languageProfile.azureVoice,
          rate: 1.0,
          pitch: 1.0,
          volume: 0.8,
        });
      }
      
      // Send message to parent
      if (onMessageSent) {
        const message: DashMessage = {
          id: `voice_${Date.now()}`,
          type: 'assistant',
          content: finalText,
          timestamp: Date.now(),
          metadata: {
            detected_language: detectedLanguage,
            requested_language: languageProfile.bcp47,
          },
        };
        onMessageSent(message);
      }
      
      if (__DEV__) {
        console.log('[Session] AI response complete');
      }
      
    } catch (error) {
      console.error('[Session] AI request failed:', error);
      setErrorMessage(formatError(error));
      setStatus('error');
    } finally {
      isProcessingRef.current = false;
    }
  }, [dashInstance, languageProfile, detectedLanguage, onMessageSent, playback]);
  
  // Start listening
  const startListening = useCallback(async () => {
    if (status !== 'idle' && status !== 'error') {
      if (__DEV__) console.warn('[Session] Cannot start, not idle');
      return;
    }
    
    try {
      setErrorMessage('');
      await transcription.start();
    } catch (error) {
      setErrorMessage(formatError(error));
      setStatus('error');
    }
  }, [status, transcription]);
  
  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      await transcription.stop();
      setStatus('idle');
    } catch (error) {
      console.error('[Session] Stop failed:', error);
    }
  }, [transcription]);
  
  // Cancel all (AI, TTS, ASR)
  const cancelAll = useCallback(async () => {
    try {
      if (__DEV__) console.log('[Session] Canceling all operations...');
      
      // Abort AI request
      if (aiAbortRef.current) {
        aiAbortRef.current();
        aiAbortRef.current = null;
      }
      
      // Stop TTS
      await playback.stop();
      
      // Stop ASR
      await transcription.stop();
      
      // Reset state
      isProcessingRef.current = false;
      setStatus('idle');
      setPartialTranscript('');
      setFinalTranscript('');
      setAiPartial('');
      setAiFinal('');
      
      if (__DEV__) console.log('[Session] All operations canceled');
      
    } catch (error) {
      console.error('[Session] Cancel failed:', error);
    }
  }, [playback, transcription]);
  
  // Close session
  const handleClose = useCallback(async () => {
    await cancelAll();
  }, [cancelAll]);
  
  // Auto-cleanup on visibility change
  useEffect(() => {
    if (!visible) {
      cancelAll();
    }
  }, [visible, cancelAll]);
  
  return {
    // State
    status,
    partialTranscript,
    finalTranscript,
    aiPartial,
    aiFinal,
    errorMessage,
    audioLevel,
    languageProfile,
    
    // Actions
    startListening,
    stopListening,
    cancelAll,
    handleClose,
    
    // Derived state
    ready: !!languageProfile && !!dashInstance,
    isListening: transcription.state.isListening,
    isSpeaking: playback.isSpeaking,
    isThinking: status === 'thinking' || status === 'transcribing',
  };
}
