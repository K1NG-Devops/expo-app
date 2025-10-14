/**
 * Dash AI Assistant Floating Action Button
 * 
 * A floating button that provides quick access to the Dash AI Assistant
 * from anywhere in the app with animated interactions.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DashFloatingButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onPress?: () => void;
  showWelcomeMessage?: boolean;
  style?: any;
}

const FAB_POSITION_KEY = '@dash_fab_position';
const FAB_SIZE = 56;

export const DashFloatingButton: React.FC<DashFloatingButtonProps> = ({
  position = 'bottom-right',
  onPress,
  showWelcomeMessage = false,
  style,
}) => {
  const { theme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(showWelcomeMessage);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const tooltipAnimation = useRef(new Animated.Value(0)).current;
  const rotationAnimation = useRef(new Animated.Value(0)).current;
  
  // Pan responder for dragging
  const pan = useRef(new Animated.ValueXY()).current;
  const lastTap = useRef<number>(0);

  // Load saved position on mount
  useEffect(() => {
    loadSavedPosition();
  }, []);
  
  const loadSavedPosition = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAB_POSITION_KEY);
      const margin = 20;
      const minLeftOffset = -(screenWidth - FAB_SIZE - margin * 2);
      const minUpOffset = -(screenHeight - FAB_SIZE - (Platform.OS === 'ios' ? 60 : 20));
      const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

      if (saved) {
        const { x, y } = JSON.parse(saved);
        // Clamp to keep within screen bounds relative to bottom-right anchor
        const clampedX = clamp(x, minLeftOffset, 0);
        const clampedY = clamp(y, minUpOffset, 0);
        pan.setValue({ x: clampedX, y: clampedY });
      } else {
        // Set initial position based on prop
        const initialPos = getInitialPosition();
        pan.setValue(initialPos);
      }
    } catch (e) {
      console.error('Failed to load FAB position:', e);
    }
  };
  
  const savePosition = async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem(FAB_POSITION_KEY, JSON.stringify({ x, y }));
    } catch (e) {
      console.error('Failed to save FAB position:', e);
    }
  };
  
  const getInitialPosition = () => {
    const margin = 20;
    const safeAreaBottom = Platform.OS === 'ios' ? 34 : 0;
    
    switch (position) {
      case 'bottom-left':
        // Anchor is bottom-right; move left by screen width minus margins, keep vertical offset at 0
        return { x: -(screenWidth - FAB_SIZE - margin * 2), y: 0 };
      case 'top-right':
        // Move up to top area from bottom-right anchor
        return { x: 0, y: -(screenHeight - FAB_SIZE - (Platform.OS === 'ios' ? 60 : 20)) };
      case 'top-left':
        // Move left and up from bottom-right anchor
        return { x: -(screenWidth - FAB_SIZE - margin * 2), y: -(screenHeight - FAB_SIZE - (Platform.OS === 'ios' ? 60 : 20)) };
      default: // bottom-right
        // Keep at bottom-right anchor with no additional offset
        return { x: 0, y: 0 };
    }
  };

  // Auto-hide tooltip after ~12 seconds (longer instruction window)
  useEffect(() => {
    if (showTooltip) {
      Animated.timing(tooltipAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        hideTooltip();
      }, 12000);

      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  // Subtle pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const hideTooltip = () => {
    Animated.timing(tooltipAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowTooltip(false);
    });
  };

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only start dragging if moved more than 5px
        return Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(false);
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
        handlePressIn();
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10) {
          setIsDragging(true);
          if (showTooltip) hideTooltip();
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gesture);
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        handlePressOut();
        
        // Save position (clamped within screen bounds)
        const margin = 20;
        const minLeftOffset = -(screenWidth - FAB_SIZE - margin * 2);
        const minUpOffset = -(screenHeight - FAB_SIZE - (Platform.OS === 'ios' ? 60 : 20));
        const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
        // @ts-ignore
        const rawX = pan.x._value;
        // @ts-ignore
        const rawY = pan.y._value;
        const finalX = clamp(rawX, minLeftOffset, 0);
        const finalY = clamp(rawY, minUpOffset, 0);
        // Snap to clamped bounds if needed
        Animated.timing(pan, {
          toValue: { x: finalX, y: finalY },
          duration: 120,
          useNativeDriver: false,
        }).start();
        savePosition(finalX, finalY);
        
        // If not dragged much, treat as tap
        if (!isDragging && Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            // Double tap - reset position
            Animated.spring(pan, {
              toValue: getInitialPosition(),
              useNativeDriver: false,
              friction: 7,
            }).start();
          } else {
            // Single tap - open assistant
            setTimeout(() => handlePress(), 100);
          }
          lastTap.current = now;
        }
        
        setTimeout(() => setIsDragging(false), 200);
      },
    })
  ).current;
  
  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rotationAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(rotationAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (showTooltip) {
        hideTooltip();
      }

      if (onPress) {
        onPress();
      } else {
        // Navigate to Dash Assistant screen
        router.push('/screens/dash-assistant');
      }
    } catch (error) {
      console.error('Failed to open Dash Assistant:', error);
    }
  };

  // Position is now handled by pan values, removed static positioning

  const rotation = rotationAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 20 + (Platform.OS === 'ios' ? 34 : 0),
        },
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
        style,
      ]}
    >
      {/* Tooltip */}
      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              opacity: tooltipAnimation,
              transform: [{ scale: tooltipAnimation }],
            },
            position.includes('right') ? styles.tooltipRight : styles.tooltipLeft,
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.tooltipText, { color: theme.text }]}>
            Hi! I'm Dash, your AI assistant
          </Text>
          <Text style={[styles.tooltipSubtext, { color: theme.textSecondary }]}>
            Tap to chat with me!
          </Text>
        </Animated.View>
      )}

      {/* Main Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            transform: [
              { scale: Animated.multiply(scaleAnimation, pulseAnimation) },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.shadow,
              elevation: isPressed ? 4 : 8,
            },
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {/* Sparkle icon with gradient effect */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="sparkles"
              size={28}
              color={theme.onPrimary}
            />
            
            {/* Animated glow effect */}
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  backgroundColor: theme.primaryLight,
                  opacity: pulseAnimation.interpolate({
                    inputRange: [1, 1.05],
                    outputRange: [0, 0.3],
                  }),
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Ripple effect overlay */}
      {isPressed && (
        <Animated.View
          style={[
            styles.rippleEffect,
            {
              backgroundColor: theme.primaryLight,
              opacity: scaleAnimation.interpolate({
                inputRange: [0.95, 1],
                outputRange: [0.3, 0],
              }),
            },
          ]}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'relative',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: -1,
  },
  rippleEffect: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    top: -8,
    left: -8,
    zIndex: -1,
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 200,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipRight: {
    bottom: 70,
    right: 0,
  },
  tooltipLeft: {
    bottom: 70,
    left: 0,
  },
  tooltipText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipSubtext: {
    fontSize: 12,
  },
});

export default DashFloatingButton;