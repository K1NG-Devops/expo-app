/**
 * DashVoiceControls - Controls for the Dash Voice Mode overlay
 *
 * Renders stop/end session, mute/unmute, and close buttons.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DashVoiceControlsProps {
  isMuted: boolean;
  canStop: boolean;
  onToggleMute: () => void;
  onStop: () => void;
  onClose: () => void;
}

export const DashVoiceControls: React.FC<DashVoiceControlsProps> = ({
  isMuted,
  canStop,
  onToggleMute,
  onStop,
  onClose,
}) => {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Unmute voice' : 'Mute voice'}
        onPress={onToggleMute}
        style={[styles.btn]}
      >
        <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop session"
        onPress={onStop}
        disabled={!canStop}
        style={[styles.btn, styles.stopBtn, !canStop && styles.btnDisabled]}
      >
        <Ionicons name="stop-circle" size={24} color="#fff" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close voice overlay"
        onPress={onClose}
        style={[styles.btn]}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: 12,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  stopBtn: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
});
