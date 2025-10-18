/**
 * Futuristic Voice Recording Modal - Society 5.0 Design
 * 
 * Features:
 * - HolographicOrb visual with real-time audio waveform
 * - Streaming voice recognition (no obsolete local recording)
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
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
    }
  }, [visible]);

  // Auto-start listening when modal opens
  useEffect(() => {
    if (visible && state === 'idle') {
      const timer = setTimeout(() => {
        setState('listening');
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, state]);

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

  // Streaming voice recognition
  const realtime = useRealtimeVoice({
    enabled: state === 'listening',
    language,
    transcriptionModel: 'whisper-1',
    vadSilenceMs: 700,
    onPartialTranscript: (t) => {
      const partial = String(t || '').trim();
      setTranscript(partial);
    },
    onFinalTranscript: async (t) => {
      const final = String(t || '').trim();
      console.log('[VoiceModal] Final transcript:', final);
      setTranscript(final);
      if (final && !processedRef.current) {
        await handleTranscript(final);
      }
    },
    onStatusChange: (status) => {
      console.log('[VoiceModal] Status:', status);
    },
  });

  const handleClose = () => {
    if (state === 'thinking' || state === 'speaking') {
      // Don't close while processing
      return;
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

          {/* Status text */}
          <View style={styles.textContainer}>
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
          </View>

          {/* Manual trigger button (only in idle state) */}
          {state === 'idle' && (
            <TouchableOpacity
              style={[styles.micButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setState('listening');
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Cancel button during listening */}
          {state === 'listening' && (
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.error }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
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
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VoiceRecordingModalNew;
