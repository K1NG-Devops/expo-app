/**
 * VoiceRecordingModal Component
 * 
 * WhatsApp-style voice recording interface with:
 * - Slide to cancel
 * - Swipe up to lock
 * - Waveform visualization
 * - Clean bottom sheet design
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Dimensions,
  Platform,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { VoiceController } from '@/hooks/useVoiceController';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOCK_THRESHOLD = -100; // Swipe up distance to lock (same as WhatsApp example)

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
  const [isLocked, setIsLocked] = useState(false);
  
  // Reanimated shared values for better performance
  const translateY = useSharedValue(0);
  const lockIconOpacity = useSharedValue(0);
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const chevronAnim = useRef(new RNAnimated.Value(0)).current;
  
  // Waveform animation (keeping legacy Animated API for now)
  const waveformBars = useRef(
    Array(40).fill(0).map(() => new RNAnimated.Value(0.3))
  ).current;

  const isRecording = vc.state === 'listening';
  const isProcessing = vc.state === 'transcribing' || vc.state === 'thinking';
  const isPrewarm = vc.state === 'prewarm';

  // Auto-close modal when processing completes
  useEffect(() => {
    if (visible && vc.state === 'idle' && !isRecording && !isProcessing) {
      // Processing finished, close modal
      onClose();
    }
  }, [vc.state, visible, isRecording, isProcessing, onClose]);

  // Show/hide lock icon and pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      // Show lock icon when recording starts
      lockIconOpacity.value = withSpring(1);
      
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Hide lock icon when not recording
      lockIconOpacity.value = withSpring(0);
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Chevron animation for lock indicator
  useEffect(() => {
    if (isRecording && !isLocked) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(chevronAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          RNAnimated.timing(chevronAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      chevronAnim.setValue(0);
    }
  }, [isRecording, isLocked]);

  // Waveform animation
  useEffect(() => {
    if (isRecording && !isLocked) {
      const animations = waveformBars.map((bar, index) =>
        RNAnimated.loop(
          RNAnimated.sequence([
            RNAnimated.delay(index * 30),
            RNAnimated.timing(bar, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
            RNAnimated.timing(bar, {
              toValue: 0.2,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      RNAnimated.parallel(animations).start();
      
      return () => {
        waveformBars.forEach(bar => bar.stopAnimation());
      };
    }
  }, [isRecording, isLocked]);

  // Gesture handler for swipe-up lock and release to send
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // reset translation on start
      translateY.value = 0;
    },
    onActive: (event) => {
      if (isLocked) return;
      // Only track vertical drag for lock gesture
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
      // Lock when threshold crossed
      if (event.translationY < LOCK_THRESHOLD && !isLocked) {
        runOnJS(setIsLocked)(true);
        translateY.value = withSpring(0);
        // Lock the controller on UI thread
        runOnJS(vc.lock)();
      }
    },
    onEnd: () => {
      if (isLocked) {
        // Reset position but keep recording
        translateY.value = withSpring(0);
      } else {
        // Not locked -> release to send
        runOnJS(handleSend)();
      }
    },
  });

  const handleCancel = async () => {
    try {
      await vc.cancel();
      resetAnimations();
      onClose();
    } catch (e) {
      console.error(t('voice.errors.cancel_error', { defaultValue: 'Cancel error' }), e);
    }
  };

  const handleSend = async () => {
    try {
      // DON'T close the modal immediately - let it stay open during transcription
      // The modal will close automatically when vc.state changes from 'listening'
      await vc.release();
      resetAnimations();
      // onClose(); // Removed - modal closes via visible prop when state changes
    } catch (e) {
      console.error(t('voice.errors.send_error', { defaultValue: 'Send error' }), e);
      onClose(); // Close on error
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    vc.lock();
    translateY.value = withSpring(0);
  };

  const handleDelete = async () => {
    await handleCancel();
    setIsLocked(false);
  };

  const resetAnimations = () => {
    translateY.value = 0;
    setIsLocked(false);
  };

  // Animated styles
  const animatedButtonStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedLockIconStyles = useAnimatedStyle(() => ({
    opacity: lockIconOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)' }]}>
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        {/* Lock indicator at top */}
        <Reanimated.View style={[styles.lockIndicator, animatedLockIconStyles]}>
            <View style={styles.lockColumn}>
              <RNAnimated.View
                style={{
                  opacity: chevronAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8],
                  }),
                  transform: [{
                    translateY: chevronAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [4, -4],
                    }),
                  }],
                  marginBottom: 4,
                }}
              >
                <Ionicons name="chevron-up" size={24} color={theme.primary} />
              </RNAnimated.View>
              
              <View style={[styles.lockIconContainer, { backgroundColor: theme.primary }]}>
                <Ionicons name="lock-closed" size={22} color="#fff" />
              </View>
              
              <RNAnimated.View
                style={{
                  opacity: chevronAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 0.3],
                  }),
                  transform: [{
                    translateY: chevronAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-4, 4],
                    }),
                  }],
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="chevron-up" size={24} color={theme.primary} />
              </RNAnimated.View>
              
              <Text style={[styles.lockText, { color: theme.textSecondary }]}>
                {t('voice.recording.slide_up_lock', { defaultValue: 'Slide up to lock' })}
              </Text>
            </View>
          </Reanimated.View>

        {/* Main recording area */}
        <PanGestureHandler onGestureEvent={gestureHandler} enabled={!isLocked}>
          <Reanimated.View style={[styles.recordingArea, animatedButtonStyles]}>
          {/* Recording indicator and timer */}
          <View style={styles.header}>
            {isProcessing ? (
              <Text style={[styles.timer, { color: theme.text, fontSize: 18 }]}>
                {vc.state === 'transcribing' ? t('voice.recording.transcribing', { defaultValue: 'Transcribing...' }) : t('voice.recording.thinking', { defaultValue: 'Thinking...' })}
              </Text>
            ) : isPrewarm ? (
              <Text style={[styles.timer, { color: theme.text, fontSize: 18 }]}>
                {t('voice.recording.starting', { defaultValue: 'Starting...' })}
              </Text>
            ) : (
              <View style={styles.timerContainer}>
                <RNAnimated.View
                  style={[
                    styles.recordingDot,
                    {
                      backgroundColor: theme.error,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <Text style={[styles.timer, { color: theme.text }]}>
                  {formatTime(vc.timerMs)}
                </Text>
              </View>
            )}
            
            {isLocked && (
              <View style={styles.lockedIndicator}>
                <Ionicons name="lock-closed" size={16} color={theme.textSecondary} />
              </View>
            )}
          </View>

          {/* Waveform */}
          <View style={styles.waveformContainer}>
            {waveformBars.map((bar, index) => (
              <RNAnimated.View
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

          {/* WhatsApp-style recording hint */}
          {!isLocked && (
            <View style={styles.slideHint}>
              <Text style={[styles.slideText, { color: theme.textSecondary }]}>
                {t('voice.recording.hold_to_record', { defaultValue: 'Hold to record • Slide up to lock' })}
              </Text>
            </View>
          )}
          </Reanimated.View>
        </PanGestureHandler>

        {/* Locked controls like WhatsApp */}
          {isLocked && (
          <View style={styles.lockedControls}>
            <Text style={[styles.lockedText, { color: theme.textSecondary }]}>{t('voice.recording.recording_locked', { defaultValue: 'Recording Locked' })}</Text>
            <View style={styles.lockedButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.error }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: theme.primary }]}
                onPress={handleSend}
              >
                <Ionicons name="send" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Bottom action buttons */}
        <View style={styles.actions}>
          {!isLocked && (
            <>
              {/* Mic icon (centered when not locked) */}
              <View style={styles.micContainer}>
                <View style={[styles.micButton, { backgroundColor: theme.primary }]}>
                  <Ionicons name="mic" size={32} color="#fff" />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 50,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24,
    minHeight: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  lockIndicator: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    alignItems: 'center',
  },
  lockColumn: {
    alignItems: 'center',
  },
  lockIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  recordingArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  timer: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  lockedIndicator: {
    padding: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    gap: 3,
    marginVertical: 24,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2.5,
    minHeight: 8,
  },
  slideHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  slideText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  micContainer: {
    flex: 1,
    alignItems: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  lockedControls: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockedText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  lockedButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
});
