# 📁 REMAINING NEW FILES TO CREATE (Continued)

## 3. `hooks/useChatGPTVoice.ts`

```typescript
/**
 * ChatGPT-Style Voice Controller Hook
 * 
 * Enhanced voice interaction hook that provides:
 * - Continuous conversation flow
 * - Natural turn-taking
 * - Voice activity detection
 * - Seamless interruption handling
 * - Auto-listening after AI responses
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeVoice } from './useRealtimeVoice';
import { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

export type ChatGPTVoiceState = 
  | 'disconnected'
  | 'connecting' 
  | 'listening' 
  | 'processing' 
  | 'speaking' 
  | 'waiting'
  | 'error';

export interface VoiceActivity {
  isActive: boolean;
  level: number; // 0-1
  duration: number; // ms
}

export interface ChatGPTVoiceController {
  // State
  state: ChatGPTVoiceState;
  isConnected: boolean;
  voiceActivity: VoiceActivity;
  currentTranscript: string;
  currentResponse: string;
  
  // Controls
  startConversation: () => Promise<boolean>;
  stopConversation: () => Promise<void>;
  interruptAI: () => Promise<void>;
  toggleAutoListen: () => void;
  manualTalk: () => void;
  
  // Settings
  autoListenEnabled: boolean;
  language: string;
  
  // Events
  onUserMessage?: (transcript: string) => void;
  onAIResponse?: (response: DashMessage) => void;
  onStateChange?: (state: ChatGPTVoiceState) => void;
}

interface UseChatGPTVoiceOptions {
  dashInstance: DashAIAssistant | null;
  onUserMessage?: (transcript: string) => void;
  onAIResponse?: (response: DashMessage) => void;
  onStateChange?: (state: ChatGPTVoiceState) => void;
  autoListenDefault?: boolean;
  vadSensitivity?: number; // 0-1, higher = more sensitive
  silenceThreshold?: number; // ms before considering speech ended
}

export function useChatGPTVoice(options: UseChatGPTVoiceOptions): ChatGPTVoiceController {
  const {
    dashInstance,
    onUserMessage,
    onAIResponse,
    onStateChange,
    autoListenDefault = true,
    vadSensitivity = 0.7,
    silenceThreshold = 1000,
  } = options;

  const { i18n } = useTranslation();
  
  // Core state
  const [state, setState] = useState<ChatGPTVoiceState>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [autoListenEnabled, setAutoListenEnabled] = useState(autoListenDefault);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentResponse, setCurrentResponse] = useState('');
  
  // Voice activity detection
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivity>({
    isActive: false,
    level: 0,
    duration: 0,
  });
  
  // Internal state management
  const processingRef = useRef(false);
  const interruptedRef = useRef(false);
  const voiceStartTimeRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Language mapping
  const mapLanguage = useCallback((lang?: string) => {
    const base = String(lang || '').toLowerCase();
    if (base.startsWith('af')) return 'af';
    if (base.startsWith('zu')) return 'zu';
    if (base.startsWith('xh')) return 'xh';
    if (base.startsWith('nso')) return 'nso';
    return 'en';
  }, []);
  
  const language = mapLanguage(i18n?.language);

  // Enhanced realtime voice with ChatGPT optimizations
  const realtimeVoice = useRealtimeVoice({
    enabled: true,
    language,
    vadSilenceMs: silenceThreshold,
    onPartialTranscript: (text) => {
      const transcript = String(text || '').trim();
      setCurrentTranscript(transcript);
      
      if (transcript.length > 0) {
        // Update voice activity
        const now = Date.now();
        if (!voiceActivity.isActive) {
          voiceStartTimeRef.current = now;
        }
        
        const duration = now - voiceStartTimeRef.current;
        const level = Math.min(transcript.length / 20 * vadSensitivity, 1);
        
        setVoiceActivity({
          isActive: true,
          level,
          duration,
        });
        
        // Clear existing timeouts
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current);
          activityTimeoutRef.current = null;
        }
        
        // Interrupt AI if user starts speaking during AI response
        if (state === 'speaking' && transcript.length >= 2) {
          handleInterruption();
        }
        
        // Start activity timeout to detect when user stops speaking
        activityTimeoutRef.current = setTimeout(() => {
          setVoiceActivity(prev => ({ ...prev, isActive: false, level: 0 }));
        }, 500);
      }
    },
    onFinalTranscript: async (text) => {
      const transcript = String(text || '').trim();
      console.log('[ChatGPTVoice] Final transcript:', transcript);
      
      if (!transcript || processingRef.current) return;
      
      // Reset voice activity
      setVoiceActivity({ isActive: false, level: 0, duration: 0 });
      setCurrentTranscript(transcript);
      
      // Notify listeners
      onUserMessage?.(transcript);
      
      // Process the message
      await processUserMessage(transcript);
    },
    onStatusChange: (status) => {
      console.log('[ChatGPTVoice] Stream status:', status);
      setIsConnected(status === 'streaming');
      
      if (status === 'error') {
        setState('error');
      } else if (status === 'streaming' && state === 'connecting') {
        setState('listening');
      }
    },
  });

  // Handle AI interruption
  const handleInterruption = useCallback(async () => {
    if (state !== 'speaking') return;
    
    console.log('[ChatGPTVoice] Handling user interruption');
    interruptedRef.current = true;
    
    try {
      await dashInstance?.stopSpeaking();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setState('listening');
      setCurrentResponse('');
    } catch (error) {
      console.error('[ChatGPTVoice] Failed to interrupt AI:', error);
    }
  }, [state, dashInstance]);

  // Process user message and generate AI response
  const processUserMessage = useCallback(async (transcript: string) => {
    if (!dashInstance || processingRef.current) return;
    
    try {
      processingRef.current = true;
      interruptedRef.current = false;
      setState('processing');
      
      console.log('[ChatGPTVoice] Processing user message:', transcript);
      
      // Send message to AI
      const response = await dashInstance.sendMessage(transcript);
      
      // Notify listeners
      onAIResponse?.(response);
      
      const responseText = response.content || '';
      setCurrentResponse(responseText);
      
      // Check if response should be spoken
      const shouldSpeak = !(response.metadata as any)?.doNotSpeak;
      
      if (responseText && shouldSpeak && !interruptedRef.current) {
        setState('speaking');
        await speakAIResponse(responseText);
        
        // After speaking, decide next state
        if (!interruptedRef.current) {
          if (autoListenEnabled) {
            // Automatically start listening for next user input
            setTimeout(() => {
              if (state !== 'error') {
                setState('listening');
                setCurrentTranscript('');
                setCurrentResponse('');
              }
            }, 800); // Brief pause before listening again
          } else {
            setState('waiting');
          }
        }
      } else {
        // No speech or interrupted
        setState(autoListenEnabled ? 'listening' : 'waiting');
        if (autoListenEnabled) {
          setCurrentTranscript('');
          setCurrentResponse('');
        }
      }
    } catch (error) {
      console.error('[ChatGPTVoice] Error processing message:', error);
      setState('error');
    } finally {
      processingRef.current = false;
    }
  }, [dashInstance, autoListenEnabled, state, onAIResponse]);

  // Speak AI response
  const speakAIResponse = useCallback(async (text: string) => {
    if (!dashInstance || interruptedRef.current) return;
    
    try {
      const dummyMessage: DashMessage = {
        id: `chatgpt_voice_${Date.now()}`,
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

  // Start conversation
  const startConversation = useCallback(async (): Promise<boolean> => {
    if (!dashInstance) {
      console.error('[ChatGPTVoice] Cannot start: no dashInstance');
      return false;
    }
    
    try {
      setState('connecting');
      processingRef.current = false;
      interruptedRef.current = false;
      setCurrentTranscript('');
      setCurrentResponse('');
      setVoiceActivity({ isActive: false, level: 0, duration: 0 });
      
      // Check streaming availability
      const streamingEnabled = await AsyncStorage.getItem('@dash_streaming_enabled');
      if (streamingEnabled !== 'true' && !process.env.EXPO_PUBLIC_DASH_STREAMING) {
        setState('error');
        return false;
      }
      
      // Start voice stream
      const connected = await realtimeVoice.startStream();
      if (connected) {
        setState('listening');
        setIsConnected(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return true;
      } else {
        setState('error');
        return false;
      }
    } catch (error) {
      console.error('[ChatGPTVoice] Failed to start conversation:', error);
      setState('error');
      return false;
    }
  }, [dashInstance, realtimeVoice]);

  // Stop conversation
  const stopConversation = useCallback(async () => {
    try {
      // Clear all timeouts
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
      
      // Stop voice stream
      await realtimeVoice.stopStream();
      
      // Stop AI speech
      await dashInstance?.stopSpeaking();
      
      // Reset state
      setState('disconnected');
      setIsConnected(false);
      setCurrentTranscript('');
      setCurrentResponse('');
      setVoiceActivity({ isActive: false, level: 0, duration: 0 });
      processingRef.current = false;
      interruptedRef.current = false;
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('[ChatGPTVoice] Failed to stop conversation:', error);
    }
  }, [realtimeVoice, dashInstance]);

  // Interrupt AI
  const interruptAI = useCallback(async () => {
    await handleInterruption();
  }, [handleInterruption]);

  // Toggle auto-listen
  const toggleAutoListen = useCallback(() => {
    const newValue = !autoListenEnabled;
    setAutoListenEnabled(newValue);
    
    // Save preference
    AsyncStorage.setItem('@chatgpt_voice_auto_listen', String(newValue));
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [autoListenEnabled]);

  // Manual talk (when in waiting state)
  const manualTalk = useCallback(() => {
    if (state === 'waiting' || state === 'disconnected') {
      setState('listening');
      setCurrentTranscript('');
      setCurrentResponse('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [state]);

  // Load auto-listen preference
  useEffect(() => {
    AsyncStorage.getItem('@chatgpt_voice_auto_listen').then(value => {
      if (value !== null) {
        setAutoListenEnabled(value === 'true');
      }
    });
  }, []);

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    isConnected,
    voiceActivity,
    currentTranscript,
    currentResponse,
    
    // Controls
    startConversation,
    stopConversation,
    interruptAI,
    toggleAutoListen,
    manualTalk,
    
    // Settings
    autoListenEnabled,
    language,
  };
}

export default useChatGPTVoice;
```

## 4. `components/ai/VoiceModeSelector.tsx`

```typescript
/**
 * Voice Mode Selector Component
 * 
 * Allows users to choose between different voice interaction modes:
 * - Simple Voice Modal (basic recording)
 * - Original Voice Mode (orb with streaming)
 * - ChatGPT Voice Mode (continuous conversation)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type VoiceModeType = 'simple' | 'original' | 'chatgpt';

interface VoiceModeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onModeSelected: (mode: VoiceModeType) => void;
  currentMode?: VoiceModeType;
}

const VOICE_MODE_KEY = '@dash_preferred_voice_mode';

export const VoiceModeSelector: React.FC<VoiceModeSelectorProps> = ({
  visible,
  onClose,
  onModeSelected,
  currentMode = 'chatgpt',
}) => {
  const { theme, isDark } = useTheme();
  const [selectedMode, setSelectedMode] = useState<VoiceModeType>(currentMode);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(VOICE_MODE_KEY).then(saved => {
      if (saved && ['simple', 'original', 'chatgpt'].includes(saved)) {
        setSelectedMode(saved as VoiceModeType);
      }
    });
  }, []);

  const handleModeSelect = async (mode: VoiceModeType) => {
    try {
      setSelectedMode(mode);
      await AsyncStorage.setItem(VOICE_MODE_KEY, mode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onModeSelected(mode);
      onClose();
    } catch (error) {
      console.error('Failed to save voice mode preference:', error);
    }
  };

  const modes = [
    {
      id: 'chatgpt' as VoiceModeType,
      title: 'ChatGPT Voice',
      description: 'Continuous conversation with natural turn-taking',
      icon: 'chatbubbles',
      features: ['Auto-listening', 'Voice interruption', 'Natural flow'],
      recommended: true,
    },
    {
      id: 'original' as VoiceModeType,
      title: 'Voice Orb',
      description: 'Elegant orb interface with streaming',
      icon: 'radio-button-on',
      features: ['Real-time streaming', 'Visual feedback', 'Manual control'],
      recommended: false,
    },
    {
      id: 'simple' as VoiceModeType,
      title: 'Simple Recording',
      description: 'Basic voice recording and transcription',
      icon: 'mic',
      features: ['Reliable recording', 'Offline support', 'Simple UI'],
      recommended: false,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modal, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Choose Voice Mode
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mode Options */}
          <View style={styles.modesContainer}>
            {modes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  {
                    backgroundColor: selectedMode === mode.id ? theme.primaryLight : theme.background,
                    borderColor: selectedMode === mode.id ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleModeSelect(mode.id)}
                activeOpacity={0.8}
              >
                {/* Header Row */}
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconContainer}>
                    <Ionicons
                      name={mode.icon as any}
                      size={24}
                      color={selectedMode === mode.id ? theme.primary : theme.text}
                    />
                    {mode.recommended && (
                      <View style={[styles.recommendedBadge, { backgroundColor: theme.success }]}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  {selectedMode === mode.id && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </View>

                {/* Mode Info */}
                <Text style={[styles.modeTitle, { color: selectedMode === mode.id ? theme.primary : theme.text }]}>
                  {mode.title}
                </Text>
                <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                  {mode.description}
                </Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                  {mode.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={selectedMode === mode.id ? theme.primary : theme.success}
                      />
                      <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Text */}
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            You can change this anytime in settings. ChatGPT Voice provides the most natural conversation experience.
          </Text>
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
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  modeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modeIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  featuresContainer: {
    gap: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default VoiceModeSelector;
```

## 5. `hooks/useVoiceModePreference.ts`

```typescript
/**
 * Voice Mode Preference Hook
 * 
 * Manages user's preferred voice interaction mode and provides
 * easy access to the current selection.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceModeType = 'simple' | 'original' | 'chatgpt';

const VOICE_MODE_KEY = '@dash_preferred_voice_mode';
const DEFAULT_MODE: VoiceModeType = 'chatgpt';

export function useVoiceModePreference() {
  const [voiceMode, setVoiceMode] = useState<VoiceModeType>(DEFAULT_MODE);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(VOICE_MODE_KEY);
        if (saved && ['simple', 'original', 'chatgpt'].includes(saved)) {
          setVoiceMode(saved as VoiceModeType);
        }
      } catch (error) {
        console.error('Failed to load voice mode preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, []);

  // Update preference
  const updateVoiceMode = useCallback(async (mode: VoiceModeType) => {
    try {
      setVoiceMode(mode);
      await AsyncStorage.setItem(VOICE_MODE_KEY, mode);
    } catch (error) {
      console.error('Failed to save voice mode preference:', error);
      // Revert on error
      const saved = await AsyncStorage.getItem(VOICE_MODE_KEY);
      if (saved && ['simple', 'original', 'chatgpt'].includes(saved)) {
        setVoiceMode(saved as VoiceModeType);
      }
    }
  }, []);

  // Get mode configuration
  const getModeConfig = useCallback((mode: VoiceModeType = voiceMode) => {
    switch (mode) {
      case 'chatgpt':
        return {
          title: 'ChatGPT Voice',
          description: 'Continuous conversation with natural turn-taking',
          icon: 'chatbubbles' as const,
          features: ['Auto-listening', 'Voice interruption', 'Natural flow'],
          supportsStreaming: true,
          supportsInterruption: true,
          supportsAutoListen: true,
        };
      case 'original':
        return {
          title: 'Voice Orb',
          description: 'Elegant orb interface with streaming',
          icon: 'radio-button-on' as const,
          features: ['Real-time streaming', 'Visual feedback', 'Manual control'],
          supportsStreaming: true,
          supportsInterruption: true,
          supportsAutoListen: false,
        };
      case 'simple':
        return {
          title: 'Simple Recording',
          description: 'Basic voice recording and transcription',
          icon: 'mic' as const,
          features: ['Reliable recording', 'Offline support', 'Simple UI'],
          supportsStreaming: false,
          supportsInterruption: false,
          supportsAutoListen: false,
        };
      default:
        return getModeConfig('chatgpt');
    }
  }, [voiceMode]);

  return {
    voiceMode,
    updateVoiceMode,
    getModeConfig,
    isLoading,
  };
}

export default useVoiceModePreference;
```