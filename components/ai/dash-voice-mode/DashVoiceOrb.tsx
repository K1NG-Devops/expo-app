/**
 * DashVoiceOrb - Holographic Orb Component
 * 
 * Renders the Society 5.0 holographic orb with status icon overlay.
 * 
 * Responsibilities:
 * - Render HolographicOrb with appropriate state (listening/speaking/thinking)
 * - Display status icon overlay (mic/volume/hourglass)
 * - Handle orb animations and visual states
 */

import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HolographicOrb } from '@/components/ui/HolographicOrb';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.5;

export interface DashVoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
  isMuted: boolean;
}

export const DashVoiceOrb: React.FC<DashVoiceOrbProps> = ({
  isListening,
  isSpeaking,
  isThinking,
  isMuted,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Determine icon based on state
  const getStatusIcon = () => {
    if (isSpeaking) return 'volume-high';
    if (isListening) return isMuted ? 'mic-off' : 'mic';
    return 'time-outline';
  };
  
  return (
    <View style={styles.orbContainer}>
      <HolographicOrb
        size={ORB_SIZE}
        isListening={isListening && !isSpeaking}
        isSpeaking={isSpeaking}
        isThinking={isThinking}
        audioLevel={0}  // TODO: Wire up actual audio level from voice session
      />
      
      {/* Status Icon Overlay */}
      <Animated.View style={[styles.statusIcon, { opacity: fadeAnim }]}>
        <Ionicons
          name={getStatusIcon()}
          size={48}
          color="#fff"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIcon: {
    position: 'absolute',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
