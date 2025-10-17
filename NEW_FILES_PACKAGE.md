# 📁 NEW FILES TO CREATE

Copy these files exactly as shown into your local project:

## 1. `components/ai/SimpleVoiceModal.tsx`

```typescript
/**
 * Simple Voice Recording Modal
 * 
 * A clean, minimal voice recording interface that avoids the complexity
 * and potential freeze issues of the previous implementations.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface SimpleVoiceModalProps {
  visible: boolean;
  onClose: () => void;
  dashInstance?: DashAIAssistant;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

export const SimpleVoiceModal: React.FC<SimpleVoiceModalProps> = ({
  visible,
  onClose,
  dashInstance,
}) => {
  const { theme, isDark } = useTheme();
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);

  // Clean up on unmount or when modal closes
  useEffect(() => {
    if (!visible) {
      cleanup();
    }
    return cleanup;
  }, [visible]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (isRecordingRef.current && dashInstance) {
      dashInstance.stopRecording().catch(() => {});
      isRecordingRef.current = false;
    }
    setState('idle');
    setDuration(0);
    setErrorMessage('');
    pulseAnim.setValue(1);
  };

  // Pulse animation for recording indicator
  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  // Timer for recording duration
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  const startRecording = async () => {
    if (!dashInstance) {
      setErrorMessage('AI Assistant not available');
      setState('error');
      return;
    }

    try {
      setState('recording');
      setDuration(0);
      setErrorMessage('');
      
      await dashInstance.preWarmRecorder();
      await dashInstance.startRecording();
      isRecordingRef.current = true;
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (error) {
      console.error('Failed to start recording:', error);
      setErrorMessage('Failed to start recording');
      setState('error');
      isRecordingRef.current = false;
    }
  };

  const stopAndSend = async () => {
    if (!dashInstance || !isRecordingRef.current) {
      onClose();
      return;
    }

    try {
      setState('processing');
      isRecordingRef.current = false;
      
      const audioUri = await dashInstance.stopRecording();
      
      // Simple transcription without complex progress tracking
      const result = await dashInstance.transcribeOnly(audioUri);
      
      if (result.error) {
        setErrorMessage(result.transcript || 'Transcription failed');
        setState('error');
        return;
      }

      // Send the message
      await dashInstance.sendMessage(result.transcript || 'Voice message', []);
      
      // Success - close modal
      cleanup();
      onClose();
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.error('Failed to process recording:', error);
      setErrorMessage('Failed to process recording');
      setState('error');
    }
  };

  const cancelRecording = async () => {
    if (isRecordingRef.current && dashInstance) {
      try {
        await dashInstance.stopRecording();
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
    cleanup();
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <View style={styles.contentContainer}>
            <View style={[styles.micContainer, { backgroundColor: theme.primary }]}>
              <Ionicons name="mic" size={32} color="white" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Voice Message
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Tap the microphone to start recording
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={startRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={20} color="white" />
              <Text style={styles.buttonText}>Start Recording</Text>
            </TouchableOpacity>
          </View>
        );

      case 'recording':
        return (
          <View style={styles.contentContainer}>
            <Animated.View
              style={[
                styles.recordingIndicator,
                { backgroundColor: theme.error, transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Ionicons name="mic" size={32} color="white" />
            </Animated.View>
            <Text style={[styles.title, { color: theme.text }]}>
              Recording...
            </Text>
            <Text style={[styles.timer, { color: theme.textSecondary }]}>
              {formatTime(duration)}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.error }]}
                onPress={cancelRecording}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="white" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={stopAndSend}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={20} color="white" />
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'processing':
        return (
          <View style={styles.contentContainer}>
            <View style={[styles.micContainer, { backgroundColor: theme.primary }]}>
              <Ionicons name="cloud-upload" size={32} color="white" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Processing...
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Transcribing your voice message
            </Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <View style={[styles.micContainer, { backgroundColor: theme.error }]}>
              <Ionicons name="alert-circle" size={32} color="white" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              Error
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {errorMessage || 'Something went wrong'}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: theme.textSecondary }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setState('idle');
                  setErrorMessage('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: Math.min(screenWidth - 40, 400),
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  micContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  timer: {
    fontSize: 24,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 120,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 120,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimpleVoiceModal;
```

## 2. `components/ai/ChatGPTVoiceMode.tsx`

```typescript
/**
 * ChatGPT-Style Interactive Voice Mode
 * 
 * Enhanced voice interface that works exactly like ChatGPT's voice feature:
 * - Continuous conversation with natural turn-taking
 * - Real-time voice activity detection
 * - Seamless interruption handling
 * - Automatic conversation flow
 * - Enhanced visual feedback
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.4;

interface ChatGPTVoiceModeProps {
  visible: boolean;
  onClose: () => void;
  dashInstance: DashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'waiting' | 'error';

export const ChatGPTVoiceMode: React.FC<ChatGPTVoiceModeProps> = ({
  visible,
  onClose,
  dashInstance,
  onMessageSent,
}) => {
  const { theme, isDark } = useTheme();
  const { i18n } = useTranslation();
  
  // Core conversation state
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Voice activity detection
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState(0);
  
  // Conversation flow control
  const [autoListenEnabled, setAutoListenEnabled] = useState(true);
  const [conversationActive, setConversationActive] = useState(false);
  const processingRef = useRef(false);
  const interruptedRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animations
  const orbPulse = useRef(new Animated.Value(1)).current;
  const orbGlow = useRef(new Animated.Value(0)).current;
  const waveformAnims = useRef(Array(12).fill(0).map(() => new Animated.Value(0.3))).current;
  
  // Language detection
  const mapLanguage = useCallback((lang?: string) => {
    const base = String(lang || '').toLowerCase();
    if (base.startsWith('af')) return 'af';
    if (base.startsWith('zu')) return 'zu';
    if (base.startsWith('xh')) return 'xh';
    if (base.startsWith('nso')) return 'nso';
    return 'en';
  }, []);
  
  const activeLanguage = mapLanguage(i18n?.language);

  // Enhanced realtime voice with ChatGPT-style features
  const realtimeVoice = useRealtimeVoice({
    enabled: true,
    language: activeLanguage,
    vadSilenceMs: 800, // More sensitive for natural conversation
    onPartialTranscript: (text) => {
      const transcript = String(text || '').trim();
      setUserTranscript(transcript);
      
      // Voice activity detection
      if (transcript.length > 0) {
        setIsUserSpeaking(true);
        setVoiceLevel(Math.min(transcript.length / 10, 1));
        
        // Reset silence timer
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        
        // Interrupt AI if speaking
        if (conversationState === 'speaking' && transcript.length >= 3) {
          handleUserInterruption();
        }
      }
    },
    onFinalTranscript: async (text) => {
      const transcript = String(text || '').trim();
      console.log('[ChatGPTVoice] Final transcript:', transcript);
      
      if (!transcript || processingRef.current) return;
      
      setUserTranscript(transcript);
      setIsUserSpeaking(false);
      setVoiceLevel(0);
      
      // Start silence detection for natural turn-taking
      startSilenceDetection();
      
      // Process the message
      await handleUserMessage(transcript);
    },
    onAssistantToken: (token) => {
      // Real-time AI response streaming (future enhancement)
      console.log('[ChatGPTVoice] AI token:', token);
    },
    onStatusChange: (status) => {
      console.log('[ChatGPTVoice] Stream status:', status);
      setIsConnected(status === 'streaming');
      
      if (status === 'error') {
        setConversationState('error');
        setErrorMessage('Connection lost. Please try again.');
      }
    },
  });

  // Handle user interruption of AI speech
  const handleUserInterruption = useCallback(async () => {
    if (conversationState !== 'speaking') return;
    
    console.log('[ChatGPTVoice] User interrupted AI speech');
    interruptedRef.current = true;
    
    // Stop AI speech immediately
    try {
      await dashInstance?.stopSpeaking();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to stop AI speech:', error);
    }
    
    // Transition to listening state
    setConversationState('listening');
    setAiResponse('');
  }, [conversationState, dashInstance]);

  // Natural silence detection for turn-taking
  const startSilenceDetection = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    let silenceCount = 0;
    const checkSilence = () => {
      silenceCount++;
      setSilenceTimer(silenceCount * 100);
      
      // After 1.2 seconds of silence, process the message
      if (silenceCount >= 12) {
        setIsUserSpeaking(false);
        setVoiceLevel(0);
        setSilenceTimer(0);
        return;
      }
      
      silenceTimeoutRef.current = setTimeout(checkSilence, 100);
    };
    
    silenceTimeoutRef.current = setTimeout(checkSilence, 100);
  }, []);

  // Process user message and generate AI response
  const handleUserMessage = useCallback(async (transcript: string) => {
    if (!dashInstance || processingRef.current) return;
    
    try {
      processingRef.current = true;
      setConversationState('processing');
      interruptedRef.current = false;
      
      console.log('[ChatGPTVoice] Processing user message:', transcript);
      
      // Send message to AI with conversation context
      const response = await dashInstance.sendMessage(transcript);
      
      // Update conversation state
      setConversationActive(true);
      onMessageSent?.(response);
      
      // Check if response should be spoken
      const shouldSpeak = !(response.metadata as any)?.doNotSpeak;
      const responseText = response.content || '';
      setAiResponse(responseText);
      
      if (responseText && shouldSpeak && !interruptedRef.current) {
        setConversationState('speaking');
        await speakAIResponse(responseText);
        
        // After speaking, automatically start listening again if enabled
        if (autoListenEnabled && !interruptedRef.current) {
          setTimeout(() => {
            if (conversationState !== 'error' && visible) {
              setConversationState('listening');
              setUserTranscript('');
              setAiResponse('');
            }
          }, 500);
        } else {
          setConversationState('waiting');
        }
      } else {
        // No speech or interrupted - wait for user
        setConversationState('waiting');
      }
    } catch (error) {
      console.error('[ChatGPTVoice] Error processing message:', error);
      setConversationState('error');
      setErrorMessage('Failed to process message. Please try again.');
    } finally {
      processingRef.current = false;
    }
  }, [dashInstance, autoListenEnabled, conversationState, visible, onMessageSent]);

  // Speak AI response with enhanced control
  const speakAIResponse = useCallback(async (text: string) => {
    if (!dashInstance || interruptedRef.current) return;
    
    try {
      const dummyMessage: DashMessage = {
        id: `voice_${Date.now()}`,
        type: 'assistant',
        content: text,
        timestamp: Date.now(),
      };
      
      await dashInstance.speakResponse(dummyMessage, {
        onStart: () => {
          if (!interruptedRef.current) {
            console.log('[ChatGPTVoice] AI speech started');
          }
        },
        onDone: () => {
          if (!interruptedRef.current) {
            console.log('[ChatGPTVoice] AI speech completed');
          }
        },
        onError: (error) => {
          console.error('[ChatGPTVoice] AI speech error:', error);
        },
      });
    } catch (error) {
      console.error('[ChatGPTVoice] Failed to speak AI response:', error);
    }
  }, [dashInstance]);

  // Initialize voice session
  useEffect(() => {
    if (!visible || !dashInstance) return;
    
    const initializeSession = async () => {
      try {
        console.log('[ChatGPTVoice] Initializing voice session');
        setConversationState('idle');
        setErrorMessage('');
        processingRef.current = false;
        interruptedRef.current = false;
        
        // Check streaming availability
        const streamingEnabled = await AsyncStorage.getItem('@dash_streaming_enabled');
        if (streamingEnabled !== 'true' && !process.env.EXPO_PUBLIC_DASH_STREAMING) {
          setErrorMessage('Voice streaming not enabled. Please check settings.');
          setConversationState('error');
          return;
        }
        
        // Start voice stream
        const connected = await realtimeVoice.startStream();
        if (connected) {
          setConversationState('listening');
          setIsConnected(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          startOrbAnimations();
        } else {
          setErrorMessage('Failed to connect. Please try again.');
          setConversationState('error');
        }
      } catch (error) {
        console.error('[ChatGPTVoice] Initialization error:', error);
        setErrorMessage('Failed to initialize voice mode.');
        setConversationState('error');
      }
    };
    
    initializeSession();
    
    return () => {
      console.log('[ChatGPTVoice] Cleaning up voice session');
      realtimeVoice.stopStream();
      stopOrbAnimations();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [visible, dashInstance]);

  // Orb animations based on conversation state
  const startOrbAnimations = useCallback(() => {
    // Main orb pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(orbPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(orbGlow, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const stopOrbAnimations = useCallback(() => {
    orbPulse.stopAnimation();
    orbGlow.stopAnimation();
    waveformAnims.forEach(anim => anim.stopAnimation());
  }, []);

  // Waveform animation for voice activity
  useEffect(() => {
    if (isUserSpeaking && conversationState === 'listening') {
      const animations = waveformAnims.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 50),
            Animated.timing(anim, {
              toValue: 0.8 + Math.random() * 0.4,
              duration: 200 + Math.random() * 100,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: 200 + Math.random() * 100,
              useNativeDriver: false,
            }),
          ])
        )
      );
      
      Animated.parallel(animations).start();
    } else {
      waveformAnims.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(0.3);
      });
    }
  }, [isUserSpeaking, conversationState]);

  // Handle close with cleanup
  const handleClose = useCallback(async () => {
    try {
      await realtimeVoice.stopStream();
      await dashInstance?.stopSpeaking();
      stopOrbAnimations();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('[ChatGPTVoice] Close error:', error);
    } finally {
      onClose();
    }
  }, [realtimeVoice, dashInstance, onClose]);

  // Get orb color based on state
  const getOrbColor = () => {
    switch (conversationState) {
      case 'listening':
        return isUserSpeaking ? theme.success : theme.primary;
      case 'processing':
        return theme.warning || '#FFA500';
      case 'speaking':
        return theme.success;
      case 'error':
        return theme.error;
      default:
        return theme.primary;
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (conversationState) {
      case 'idle':
        return 'Connecting...';
      case 'listening':
        return isUserSpeaking ? 'Listening...' : 'Tap to speak or just start talking';
      case 'processing':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      case 'waiting':
        return 'Tap to continue or just start talking';
      case 'error':
        return errorMessage || 'Something went wrong';
      default:
        return 'Ready';
    }
  };

  if (!visible) return null;

  const orbColor = getOrbColor();
  const glowColor = orbGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [`${orbColor}20`, `${orbColor}60`],
  });

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Main Orb */}
      <View style={styles.orbContainer}>
        {/* Glow Effect */}
        <Animated.View
          style={[
            styles.orbGlow,
            {
              backgroundColor: glowColor,
              transform: [{ scale: orbPulse.interpolate({ inputRange: [1, 1.1], outputRange: [1, 1.2] }) }],
            },
          ]}
        />
        
        {/* Main Orb */}
        <Animated.View
          style={[
            styles.orb,
            {
              transform: [{ scale: orbPulse }],
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
        
        {/* Center Icon */}
        <View style={styles.orbIcon}>
          <Ionicons
            name={
              conversationState === 'listening' && isUserSpeaking
                ? 'mic'
                : conversationState === 'speaking'
                ? 'volume-high'
                : conversationState === 'processing'
                ? 'hourglass'
                : conversationState === 'error'
                ? 'alert-circle'
                : 'sparkles'
            }
            size={48}
            color="#fff"
          />
        </View>
        
        {/* Waveform for voice activity */}
        {isUserSpeaking && conversationState === 'listening' && (
          <View style={styles.waveform}>
            {waveformAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    backgroundColor: '#fff',
                    height: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, 32],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Status Text */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, { color: conversationState === 'error' ? theme.error : theme.text }]}>
          {getStatusText()}
        </Text>
        
        {userTranscript && conversationState === 'listening' && (
          <Text style={[styles.transcriptText, { color: theme.textSecondary }]} numberOfLines={3}>
            "{userTranscript}"
          </Text>
        )}
        
        {aiResponse && conversationState === 'speaking' && (
          <Text style={[styles.responseText, { color: theme.text }]} numberOfLines={4}>
            {aiResponse}
          </Text>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        {/* Auto-listen toggle */}
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: autoListenEnabled ? theme.primary : theme.surface }
          ]}
          onPress={() => {
            setAutoListenEnabled(!autoListenEnabled);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons
            name="repeat"
            size={20}
            color={autoListenEnabled ? '#fff' : theme.text}
          />
        </TouchableOpacity>
        
        {/* Manual talk button */}
        {(conversationState === 'waiting' || conversationState === 'idle') && (
          <TouchableOpacity
            style={[styles.talkButton, { backgroundColor: theme.primary }]}
            onPress={async () => {
              if (conversationState === 'waiting') {
                setConversationState('listening');
                setUserTranscript('');
                setAiResponse('');
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Ionicons name="mic" size={24} color="#fff" />
            <Text style={styles.talkButtonText}>Talk</Text>
          </TouchableOpacity>
        )}
        
        {/* Stop button when speaking */}
        {conversationState === 'speaking' && (
          <TouchableOpacity
            style={[styles.stopButton, { backgroundColor: theme.error }]}
            onPress={handleUserInterruption}
          >
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

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
    position: 'relative',
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orb: {
    width: ORB_SIZE * 0.8,
    height: ORB_SIZE * 0.8,
    borderRadius: (ORB_SIZE * 0.8) / 2,
    overflow: 'hidden',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  orbIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    position: 'absolute',
    bottom: -20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
  statusContainer: {
    marginTop: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH * 0.9,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  transcriptText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  talkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  talkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ChatGPTVoiceMode;
```

Continue with the rest of the files in the next message...