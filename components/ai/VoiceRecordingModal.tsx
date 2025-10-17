/**
 * VoiceRecordingModal Component - Simplified & Clean
 * 
 * A simple, reliable voice recording interface with:
 * - Clean state management
 * - Reliable send/cancel actions
 * - No freezing or double-tap issues
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { VoiceController } from '@/hooks/useVoiceController';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface VoiceRecordingModalProps {
  vc: VoiceController;
  visible: boolean;
  onClose: () => void;
}

export function VoiceRecordingModal({ vc, visible, onClose }: VoiceRecordingModalProps) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  
  // Simple local state
  const [isSending, setIsSending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Waveform animation
  const waveformBars = useRef(
    Array(40).fill(0).map(() => new Animated.Value(0.3))
  ).current;

  const isRecording = vc.state === 'listening';
  const isProcessing = vc.state === 'transcribing' || vc.state === 'thinking';

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Waveform animation
  useEffect(() => {
    if (isRecording) {
      const animations = waveformBars.map((bar, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 30),
            Animated.timing(bar, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: 0.2,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      Animated.parallel(animations).start();
      
      return () => {
        waveformBars.forEach(bar => bar.stopAnimation());
      };
    }
  }, [isRecording]);

  // Auto-start recording when modal opens
  useEffect(() => {
    const startRecording = async () => {
      if (visible && vc.state === 'idle') {
        try {
          console.log('[VoiceRecordingModal] Auto-starting recording');
          await vc.startPress();
        } catch (e) {
          console.error('[VoiceRecordingModal] Failed to start recording:', e);
        }
      }
    };
    
    startRecording();
  }, [visible]);

  const handleCancel = async () => {
    if (isSending) return; // Prevent double-tap
    
    try {
      console.log('[VoiceRecordingModal] Canceling recording');
      await vc.cancel();
      onClose();
    } catch (e) {
      console.error('[VoiceRecordingModal] Cancel error:', e);
      onClose(); // Close anyway
    }
  };

  const handleSend = async () => {
    if (isSending) return; // Prevent double-tap
    
    try {
      console.log('[VoiceRecordingModal] Sending recording');
      setIsSending(true);
      
      // Send the recording
      await vc.release();
      
      // Wait a tiny bit to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Close modal
      console.log('[VoiceRecordingModal] Recording sent successfully');
      onClose();
    } catch (e) {
      console.error('[VoiceRecordingModal] Send error:', e);
      onClose(); // Close anyway to prevent freezing
    } finally {
      setIsSending(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)' }]}>
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        
        {/* Header with status */}
        <View style={styles.header}>
          {isProcessing ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.text }]}>
                {vc.state === 'transcribing' 
                  ? t('voice.recording.transcribing', { defaultValue: 'Transcribing...' })
                  : t('voice.recording.thinking', { defaultValue: 'Thinking...' })
                }
              </Text>
            </View>
          ) : (
            <View style={styles.timerContainer}>
              <Animated.View
                style={[
                  styles.recordingDot,
                  {
                    backgroundColor: theme.error,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Text style={[styles.timerText, { color: theme.text }]}>
                {formatTime(vc.timerMs)}
              </Text>
            </View>
          )}
        </View>

        {/* Waveform */}
        <View style={styles.waveformContainer}>
          {waveformBars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: theme.primary,
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 64],
                  }),
                },
              ]}
            />
          ))}
        </View>

        {/* Hint text */}
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          {isRecording 
            ? t('voice.recording.tap_send', { defaultValue: 'Tap send when done' })
            : isProcessing
            ? t('voice.recording.processing', { defaultValue: 'Processing your recording...' })
            : t('voice.recording.ready', { defaultValue: 'Ready to record' })
          }
        </Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Cancel button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.error }]}
            onPress={handleCancel}
            disabled={isSending}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#fff" />
            <Text style={styles.cancelText}>
              {t('voice.controls.cancel', { defaultValue: 'Cancel' })}
            </Text>
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.sendButton, 
              { 
                backgroundColor: isSending || isProcessing ? theme.textSecondary : theme.primary,
                opacity: isSending || isProcessing ? 0.6 : 1
              }
            ]}
            onPress={handleSend}
            disabled={isSending || isProcessing || vc.state === 'idle'}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={28} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 24,
    minHeight: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timerText: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    gap: 4,
    marginVertical: 32,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
    minHeight: 10,
  },
  hintText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    minWidth: 130,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sendButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
