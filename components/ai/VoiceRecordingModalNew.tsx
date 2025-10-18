/**
 * Futuristic Voice Recording Modal - Society 5.0 Design
 * 
 * Features:
 * - HolographicOrb visual with real-time audio waveform
 * - Native on-device speech recognition (@react-native-voice/voice)
 * - Ultra-concise AI responses
 * - Smooth animations and haptic feedback
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import { HolographicOrb } from '@/components/ui/HolographicOrb';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.4;

interface VoiceRecordingModalNewProps {
  visible: boolean;
  onClose: () => void;
  dashInstance: DashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
  language?: string;
}

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export const VoiceRecordingModalNew: React.FC<VoiceRecordingModalNewProps> = ({
  visible,
  onClose,
  dashInstance,
  onMessageSent,
  language = 'en',
}) => {
  const { theme, isDark } = useTheme();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const processedRef = useRef(false);
  const [isAvailable, setIsAvailable] = useState(true);

  // Initialize Voice module
  useEffect(() => {
    if (!Voice) {
      console.warn('[VoiceModal] Voice module not available');
      setIsAvailable(false);
      return;
    }

    Voice.onSpeechStart = () => {
      console.log('[VoiceModal] Speech started');
    };

    Voice.onSpeechEnd = () => {
      console.log('[VoiceModal] Speech ended');
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      console.log('[VoiceModal] Speech results:', e.value);
      if (e.value && e.value.length > 0) {
        const text = e.value[0];
        setTranscript(text);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      console.log('[VoiceModal] Partial results:', e.value);
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0]);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('[VoiceModal] Speech error:', e.error);
      if (e.error?.message && !e.error.message.includes('No match')) {
        setErrorMsg(e.error.message);
        setState('error');
      }
    };

    return () => {
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      }
    };
  }, []);

  // Fade in/out animation
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setState('idle');
      setTranscript('');
      setResponse('');
      setErrorMsg('');
      processedRef.current = false;
    } else {
      fadeAnim.setValue(0);
      // Stop any active recording when closing
      if (Voice && state === 'listening') {
        Voice.stop().catch(() => {});
      }
    }
  }, [visible]);

  // Auto-start listening when modal opens
  useEffect(() => {
    if (visible && state === 'idle' && isAvailable) {
      const timer = setTimeout(async () => {
        await startListening();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, state, isAvailable]);

  const handleTranscript = useCallback(async (text: string) => {
    if (!dashInstance || processedRef.current) return;
    
    try {
      processedRef.current = true;
      setState('thinking');
      console.log('[VoiceModal] Sending to AI:', text);
      
      const aiResponse = await dashInstance.sendMessage(text);
      console.log('[VoiceModal] Got response:', aiResponse.content);
      
      setResponse(aiResponse.content);
      setState('speaking');
      
      // Notify parent
      onMessageSent?.(aiResponse);
      
      // Speak response
      if (aiResponse.content) {
        await dashInstance.speakResponse(aiResponse, {
          onDone: () => {
            console.log('[VoiceModal] TTS complete');
            setState('idle');
            // Auto-close after speaking
            setTimeout(() => onClose(), 500);
          },
          onError: (err) => {
            console.error('[VoiceModal] TTS error:', err);
            setState('error');
            setErrorMsg('Speech playback failed');
          },
        });
      } else {
        // No response to speak, close immediately
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('[VoiceModal] Error:', error);
      setState('error');
      setErrorMsg('Failed to process request');
      processedRef.current = false;
    }
  }, [dashInstance, onMessageSent, onClose]);

  const startListening = async () => {
    if (!isAvailable) {
      Alert.alert(
        'Not Available',
        'Speech recognition is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setState('listening');
      await Voice.start(language);
      console.log('[VoiceModal] Started listening with language:', language);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    } catch (e: any) {
      console.error('[VoiceModal] Error starting:', e);
      Alert.alert(
        'Error',
        'Failed to start speech recognition. Please check your microphone permissions.',
        [{ text: 'OK' }]
      );
      setState('error');
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      console.log('[VoiceModal] Stopped listening');
    } catch (e: any) {
      console.error('[VoiceModal] Error stopping:', e);
    }
  };

  const restartRecording = async () => {
    try {
      await Voice.cancel();
      setTranscript('');
      setErrorMsg('');
      processedRef.current = false;
      await startListening();
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    } catch (e) {
      console.error('[VoiceModal] Restart error:', e);
    }
  };

  const handleSend = async () => {
    if (!transcript.trim() || processedRef.current) return;
    
    try {
      // Stop listening first
      await stopListening();
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setState('thinking');
      await handleTranscript(transcript);
    } catch (e) {
      console.error('[VoiceModal] Manual send error:', e);
    }
  };

  const handleClose = async () => {
    if (state === 'thinking' || state === 'speaking') {
      // Don't close while processing
      return;
    }
    
    // Stop listening if active
    if (state === 'listening') {
      await stopListening();
    }
    
    setState('idle');
    onClose();
  };

  const getStateText = () => {
    switch (state) {
      case 'idle':
        return 'Tap to speak';
      case 'listening':
        return transcript || 'Listening...';
      case 'thinking':
        return 'Processing...';
      case 'speaking':
        return response || 'Speaking...';
      case 'error':
        return errorMsg || 'Error occurred';
      default:
        return '';
    }
  };

  const getOrbProps = () => {
    switch (state) {
      case 'listening':
        return { isListening: true };
      case 'thinking':
        return { isThinking: true };
      case 'speaking':
        return { isSpeaking: true };
      default:
        return {};
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.overlay,
            { opacity: fadeAnim }
          ]}
        >
          <LinearGradient
            colors={isDark 
              ? ['rgba(10,10,20,0.95)', 'rgba(20,10,40,0.98)']
              : ['rgba(240,240,255,0.95)', 'rgba(220,230,255,0.98)']
            }
            style={StyleSheet.absoluteFill}
          />

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          disabled={state === 'thinking' || state === 'speaking'}
        >
          <View style={[
            styles.closeButtonInner,
            { backgroundColor: theme.surfaceVariant }
          ]}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Main content */}
        <View style={styles.content}>
          {/* Holographic Orb */}
          <View style={styles.orbContainer}>
            <HolographicOrb
              size={ORB_SIZE}
              {...getOrbProps()}
            />
          </View>

          {/* Status text or editable transcript */}
          <View style={styles.textContainer}>
            {state === 'listening' && transcript ? (
              <TextInput
                style={[
                  styles.transcriptInput,
                  { 
                    color: theme.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor: theme.border,
                  }
                ]}
                value={transcript}
                onChangeText={setTranscript}
                multiline
                placeholder="Your speech will appear here..."
                placeholderTextColor={theme.textSecondary}
                autoCorrect
                autoCapitalize="sentences"
              />
            ) : (
              <Text 
                style={[
                  styles.statusText,
                  { color: theme.text }
                ]}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {getStateText()}
              </Text>
            )}
          </View>

          {/* Manual trigger button (only in idle state) */}
          {state === 'idle' && (
            <TouchableOpacity
              style={[styles.micButton, { backgroundColor: theme.primary }]}
              onPress={startListening}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Action buttons during listening */}
          {state === 'listening' && (
            <View style={styles.buttonRow}>
              {/* Send button (appears when there's transcript) */}
              {transcript.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: theme.primary }]}
                  onPress={handleSend}
                  activeOpacity={0.8}
                >
                  <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              )}
              
              {/* Restart button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.warning || theme.error }]}
                onPress={restartRecording}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.cancelButtonText}>Start Over</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  orbContainer: {
    marginBottom: 40,
  },
  textContainer: {
    paddingHorizontal: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
  },
  transcriptInput: {
    width: '100%',
    minHeight: 80,
    maxHeight: 200,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VoiceRecordingModalNew;
