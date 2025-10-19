/**
 * Dash Voice Mode - Elegant ChatGPT-style Voice Interface
 * 
 * Full-screen voice conversation mode with:
 * - Pulsing orb animation
 * - Real-time transcription
 * - Auto-speak responses
 * - Clean, minimal UI
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { getDefaultVoiceProvider, type VoiceSession } from '@/lib/voice/unifiedProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVoicePreferences } from '@/lib/voice/hooks';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import { toast } from '@/components/ui/ToastProvider';
import { HolographicOrb } from '@/components/ui/HolographicOrb';
import { DashResponseCache } from '@/services/DashResponseCache';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.5;

interface DashVoiceModeProps {
  visible: boolean;
  onClose: () => void;
  dashInstance: DashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
  forcedLanguage?: string;
}

export const DashVoiceMode: React.FC<DashVoiceModeProps> = ({ 
  visible, 
  onClose, 
  dashInstance,
  onMessageSent,
  forcedLanguage
}) => {
  const { theme, isDark } = useTheme();
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [ready, setReady] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const abortSpeechRef = useRef(false); // Flag to abort ongoing speech
  const sessionRef = useRef<VoiceSession | null>(null);
  
  // Debug logging on state changes
  useEffect(() => {
    console.log('[DashVoiceMode] 🔍 State Update:', {
      visible,
      ready,
      streamingEnabled,
      speaking,
      hasTranscript: userTranscript.length > 0,
      hasResponse: aiResponse.length > 0,
      hasDashInstance: !!dashInstance
    });
  }, [visible, ready, streamingEnabled, speaking, userTranscript, aiResponse, dashInstance]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;  // Start visible
  const orbGlowAnim = useRef(new Animated.Value(0)).current;

  const { preferences } = useVoicePreferences();
  const { i18n } = useTranslation();
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  
  // Memoize language mapping to prevent re-calculation on every render
  const mapLang = useCallback((l?: string) => {
    const base = String(l || '').toLowerCase();
    if (base.startsWith('af')) return 'af';
    if (base.startsWith('zu')) return 'zu';
    if (base.startsWith('xh')) return 'xh';
    if (base.startsWith('nso') || base.startsWith('st') || base.startsWith('so')) return 'nso';
    if (base.startsWith('en')) return 'en';
    return 'en';
  }, []);
  
  // Memoize language calculation to prevent render loops
  const activeLang = useMemo(() => {
    const uiLang = mapLang(i18n?.language);
    const prefLang = mapLang(preferences?.language);
    return forcedLanguage ? mapLang(forcedLanguage) : (prefLang || uiLang);
  }, [forcedLanguage, preferences?.language, i18n?.language, mapLang]);

  const processedRef = useRef(false);

  // Initialize voice session when visible
  useEffect(() => {
    if (!visible) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        if (__DEV__) console.log('[DashVoiceMode] 🎤 Initializing Claude + Deepgram session...');
        
        const provider = await getDefaultVoiceProvider(activeLang);
        if (cancelled) return;
        
        const session = provider.createSession();
        sessionRef.current = session;
        
        const ok = await session.start({
          language: activeLang,
          onPartial: (text) => {
            if (!cancelled) {
              const partial = String(text || '').trim();
              console.log('[DashVoiceMode] 🎤 Partial transcript:', partial);
              setUserTranscript(partial);
              
              // Interrupt Dash if user starts speaking while Dash is responding
              if (speaking && partial.length >= 2) {
                console.log('[DashVoiceMode] 🛑 User interrupted - stopping TTS');
                
                // CRITICAL: Set abort flag and reset state immediately
                abortSpeechRef.current = true;
                processedRef.current = false;
                setSpeaking(false);
                setUserTranscript('');
                setAiResponse('');
                
                (async () => {
                  try {
                    await dashInstance?.stopSpeaking?.();
                    console.log('[DashVoiceMode] ✅ Speech stopped successfully');
                    // Reset abort flag after stop completes
                    abortSpeechRef.current = false;
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  } catch (e) {
                    console.warn('[DashVoiceMode] Failed to stop speech:', e);
                    abortSpeechRef.current = false;
                  }
                })();
              }
            }
          },
          onFinal: async (text) => {
            if (cancelled) return;
            
            const transcript = String(text || '').trim();
            console.log('[DashVoiceMode] ✅ Final transcript received:', transcript);
            
            // Skip if already processing or if aborted
            if (processedRef.current) {
              console.log('[DashVoiceMode] ⏭️  Skipping duplicate - already processing');
              return;
            }
            
            if (abortSpeechRef.current) {
              console.log('[DashVoiceMode] ⏭️  Skipping - speech was aborted');
              return;
            }
            
            // Minimum content threshold to avoid noise triggers
            const wordCount = transcript.split(/\s+/).length;
            if (!transcript || wordCount < 2) {
              console.warn('[DashVoiceMode] ⚠️ Empty or too short transcript, skipping:', transcript);
              return;
            }
            
            setUserTranscript(transcript);
            await handleTranscript(transcript);
          },
        });
        
        if (cancelled) return;
        
        if (ok) {
          setStreamingEnabled(true);
          setReady(true);
          if (__DEV__) console.log('[DashVoiceMode] ✅ Voice session ready');
        } else {
          setErrorMessage('Failed to start voice recognition');
          if (__DEV__) console.warn('[DashVoiceMode] ⚠️ Voice session failed to start');
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[DashVoiceMode] ❌ Initialization error:', e);
          setErrorMessage('Voice initialization failed');
        }
      }
    })();
    
    return () => {
      cancelled = true;
      if (__DEV__) console.log('[DashVoiceMode] 🧹 Cleanup: stopping session...');
      sessionRef.current?.stop().catch(() => {});
      
      // CRITICAL: Reset all state flags on unmount
      processedRef.current = false;
      abortSpeechRef.current = false;
    };
  }, [visible, activeLang]);

  // Simple status tracking for UI
  const isConnected = streamingEnabled && ready;
  const [muted, setMuted] = useState(false);
  
  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    sessionRef.current?.setMuted?.(newMuted);
  };

  const handleTranscript = async (transcript: string) => {
    if (!dashInstance) {
      console.error('[DashVoiceMode] ❌ No dashInstance available!');
      setErrorMessage('AI Assistant not ready. Please close and try again.');
      try { toast.error?.('AI Assistant not initialized'); } catch { /* Intentional: non-fatal */ }
      setTimeout(() => onClose(), 2000);
      return;
    }
    try {
      processedRef.current = true;
      console.log('[DashVoiceMode] 📝 Final transcript:', transcript);
      
      // Check cache first for instant response
      const cachedResponse = DashResponseCache.get(transcript);
      if (cachedResponse) {
        console.log('[DashVoiceMode] ⚡ Using cached response!');
        
        // Create response message
        const response: DashMessage = {
          id: `cached_${Date.now()}`,
          type: 'assistant',
          content: cachedResponse,
          timestamp: Date.now(),
          metadata: {
            detected_language: activeLang,
          },
        };
        
        setAiResponse(cachedResponse);
        onMessageSent?.(response);
        
        // Speak cached response
        abortSpeechRef.current = false;
        setSpeaking(true);
        await speakText(cachedResponse);
        
        if (!abortSpeechRef.current) {
          setSpeaking(false);
          processedRef.current = false;
          setUserTranscript('');
          setAiResponse('');
        }
        return;
      }
      
      // Send message to AI
      console.log('[DashVoiceMode] Sending message to AI with language context:', activeLang);
      const response = await dashInstance.sendMessage(transcript);
      console.log('[DashVoiceMode] ✅ Received AI response:', response.id);
      
      // Override response language to match orb language for TTS
      // This ensures TTS speaks in the same language as the orb input
      if (response.metadata) {
        response.metadata.detected_language = activeLang;
      } else {
        response.metadata = { detected_language: activeLang };
      }
      console.log('[DashVoiceMode] 📢 TTS will use language:', activeLang);
      
      const responseText = response.content || '';
      setAiResponse(responseText);
      
      // Notify parent component BEFORE speaking (so UI updates immediately)
      console.log('[DashVoiceMode] Calling onMessageSent callback');
      onMessageSent?.(response);
      
      // Check if response should be spoken (prevent error loops)
      const shouldSpeak = !(response.metadata as any)?.doNotSpeak;
      
      // Speak response
      if (responseText && shouldSpeak) {
        // Reset abort flag before starting new speech
        abortSpeechRef.current = false;
        setSpeaking(true);
        
        await speakText(responseText);
        
        // Only reset if speech wasn't aborted
        if (!abortSpeechRef.current) {
          setSpeaking(false);
          
          // Reset for next user input
          processedRef.current = false;
          setUserTranscript('');
          setAiResponse('');
        }
      } else if (!shouldSpeak) {
        // Speech was skipped due to doNotSpeak flag (error loop prevention)
        console.log('[DashVoiceMode] ⚠️ Speech skipped due to doNotSpeak flag (error loop prevention)');
        setSpeaking(false);
        processedRef.current = false;
        setUserTranscript('');
      }
    } catch (error) {
      console.error('[DashVoiceMode] Error processing message:', error);
      // Only reset if not aborted (aborted speech should maintain state)
      if (!abortSpeechRef.current) {
        setSpeaking(false);
        processedRef.current = false;
      }
    }
  };

  // Speak text using device TTS or Edge Function
  const speakText = async (text: string) => {
    if (!dashInstance) {
      console.error('[DashVoiceMode] ❌ Cannot speak: no dashInstance');
      return;
    }
    
    // Check if speech was aborted before starting
    if (abortSpeechRef.current) {
      console.log('[DashVoiceMode] ⚠️ Speech aborted before starting');
      return;
    }
    
    console.log('[DashVoiceMode] 🔊 Preparing to speak:', {
      textLength: text.length,
      preview: text.substring(0, 50)
    });
    
    try {
      // Use DashAIAssistant's built-in TTS (Edge Function + audio manager)
      const dummyMessage: DashMessage = {
        id: `voice_${Date.now()}`,
        type: 'assistant',
        content: text,
        timestamp: Date.now(),
      };
      
      console.log('[DashVoiceMode] 🎵 Calling dashInstance.speakResponse...');
      
      // Add timeout safeguard for stopSpeaking
      const speakPromise = dashInstance.speakResponse(dummyMessage, {
        onStart: () => {
          // Check abort flag even after TTS starts
          if (abortSpeechRef.current) {
            console.log('[DashVoiceMode] ⚠️ Speech aborted during playback');
            dashInstance.stopSpeaking();
            return;
          }
          console.log('[DashVoiceMode] ✅ TTS started successfully');
        },
        onDone: () => {
          if (!abortSpeechRef.current) {
            console.log('[DashVoiceMode] ✅ TTS completed successfully');
          }
        },
        onError: (err) => console.error('[DashVoiceMode] ❌ TTS error:', err),
      });
      
      // Wait for speech with timeout (max 30s)
      await Promise.race([
        speakPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TTS timeout')), 30000)
        )
      ]).catch(err => {
        if (err.message === 'TTS timeout') {
          console.warn('[DashVoiceMode] ⚠️ TTS timeout - force stopping');
          dashInstance.stopSpeaking();
        }
        throw err;
      });
      
      // Final check after TTS completes
      if (abortSpeechRef.current) {
        console.log('[DashVoiceMode] ⚠️ Speech was aborted');
        return;
      }
      
      console.log('[DashVoiceMode] 🎵 TTS call completed');
    } catch (error) {
      console.error('[DashVoiceMode] ❌ TTS Edge Function failed:', error);
      console.log('[DashVoiceMode] 🔄 Attempting device TTS fallback...');
      try {
        const Speech = await import('expo-speech');
        const localeMap: Record<string, string> = {
          en: 'en-ZA',
          af: 'af-ZA',
          zu: 'zu-ZA',
          xh: 'xh-ZA',
          nso: 'en-ZA', // fallback
        };
        const locale = localeMap[activeLang] || 'en-ZA';
        console.log('[DashVoiceMode] 🔊 Device TTS with locale:', locale);
        Speech.speak(text, { language: locale, pitch: 1.0, rate: 0.98 });
        console.log('[DashVoiceMode] ✅ Device TTS started');
      } catch (e) {
        console.error('[DashVoiceMode] ❌ Device TTS also failed:', e);
      }
    }
  };

  // No streaming setup needed - handled by voice session initialization above

  // No stream finish handling needed - voice session handles this automatically

  // Enhanced pulse animation for Society 5.0 - smoother, more organic
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(orbGlowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    orbGlowAnim.stopAnimation();
  };

  const handleClose = async () => {
    // Stop voice session
    if (sessionRef.current) {
      try {
        console.log('[DashVoiceMode] 🛑 Stopping voice session');
        await sessionRef.current.stop();
      } catch (e) {
        console.warn('[DashVoiceMode] ⚠️ Error stopping voice session:', e);
      }
    }
    
    // Stop TTS playback
    console.log('[DashVoiceMode] 🛑 Stopping TTS on close');
    setSpeaking(false);
    try {
      // Stop device TTS
      dashInstance?.stopSpeaking?.();
      // Stop audio manager TTS
      const { audioManager } = await import('@/lib/voice/audio');
      await audioManager.stop();
    } catch (e) {
      console.warn('[DashVoiceMode] ⚠️ Error stopping TTS:', e);
    }
    
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* Intentional: non-fatal */ }
    onClose();
  };

  if (!visible) return null;

  const orbColor = speaking ? theme.success : theme.primary;
  const glowColor = orbGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${orbColor}00`, `${orbColor}60`],
  });

  const isListening = ready && isConnected && !speaking;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Society 5.0 Holographic Orb */}
      <View style={styles.orbContainer}>
        <HolographicOrb
          size={ORB_SIZE}
          isListening={isListening && !speaking}
          isSpeaking={speaking}
          isThinking={!ready || !isConnected}
          audioLevel={0}  // TODO: Wire up actual audio level from voice session
        />
        
        {/* Status Icon Overlay */}
        <Animated.View style={[styles.statusIcon, { opacity: fadeAnim }]}>
          <Ionicons
            name={speaking ? 'volume-high' : isListening ? (muted ? 'mic-off' : 'mic') : 'hourglass'}
            size={48}
            color="#fff"
          />
        </Animated.View>

        {/* Stop button (left side) */}
        {speaking && (
          <TouchableOpacity
            onPress={async () => {
              try { 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
              } catch { /* Intentional: non-fatal */ }
              console.log('[DashVoiceMode] 🛑 User pressed stop button - aborting speech');
              
              // Set abort flag to prevent speech from continuing
              abortSpeechRef.current = true;
              setSpeaking(false);
              
              // Stop all TTS playback
              await dashInstance?.stopSpeaking?.();
              
              // Reset state for next input
              processedRef.current = false;
              setUserTranscript('');
              setAiResponse('');
              console.log('[DashVoiceMode] ✅ Ready for next input after stop');
            }}
            style={[styles.stopButton, { backgroundColor: '#E53935' }]}
          >
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* Mute toggle button (right side) */}
        {isListening && (
          <TouchableOpacity
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* Intentional: non-fatal */ }
              toggleMute();
            }}
            style={[styles.muteButton, { backgroundColor: muted ? '#E53935' : '#3C3C3C' }]}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Text */}
      <Animated.View style={[styles.statusContainer, { opacity: fadeAnim }]}>
        <Text style={[styles.statusTitle, { color: errorMessage ? theme.error : theme.text }]}>
          {errorMessage || (speaking ? '🔊 Dash is speaking...' : isListening ? (muted ? 'Muted' : 'Listening...') : 'Connecting...')}
        </Text>
        
        {!errorMessage && userTranscript && (
          <Text style={[styles.transcriptText, { color: theme.textSecondary }]} numberOfLines={3}>
            {userTranscript}
          </Text>
        )}
        
        {!errorMessage && aiResponse && !speaking && (
          <Text style={[styles.responseText, { color: theme.text }]} numberOfLines={4}>
            {aiResponse}
          </Text>
        )}
      </Animated.View>

      {/* Close Button */}
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: theme.surface }]}
        onPress={handleClose}
      >
        <Ionicons name="close" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    // Enhanced glow effect for Society 5.0
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 20,
  },
  orb: {
    width: ORB_SIZE * 0.75,
    height: ORB_SIZE * 0.75,
    borderRadius: (ORB_SIZE * 0.75) / 2,
    overflow: 'hidden',
    // Enhanced depth and 3D feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  statusIcon: {
    position: 'absolute',
    // Add subtle shadow to icon for depth
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusContainer: {
    marginTop: 50,
    paddingHorizontal: 32,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH * 0.9,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  transcriptText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
    opacity: 0.9,
  },
  responseText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    // Enhanced Society 5.0 button styling
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  muteButton: {
    position: 'absolute',
    bottom: -8,
    right: (ORB_SIZE * 0.125),
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff55',
    // Enhanced button depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stopButton: {
    position: 'absolute',
    bottom: -8,
    left: (ORB_SIZE * 0.125),
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff55',
    // Enhanced button depth
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
});
