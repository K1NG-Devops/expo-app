/**
 * Voice Transcription Hook
 * 
 * Manages speech recognition with expo-speech-recognition (primary)
 * and OpenAI Whisper fallback via stt-proxy Edge Function.
 * 
 * Features:
 * - Real-time partial transcripts (interim results)
 * - Silence detection (475ms timeout)
 * - Automatic fallback to Whisper if device ASR fails
 * - Language detection support
 * 
 * Usage:
 * ```ts
 * const { start, stop, state } = useVoiceTranscription({
 *   onPartial: (text) => console.log('Partial:', text),
 *   onFinal: (text, lang) => console.log('Final:', text, lang),
 * });
 * ```
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { SouthAfricanLanguage } from '@/lib/voice/language';

// ==================== TYPES ====================

export interface VoiceTranscriptionCallbacks {
  onPartial?: (text: string) => void;
  onFinal?: (text: string, detectedLanguage?: string) => void;
  onError?: (error: Error) => void;
}

export interface VoiceTranscriptionState {
  isListening: boolean;
  partial: string;
  final: string;
  detectedLanguage?: string;
  error: string | null;
  fallbackUsed: boolean;
}

export interface UseVoiceTranscriptionOptions {
  locale?: SouthAfricanLanguage;
  onPartial?: (text: string) => void;
  onFinal?: (text: string, detectedLanguage?: string) => void;
  onError?: (error: Error) => void;
}

// ==================== HOOK ====================

export function useVoiceTranscription(options: UseVoiceTranscriptionOptions) {
  const [state, setState] = useState<VoiceTranscriptionState>({
    isListening: false,
    partial: '',
    final: '',
    detectedLanguage: undefined,
    error: null,
    fallbackUsed: false,
  });
  
  // Refs for cleanup and state management
  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPartialRef = useRef<string>('');
  const isStoppingRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);
  
  // Expo Speech Recognition event handler (must be at component level)
  const { state: recognitionState, error: recognitionError } = useSpeechRecognitionEvent((event) => {
    if (!isRecognitionActiveRef.current || isStoppingRef.current) return;
    
    if (event.results && event.results.length > 0) {
      const result = event.results[0];
      if (result) {
        const transcript = result.transcript;
        
        if (result.isFinal) {
          handleFinal(transcript);
        } else {
          handlePartial(transcript);
        }
      }
    }
  });
  
  // Handle recognition errors
  useEffect(() => {
    if (recognitionError && isRecognitionActiveRef.current) {
      console.error('[Transcription] Recognition error:', recognitionError);
      // Attempt Whisper fallback
      fallbackToWhisper().catch(err => {
        console.error('[Transcription] Fallback also failed:', err);
      });
    }
  }, [recognitionError]);
  
  // Permissions check
  const checkPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') return true;
      
      // Check microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setState(prev => ({ ...prev, error: 'Microphone permission denied' }));
        options.onError?.(new Error('Microphone permission denied'));
        return false;
      }
      
      // Check speech recognition availability
      const available = await ExpoSpeechRecognitionModule.getStateAsync();
      if (!available) {
        if (__DEV__) {
          console.warn('[Transcription] Speech recognition not available, will use Whisper fallback');
        }
      }
      
      return true;
    } catch (error) {
      console.error('[Transcription] Permission check failed:', error);
      return false;
    }
  }, [options]);
  
  // Silence detection timer
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // 475ms silence timeout (optimized for responsive UX)
    silenceTimerRef.current = setTimeout(() => {
      if (__DEV__) {
        console.log('[Transcription] Silence detected, finalizing...');
      }
      
      // Finalize with last partial result
      if (lastPartialRef.current && !isStoppingRef.current) {
        setState(prev => ({ ...prev, final: lastPartialRef.current, isListening: false }));
        options.onFinal?.(lastPartialRef.current, state.detectedLanguage);
        
        // Auto-stop recognition
        stop();
      }
    }, 475);
  }, [options, state.detectedLanguage]);
  
  // Handle partial results (interim transcripts)
  const handlePartial = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    
    // Ignore UI feedback strings
    if (text === 'Listening...' || text === 'Processing...') return;
    
    lastPartialRef.current = text;
    setState(prev => ({ ...prev, partial: text }));
    options.onPartial?.(text);
    
    // Reset silence timer on new speech
    resetSilenceTimer();
    
    if (__DEV__) {
      console.log('[Transcription] Partial:', text);
    }
  }, [options, resetSilenceTimer]);
  
  // Handle final result
  const handleFinal = useCallback((text: string, detectedLang?: string) => {
    if (!text || !text.trim()) {
      if (__DEV__) console.warn('[Transcription] Empty final result, ignoring');
      return;
    }
    
    setState(prev => ({
      ...prev,
      final: text,
      detectedLanguage: detectedLang || prev.detectedLanguage,
      isListening: false,
    }));
    
    options.onFinal?.(text, detectedLang);
    
    if (__DEV__) {
      console.log('[Transcription] Final:', text, detectedLang ? `(${detectedLang})` : '');
    }
  }, [options]);
  
  // Fallback to Whisper via stt-proxy
  const fallbackToWhisper = useCallback(async (): Promise<void> => {
    try {
      if (!recordingRef.current) {
        throw new Error('No recording available for fallback');
      }
      
      if (__DEV__) {
        console.log('[Transcription] Falling back to Whisper...');
      }
      
      setState(prev => ({ ...prev, fallbackUsed: true }));
      
      // Stop and get URI
      const uri = recordingRef.current.getURI();
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
      
      if (!uri) {
        throw new Error('No audio URI from recording');
      }
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Call stt-proxy Edge Function
      const { data, error } = await supabase.functions.invoke('stt-proxy', {
        body: {
          audio: base64,
          language: options.locale || 'en-ZA',
          format: 'm4a',
        },
      });
      
      if (error) throw error;
      
      if (data?.transcript) {
        handleFinal(data.transcript, data.detected_language);
      } else {
        throw new Error('No transcript from Whisper');
      }
      
      // Cleanup audio file
      await FileSystem.deleteAsync(uri, { idempotent: true });
      
    } catch (error) {
      console.error('[Transcription] Whisper fallback failed:', error);
      setState(prev => ({ ...prev, error: 'Transcription failed', isListening: false }));
      options.onError?.(error as Error);
    }
  }, [options, handleFinal]);
  
  // Start transcription
  const start = useCallback(async (): Promise<void> => {
    try {
      // Reset state
      isStoppingRef.current = false;
      lastPartialRef.current = '';
      setState({
        isListening: true,
        partial: '',
        final: '',
        detectedLanguage: undefined,
        error: null,
        fallbackUsed: false,
      });
      
      // Check permissions
      const hasPermissions = await checkPermissions();
      if (!hasPermissions) {
        setState(prev => ({ ...prev, isListening: false }));
        return;
      }
      
      // Start fallback recording (for Whisper backup)
      if (Platform.OS !== 'web') {
        try {
          recordingRef.current = new Audio.Recording();
          await recordingRef.current.prepareToRecordAsync({
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 96000,
            },
            ios: {
              extension: '.m4a',
              audioQuality: Audio.IOSAudioQuality.HIGH,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 96000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
          } as Audio.RecordingOptions);
          
          await recordingRef.current.startAsync();
          
          if (__DEV__) {
            console.log('[Transcription] Fallback recording started');
          }
        } catch (error) {
          console.warn('[Transcription] Fallback recording failed (non-critical):', error);
        }
      }
      
      // Start speech recognition
      try {
        isRecognitionActiveRef.current = true;
        
        await ExpoSpeechRecognitionModule.start({
          lang: options.locale || 'en-ZA',
          interimResults: true,
          maxAlternatives: 1,
          continuous: false,
          requiresOnDeviceRecognition: false,
        });
        
        if (__DEV__) {
          console.log('[Transcription] Speech recognition started:', options.locale);
        }
        
      } catch (error) {
        console.error('[Transcription] Speech recognition failed, using Whisper:', error);
        isRecognitionActiveRef.current = false;
        // Immediately fallback to Whisper
        await fallbackToWhisper();
      }
      
    } catch (error) {
      console.error('[Transcription] Start failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to start voice recognition',
        isListening: false,
      }));
      options.onError?.(error as Error);
    }
  }, [options, checkPermissions, handlePartial, handleFinal, fallbackToWhisper]);
  
  // Stop transcription
  const stop = useCallback(async (): Promise<void> => {
    if (isStoppingRef.current) return;
    
    isStoppingRef.current = true;
    
    try {
      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Mark recognition as inactive
      isRecognitionActiveRef.current = false;
      
      // Stop speech recognition
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (error) {
        // Ignore stop errors (already stopped)
        if (__DEV__) console.warn('[Transcription] Stop recognition warning:', error);
      }
      
      // Stop fallback recording
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          
          // Cleanup audio file
          const uri = recordingRef.current.getURI();
          if (uri) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        } catch (error) {
          if (__DEV__) console.warn('[Transcription] Stop recording warning:', error);
        }
        
        recordingRef.current = null;
      }
      
      setState(prev => ({ ...prev, isListening: false }));
      
      if (__DEV__) {
        console.log('[Transcription] Stopped');
      }
      
    } catch (error) {
      console.error('[Transcription] Stop failed:', error);
    } finally {
      isStoppingRef.current = false;
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);
  
  return {
    start,
    stop,
    state,
  };
}
