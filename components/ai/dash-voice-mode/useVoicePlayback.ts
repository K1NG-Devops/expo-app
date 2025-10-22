/**
 * Voice Playback Hook
 * 
 * Manages TTS playback with Azure TTS (via tts-proxy) as primary
 * and expo-speech as device fallback.
 * 
 * Features:
 * - Azure Neural Voices for high-quality SA language TTS
 * - Automatic fallback to device TTS
 * - Playback queue (FIFO)
 * - Audio focus management
 * - Interrupt support
 * 
 * Usage:
 * ```ts
 * const { speak, stop, isSpeaking } = useVoicePlayback({
 *   onStart: () => console.log('Started'),
 *   onDone: () => console.log('Done'),
 * });
 * ```
 */

import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { SouthAfricanLanguage } from '@/lib/voice/language';

// ==================== TYPES ====================

export interface VoicePlaybackCallbacks {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface SpeakOptions {
  text: string;
  language: SouthAfricanLanguage;
  voiceName: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface UseVoicePlaybackOptions {
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

// ==================== HOOK ====================

export function useVoicePlayback(options: UseVoicePlaybackOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  
  // Refs for state management
  const soundRef = useRef<Audio.Sound | null>(null);
  const queueRef = useRef<SpeakOptions[]>([]);
  const isProcessingRef = useRef(false);
  
  // Configure audio mode for playback
  const configureAudio = useCallback(async () => {
    try {
      if (Platform.OS === 'web') return;
      
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.warn('[Playback] Audio mode config failed:', error);
    }
  }, []);
  
  // Speak using Azure TTS via tts-proxy
  const speakAzure = useCallback(async (opts: SpeakOptions): Promise<void> => {
    try {
      if (__DEV__) {
        console.log('[Playback] Using Azure TTS:', { voiceName: opts.voiceName, length: opts.text.length });
      }
      
      // Call tts-proxy Edge Function
      const { data, error } = await supabase.functions.invoke('tts-proxy', {
        body: {
          text: opts.text,
          voiceName: opts.voiceName,
          language: opts.language,
          format: 'audio-24khz-48kbitrate-mono-mp3',
          rate: opts.rate || 1.0,
          pitch: opts.pitch || 1.0,
        },
      });
      
      if (error || !data?.audio_url) {
        throw new Error(error?.message || 'No audio URL from tts-proxy');
      }
      
      // Configure audio mode
      await configureAudio();
      
      // Load and play audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: data.audio_url },
        { shouldPlay: true, volume: opts.volume || 0.8 },
        (status) => {
          if (status.isLoaded && !status.isPlaying && status.positionMillis === status.durationMillis) {
            // Playback complete
            if (__DEV__) {
              console.log('[Playback] Azure TTS complete');
            }
            
            setIsSpeaking(false);
            options.onDone?.();
            
            // Process next in queue
            processQueue();
          }
          
          if (status.isLoaded && status.error) {
            console.error('[Playback] Playback error:', status.error);
            options.onError?.(new Error(status.error));
          }
        }
      );
      
      soundRef.current = sound;
      setIsSpeaking(true);
      options.onStart?.();
      
    } catch (error) {
      console.error('[Playback] Azure TTS failed:', error);
      throw error;
    }
  }, [options, configureAudio]);
  
  // Fallback to device TTS (expo-speech)
  const speakDevice = useCallback(async (opts: SpeakOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        if (__DEV__) {
          console.log('[Playback] Using device TTS fallback');
        }
        
        setFallbackUsed(true);
        setIsSpeaking(true);
        options.onStart?.();
        
        Speech.speak(opts.text, {
          language: opts.language,
          pitch: opts.pitch || 1.0,
          rate: opts.rate || 1.0,
          volume: opts.volume || 0.8,
          onStart: () => {
            if (__DEV__) console.log('[Playback] Device TTS started');
          },
          onDone: () => {
            if (__DEV__) console.log('[Playback] Device TTS complete');
            setIsSpeaking(false);
            options.onDone?.();
            processQueue();
            resolve();
          },
          onStopped: () => {
            setIsSpeaking(false);
            resolve();
          },
          onError: (error) => {
            console.error('[Playback] Device TTS error:', error);
            setIsSpeaking(false);
            options.onError?.(error);
            reject(error);
          },
        });
      } catch (error) {
        console.error('[Playback] Device TTS failed:', error);
        setIsSpeaking(false);
        reject(error);
      }
    });
  }, [options]);
  
  // Process queue (FIFO)
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    const nextItem = queueRef.current.shift();
    
    if (nextItem) {
      try {
        // Try Azure first, fallback to device
        try {
          await speakAzure(nextItem);
        } catch (azureError) {
          if (__DEV__) {
            console.warn('[Playback] Azure failed, using device fallback');
          }
          await speakDevice(nextItem);
        }
      } catch (error) {
        console.error('[Playback] All TTS methods failed:', error);
        options.onError?.(error as Error);
      }
    }
    
    isProcessingRef.current = false;
  }, [options, speakAzure, speakDevice]);
  
  // Public speak method
  const speak = useCallback(async (opts: SpeakOptions): Promise<void> => {
    // Guard against empty or JSON text
    if (!opts.text || opts.text.trim().length === 0) {
      if (__DEV__) console.warn('[Playback] Empty text, skipping');
      return;
    }
    
    // Guard against raw streaming JSON
    if (opts.text.includes('"content_block_delta"') || opts.text.startsWith('data:')) {
      if (__DEV__) console.warn('[Playback] Blocked raw JSON:', opts.text.substring(0, 50));
      return;
    }
    
    // Add to queue
    queueRef.current.push(opts);
    
    // Start processing if not already
    if (!isProcessingRef.current) {
      await processQueue();
    }
  }, [processQueue]);
  
  // Stop all playback immediately
  const stop = useCallback(async (): Promise<void> => {
    try {
      if (__DEV__) {
        console.log('[Playback] Stopping all audio...');
      }
      
      // Clear queue
      queueRef.current = [];
      isProcessingRef.current = false;
      
      // Stop Azure playback
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        } catch (error) {
          if (__DEV__) console.warn('[Playback] Stop Azure warning:', error);
        }
      }
      
      // Stop device TTS
      try {
        if (Speech.isSpeakingAsync()) {
          await Speech.stop();
        }
      } catch (error) {
        if (__DEV__) console.warn('[Playback] Stop device TTS warning:', error);
      }
      
      setIsSpeaking(false);
      
      if (__DEV__) {
        console.log('[Playback] All audio stopped');
      }
      
    } catch (error) {
      console.error('[Playback] Stop failed:', error);
      // Don't throw - stop should be as robust as possible
    }
  }, []);
  
  return {
    speak,
    stop,
    isSpeaking,
    fallbackUsed,
  };
}
