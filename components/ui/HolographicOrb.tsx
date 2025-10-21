/**
 * Holographic Orb - Society 5.0 Futuristic Visual Component
 * 
 * A reusable animated orb with gradient effects, glow rings, and particle animations.
 * Used in FAB, voice mode, and other AI interaction points.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface HolographicOrbProps {
  size: number;
  isListening?: boolean;
  isSpeaking?: boolean;
  isThinking?: boolean;
  audioLevel?: number;  // 0-1 from microphone
  style?: any;
}

export const HolographicOrb: React.FC<HolographicOrbProps> = ({
  size,
  isListening = false,
  isSpeaking = false,
  isThinking = false,
  audioLevel = 0,
  style,
}) => {
  const { theme, isDark } = useTheme();
  
  // Animations
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const audioReactAnim = useRef(new Animated.Value(0)).current;

  // Glow animation - pulsing outer ring
  useEffect(() => {
    if (isListening || isSpeaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isListening, isSpeaking]);

  // Rotation animation - spinning when active
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    } else if (isSpeaking) {
      // Slower rotation when speaking
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isListening, isSpeaking]);

  // Thinking pulse animation
  useEffect(() => {
    if (isThinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isThinking]);

  // Audio reactive animation
  useEffect(() => {
    if (audioLevel > 0) {
      Animated.spring(audioReactAnim, {
        toValue: audioLevel,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(audioReactAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [audioLevel]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8],
  });

  const scale = Animated.add(
    pulseAnim,
    audioReactAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.2],
    })
  );

  // Society 5.0 gradient colors
  const gradientColors = isDark
    ? ([
        'rgba(99, 102, 241, 0.9)',   // Indigo
        'rgba(139, 92, 246, 0.8)',   // Purple
        'rgba(236, 72, 153, 0.7)',   // Pink
      ] as const)
    : ([
        'rgba(99, 102, 241, 1)',
        'rgba(139, 92, 246, 0.9)',
        'rgba(236, 72, 153, 0.8)',
      ] as const);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            opacity: glowOpacity,
            borderColor: gradientColors[0],
            transform: [{ scale }],
          },
        ]}
      />

      {/* Middle glow ring - rotates */}
      {(isListening || isSpeaking) && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: size + 40,
              height: size + 40,
              borderRadius: (size + 40) / 2,
              opacity: 0.3,
              borderColor: gradientColors[1],
              transform: [{ rotate: rotation }, { scale }],
            },
          ]}
        />
      )}

      {/* Main orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbGradient}
        />

        {/* Inner glow when active */}
        {(isListening || isSpeaking || isThinking) && (
          <Animated.View
            style={[
              styles.innerGlow,
              {
                opacity: glowOpacity,
              },
            ]}
          />
        )}
      </Animated.View>

      {/* Particle ring effect when listening */}
      {isListening && (
        <Animated.View
          style={[
            styles.particleRing,
            {
              width: size + 60,
              height: size + 60,
              borderRadius: (size + 60) / 2,
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 360) / 12;
            const radian = (angle * Math.PI) / 180;
            const distance = size / 2 + 30;
            const x = Math.cos(radian) * distance;
            const y = Math.sin(radian) * distance;
            
            return (
              <View
                key={i}
                style={[
                  styles.particle,
                  {
                    left: size / 2 + 30 + x,
                    top: size / 2 + 30 + y,
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  orb: {
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  particleRing: {
    position: 'absolute',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
