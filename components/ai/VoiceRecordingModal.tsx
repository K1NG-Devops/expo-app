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
  const [minimized, setMinimized] = useState(false);

  // Keep local lock state in sync with controller
  useEffect(() => {
    setIsLocked(vc.isLocked);
  }, [vc.isLocked]);
  
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

  // Auto-close modal when processing completes (only if not manually closed)
  // Removed: modal now closes immediately after send to prevent double-tap

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

  // Ensure mic permission (Android) and auto-start when visible
  const ensureMicPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS !== 'android') return true;
      const { PermissionsAndroid } = await import('react-native');
      const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
      const already = await PermissionsAndroid.check(perm as any);
      if (already) return true;
      const granted = await PermissionsAndroid.request(perm as any);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return true; // best-effort
    }
  };

  // Removed auto-start to avoid double mic start; user must tap mic to start
  useEffect(() => {
    (async () => {
      try {
        if (!visible) return;
        await ensureMicPermission();
      } catch { /* Intentional: non-fatal */ }
    })();
  }, [visible]);

  // Gesture handler for swipe-up lock and WhatsApp-style send/cancel
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      translateY.value = 0;
    },
    onActive: (event) => {
      if (isLocked) return;
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
      if (event.translationY < LOCK_THRESHOLD && !isLocked) {
        runOnJS(setIsLocked)(true);
        translateY.value = withSpring(0);
        runOnJS(vc.lock)();
      }
    },
    onEnd: () => {
      if (isLocked) {
        translateY.value = withSpring(0);
      } else {
        // WhatsApp-style: release to send (no left-cancel gesture)
        runOnJS(() => { handleSend(); })();
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
      console.log('[VoiceRecordingModal] Sending recording and closing modal');
      // Close modal immediately to prevent double-tap issues
      resetAnimations();
      onClose();
      // Process in background
      await vc.release();
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
      <View style={[
        styles.container,
        { backgroundColor: theme.surface },
        minimized ? styles.containerMini : null,
      ]}>
        {/* Header row with minimize; show timer here only when minimized */}
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {minimized && (
              <>
                <RNAnimated.View
                  style={[
                    styles.recordingDot,
                    { backgroundColor: theme.error, transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <Text style={[styles.timerMini, { color: theme.text }]}>
                  {formatTime(vc.timerMs)}
                </Text>
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {minimized && (
              <TouchableOpacity
                onPress={() => {
                  const isActive = vc.state === 'listening' || vc.state === 'prewarm' || vc.state === 'transcribing';
                  if (isActive) {
                    handleCancel();
                  } else {
                    onClose();
                  }
                }}
                accessibilityLabel={'Close'}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setMinimized((m) => !m)} accessibilityLabel={minimized ? 'Expand' : 'Minimize'}>
              <Ionicons name={minimized ? 'chevron-up' : 'chevron-down'} size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {!minimized && (
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
              <View style={[styles.timerContainer, { justifyContent: 'center' }]}>
                <RNAnimated.View
                  style={[
                    styles.recordingDot,
                    {
                      backgroundColor: theme.error,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
                <Text style={[styles.timerLarge, { color: theme.text }]}>
                  {formatTime(vc.timerMs)}
                </Text>
              </View>
            )}
            
            {isLocked && (
              <View style={styles.lockedIndicator}>
                <Ionicons name="lock-closed" size={16} color={theme.textSecondary} />
              </View>
            )}
            {/* Minimal UI: no extra hints to keep it clean */}
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

          {/* Hint removed to avoid overlap with action row */}
          </Reanimated.View>
        </PanGestureHandler>
        )}

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
              {/* Cancel/Close on the left (red) */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.error }]}
                onPress={() => {
                  const isActive = vc.state === 'listening' || vc.state === 'prewarm' || vc.state === 'transcribing';
                  if (isActive) {
                    handleCancel();
                  } else {
                    onClose();
                  }
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="close" size={18} color={'#fff'} />
                <Text style={[styles.cancelText, { color: '#fff' }]}>
                  {(vc.state === 'listening' || vc.state === 'prewarm' || vc.state === 'transcribing') ? t('voice.controls.cancel', { defaultValue: 'Cancel' }) : t('voice.controls.close', { defaultValue: 'Close' })}
                </Text>
              </TouchableOpacity>

              {/* Mic / Send on the right */}
              <View style={styles.micContainer}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isProcessing} // Disable during transcription/thinking
                  onPress={async () => {
                    try {
                      if (vc.state === 'listening' || vc.state === 'prewarm') {
                        await handleSend();
                      } else if (vc.state === 'idle') {
                        // Only allow starting new recording if truly idle
                        const ok = await ensureMicPermission();
                        if (!ok) return;
                        await vc.startPress();
                      }
                      // Otherwise ignore (transcribing/thinking/error states)
                    } catch (e) {
                      console.error('[VoiceRecordingModal] Mic button error:', e);
                    }
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={[styles.micButton, { 
                    backgroundColor: isProcessing ? theme.textSecondary : theme.primary,
                    opacity: isProcessing ? 0.5 : 1
                  }]}>
                    <Ionicons name={(vc.state === 'listening' || vc.state === 'prewarm') ? 'send' : 'mic'} size={26} color="#fff" />
                  </View>
                </TouchableOpacity>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 20,
    minHeight: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  containerMini: {
    minHeight: 96,
    paddingTop: 6,
    paddingBottom: 6,
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
  },
  timer: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerLarge: {
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  timerMini: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lockedIndicator: {
    padding: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
    gap: 4,
    marginVertical: 28,
  },
  waveformBar: {
    width: 3.5,
    borderRadius: 2,
    minHeight: 10,
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
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
  micContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 120,
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
  },
});
