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
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVoicePreferences } from '@/lib/voice/hooks';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import { toast } from '@/components/ui/ToastProvider';

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

  const realtime = useRealtimeVoice({
    enabled: streamingEnabled,
    language: activeLang,
    transcriptionModel: 'whisper-1', // OpenAI Realtime only supports whisper-1
    vadSilenceMs: 700, // 700ms of silence triggers end-of-speech detection
    onPartialTranscript: (t) => {
      const partial = String(t || '').trim();
      console.log('[DashVoiceMode] 🎤 Partial transcript:', partial);
      setUserTranscript(partial);
      
      // Interrupt Dash if user starts speaking while Dash is responding
      // Even short words should interrupt (improved sensitivity)
      if (speaking && partial.length >= 2) {
        console.log('[DashVoiceMode] 🛑 User interrupted - stopping TTS');
        
        // Immediately set speaking to false to prevent race conditions
        setSpeaking(false);
        
        // Stop speech asynchronously (properly awaited)
        (async () => {
          try {
            // Stop all TTS (both device TTS and audio manager)
            await dashInstance?.stopSpeaking?.();
            console.log('[DashVoiceMode] ✅ Speech stopped successfully');
            
            // Provide haptic feedback for interruption
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* Intentional: non-fatal */ }
          } catch (e) {
            console.warn('[DashVoiceMode] Failed to stop speech:', e);
          }
        })();
      }
    },
    onFinalTranscript: async (t) => {
      const transcript = String(t || '').trim();
      console.log('[DashVoiceMode] ✅ Final transcript received:', transcript);
      console.log('[DashVoiceMode] 🔍 Processing state:', {
        alreadyProcessed: processedRef.current,
        isEmpty: !transcript,
        willProcess: transcript && !processedRef.current
      });
      setUserTranscript(transcript);
      if (!transcript) {
        console.warn('[DashVoiceMode] ⚠️ Empty transcript, skipping');
        return;
      }
      if (processedRef.current) {
        console.warn('[DashVoiceMode] ⚠️ Already processed, skipping duplicate');
        return;
      }
      await handleTranscript(transcript);
    },
    onAssistantToken: (tok) => {
      // Real-time assistant token streaming (not used in this mode)
      console.log('[DashVoiceMode] 🤖 Assistant token (unused):', tok?.substring(0, 20));
    },
    onStatusChange: (status) => {
      console.log('[DashVoiceMode] 📡 Realtime status changed:', status);
    },
  });

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
      await dashInstance.speakResponse(dummyMessage, {
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

  // Check streaming availability
  useEffect(() => {
    (async () => {
      try {
        const env = String(process.env.EXPO_PUBLIC_DASH_STREAMING || '').toLowerCase() === 'true';
        const pref = await AsyncStorage.getItem('@dash_streaming_enabled');
        const enabled = env || pref === 'true';
        console.log('[DashVoiceMode] 🔧 Streaming config:', { env, pref, enabled });
        setStreamingEnabled(enabled);
      } catch (e) {
        console.error('[DashVoiceMode] ❌ Failed to check streaming config:', e);
      }
    })();
  }, []);

  // Start streaming when visible
  useEffect(() => {
    if (!visible) return;
    
    console.log('[DashVoiceMode] 🚀 Starting voice mode session');
    
    (async () => {
      setUserTranscript('');
      setAiResponse('');
      setReady(false);
      setErrorMessage('');
      setRetryCount(0);
      processedRef.current = false;
      
      // CRITICAL: Check if dashInstance is available before starting
      if (!dashInstance) {
        console.error('[DashVoiceMode] ❌ Cannot start: dashInstance is null!');
        setErrorMessage('AI Assistant not initialized. Please wait and try again.');
        try { toast.error?.('Please wait for AI to initialize'); } catch { /* Intentional: non-fatal */ }
        setTimeout(() => onClose(), 2500);
        return;
      }
      
      // Block indigenous SA languages (zu, xh, nso) - they MUST use Azure, not OpenAI Realtime
      const isIndigenous = ['zu', 'xh', 'nso'].includes(activeLang);
      if (isIndigenous) {
        const langName = activeLang === 'zu' ? 'Zulu' : activeLang === 'xh' ? 'Xhosa' : 'Northern Sotho';
        console.error('[DashVoiceMode] ❌ OpenAI Realtime does NOT support', langName);
        setErrorMessage(`${langName} uses Azure Speech. Please use the recording button.`);
        try { toast.error?.(`${langName} not supported in Voice Mode`); } catch { /* Intentional: non-fatal */ }
        setTimeout(() => onClose(), 2500);
        return;
      }
      
      if (!streamingEnabled) {
        console.error('[DashVoiceMode] ❌ Streaming not enabled!');
        setErrorMessage('Voice streaming is disabled. Check settings.');
        setTimeout(() => onClose(), 2000);
        return;
      }
      
      console.log('[DashVoiceMode] 🔌 Attempting to start realtime stream with language:', activeLang);
      
      // Save orb language preference to database (async, non-blocking)
      // This ensures future sessions use the correct language
      try {
        const voiceService = (await import('@/lib/voice/client')).voiceService;
        await voiceService.savePreferences({ language: activeLang as any });
        console.log('[DashVoiceMode] ✅ Saved language preference:', activeLang);
      } catch (e) {
        console.warn('[DashVoiceMode] ⚠️ Failed to save language preference:', e);
      }
      
      setErrorMessage('Connecting...');
      const ok = await realtime.startStream();
      console.log('[DashVoiceMode] 📡 Stream start result:', ok);
      
      if (ok) {
        console.log('[DashVoiceMode] ✅ Stream started successfully!');
        setReady(true);
        setErrorMessage('');
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* Intentional: non-fatal */ }
        // Start animations
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        startPulseAnimation();
      } else {
        console.error('[DashVoiceMode] ❌ Failed to start stream!');
        // Basic retry once
        setErrorMessage('Connection failed. Retrying...');
        setTimeout(async () => {
          const retryOk = await realtime.startStream();
          if (retryOk) {
            setReady(true);
            setErrorMessage('');
            startPulseAnimation();
          } else {
            setErrorMessage('Unable to connect. Please try again later.');
            setTimeout(() => onClose(), 2500);
          }
        }, 1000);
      }
    })();
    
    return () => {
      console.log('[DashVoiceMode] 📴 Cleaning up voice mode session');
      try { realtime.stopStream(); } catch { /* Intentional: non-fatal */ }
      stopPulseAnimation();
      setErrorMessage('');
    };
  }, [visible, streamingEnabled, activeLang]);

  // If stream ends without explicit final event, use the last transcript
  useEffect(() => {
    if (!visible) return;
    if (realtime.status === 'finished' && !processedRef.current) {
      const tx = userTranscript.trim();
      if (tx.length > 0) {
        console.log('[DashVoiceMode] ⚠️ Using last transcript after finish');
        handleTranscript(tx);
      } else {
        console.warn('[DashVoiceMode] ❗ Finished without transcript');
      }
    }
  }, [realtime.status, userTranscript, visible]);

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
    // Stop streaming
    try { await realtime.stopStream(); } catch { /* Intentional: non-fatal */ }
    
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

  const isListening = ready && realtime.status === 'streaming';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Orb Container */}
      <View style={styles.orbContainer}>
        {/* Glow */}
        <Animated.View
          style={[
            styles.orbGlow,
            {
              backgroundColor: glowColor,
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [1, 1.15], outputRange: [1, 1.3] }) }],
            },
          ]}
        />
        
        {/* Main Orb */}
        <Animated.View
          style={[
            styles.orb,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[orbColor, orbColor + 'CC', orbColor + '99']}
            style={styles.orbGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        
        {/* Status Icon */}
        <Animated.View style={[styles.statusIcon, { opacity: fadeAnim }]}>
          <Ionicons
            name={speaking ? 'volume-high' : isListening ? (realtime.muted ? 'mic-off' : 'mic') : 'hourglass'}
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
              realtime.toggleMute();
            }}
            style={[styles.muteButton, { backgroundColor: realtime.muted ? '#E53935' : '#3C3C3C' }]}
          >
            <Ionicons name={realtime.muted ? 'mic-off' : 'mic'} size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Text */}
      <Animated.View style={[styles.statusContainer, { opacity: fadeAnim }]}>
        <Text style={[styles.statusTitle, { color: errorMessage ? theme.error : theme.text }]}>
          {errorMessage || (speaking ? '🔊 Dash is speaking...' : isListening ? (realtime.muted ? 'Muted' : 'Listening...') : 'Connecting...')}
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
