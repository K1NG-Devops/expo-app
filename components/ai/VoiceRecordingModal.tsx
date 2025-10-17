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

interface VoiceRecordingModalProps {
  visible: boolean;
  onClose: () => void;
  dashInstance?: DashAIAssistant;
  vc?: any; // Voice controller for compatibility
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

export const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  visible,
  onClose,
  dashInstance,
  vc, // Voice controller parameter (optional)
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

// Also export as default for flexibility
export default VoiceRecordingModal;
