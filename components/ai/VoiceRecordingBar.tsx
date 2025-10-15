/**
 * VoiceRecordingBar - WhatsApp-Style Inline Voice Recording
 * 
 * Clean, simple voice recording that appears at the bottom.
 * Single tap mic → starts recording immediately
 * No modal, no gestures - just record and send
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface VoiceRecordingBarProps {
  isRecording: boolean;
  timerMs: number;
  onDelete: () => void;
  onPause?: () => void;
  onSend: () => void;
  isPaused?: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VoiceRecordingBar({
  isRecording,
  timerMs,
  onDelete,
  onPause,
  onSend,
  isPaused = false,
}: VoiceRecordingBarProps) {
  const { theme, isDark } = useTheme();
  
  // Waveform animation
  const waveformBars = useRef(
    Array(30).fill(0).map(() => new Animated.Value(0.3))
  ).current;

  // Pulse animation for recording dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animate waveform when recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      // Start waveform animation
      const animations = waveformBars.map((bar, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 20),
            Animated.timing(bar, {
              toValue: Math.random() * 0.7 + 0.3,
              duration: 200 + Math.random() * 150,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: 0.2,
              duration: 200 + Math.random() * 150,
              useNativeDriver: false,
            }),
          ])
        )
      );
      Animated.parallel(animations).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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

      return () => {
        waveformBars.forEach(bar => bar.stopAnimation());
        pulseAnim.stopAnimation();
      };
    } else {
      // Reset animations when paused
      waveformBars.forEach(bar => bar.setValue(0.3));
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused]);

  if (!isRecording) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={24} color={theme.error} />
      </TouchableOpacity>

      {/* Timer and waveform */}
      <View style={styles.centerContent}>
        {/* Timer with recording dot */}
        <View style={styles.timerContainer}>
          <Animated.View
            style={[
              styles.recordingDot,
              { 
                backgroundColor: theme.error,
                transform: [{ scale: isPaused ? 1 : pulseAnim }],
                opacity: isPaused ? 0.5 : 1,
              },
            ]}
          />
          <Text style={[styles.timer, { color: theme.text }]}>
            {formatTime(timerMs)}
          </Text>
        </View>

        {/* Waveform visualization */}
        <View style={styles.waveformContainer}>
          {waveformBars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: theme.primary,
                  opacity: isPaused ? 0.3 : 0.8,
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 32],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Pause/Resume button (optional) */}
      {onPause && (
        <TouchableOpacity
          style={[styles.pauseButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPause();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons 
            name={isPaused ? 'play' : 'pause'} 
            size={20} 
            color={theme.text} 
          />
        </TouchableOpacity>
      )}

      {/* Send button */}
      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: theme.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onSend();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="send" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
  },
  waveformBar: {
    width: 2.5,
    borderRadius: 1.5,
    minHeight: 4,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
