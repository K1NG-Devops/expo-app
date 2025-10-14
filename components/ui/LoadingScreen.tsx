/**
 * EduDash Pro Loading Screen Component
 * Matches the splash screen design with animated logo
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  showLogo = true 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for outer rings
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle rotate animation for icon
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#6366f1', '#8b5cf6', '#7c3aed']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {showLogo && (
        <View style={styles.logoContainer}>
          {/* Outer pulsing ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.outerRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.3, 0.1],
                }),
              },
            ]}
          />
          
          {/* Middle ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.middleRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.5, 0.2],
                }),
              },
            ]}
          />

          {/* Dark circle background */}
          <View style={styles.logoCircle}>
            {/* Icon container with subtle rotation */}
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="stats-chart" size={80} color="#ffffff" />
            </Animated.View>
          </View>
        </View>
      )}

      {/* App name */}
      <Text style={styles.appName}>EduDash Pro</Text>
      
      {/* Loading message */}
      {message && <Text style={styles.message}>{message}</Text>}
      
      {/* Loading indicator dots */}
      <View style={styles.dotsContainer}>
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.5, 1],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [1, 0.3],
              }),
            },
          ]}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  logoContainer: {
    position: 'relative',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  outerRing: {
    width: 280,
    height: 280,
  },
  middleRing: {
    width: 220,
    height: 220,
  },
  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});
