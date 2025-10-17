/**
 * Dash AI Voice-Enabled Floating Action Button
 * 
 * @status ACTIVE - Primary FAB component in use
 * @location app/_layout.tsx (currently deployed)
 * 
 * This is the main floating action button with voice AI capabilities.
 * Features:
 * - Single tap: Opens full Dash Assistant chat interface
 * - Double tap: Toggles elegant voice mode (DashVoiceMode)
 * - Long press: Opens voice mode for hands-free interaction
 * - Drag-to-reposition with position persistence
 * - Smooth animations and haptic feedback
 * - Permission handling for audio recording
 * 
 * Architecture:
 * - Uses PanResponder for gesture handling
 * - Integrates with DashAIAssistant singleton service
 * - Integrates with DashVoiceMode for full-screen voice UI
 * - Respects theme context
 * - AsyncStorage for position persistence
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useVoiceInteraction } from '@/lib/voice';
import { useVoiceController } from '@/hooks/useVoiceController';
import { DashSpeakingOverlay } from '@/components/ai/DashSpeakingOverlay';
import { DashVoiceMode } from '@/components/ai/DashVoiceMode';
import { useTranslation } from 'react-i18next';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Safe movement bounds and helpers to prevent the FAB from going off-screen
const RIGHT_MARGIN = 20; // matches styles.container.right
const BOTTOM_MARGIN = Platform.OS === 'ios' ? 90 : 80; // matches styles.container.bottom
const LEFT_MARGIN = 20; // keep some space from the left edge
const TOP_MARGIN = 100; // avoid headers/notches (aligned with getInitialPosition)

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
const getBounds = () => {
  const minX = -(screenWidth - FAB_SIZE - (LEFT_MARGIN + RIGHT_MARGIN)); // negative toward left
  const maxX = 0; // 0 = right edge (anchored at right)
  const minY = -(screenHeight - FAB_SIZE - (TOP_MARGIN + BOTTOM_MARGIN)); // negative toward top
  const maxY = 0; // 0 = bottom edge (anchored at bottom)
  return { minX, maxX, minY, maxY };
};
const clampPosition = (x: number, y: number) => {
  const { minX, maxX, minY, maxY } = getBounds();
  return { x: clamp(x, minX, maxX), y: clamp(y, minY, maxY) };
};

interface DashVoiceFloatingButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showWelcomeMessage?: boolean;
  style?: any;
}

const FAB_POSITION_KEY = '@dash_fab_position';
const FAB_SIZE = 60;
const LONG_PRESS_DELAY = 450; // ms
const HOLD_TO_TALK = true; // long-press press-and-hold streaming

export const DashVoiceFloatingButton: React.FC<DashVoiceFloatingButtonProps> = ({
  position = 'bottom-right',
  showWelcomeMessage = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(showWelcomeMessage);
  const [isDragging, setIsDragging] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [dashResponse, setDashResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const tooltipAnimation = useRef(new Animated.Value(0)).current;
  const voiceAnimation = useRef(new Animated.Value(0)).current;
  
  const pan = useRef(new Animated.ValueXY()).current;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActivated = useRef<boolean>(false);
  const lastTapRef = useRef<number>(0);
  
  // Legacy quick voice hook for permissions and speaking
  const {
    recordingState,
    isSpeaking,
    stopSpeaking,
    hasPermission,
    requestPermission,
  } = useVoiceInteraction();

  // Unified controller for modern recording modal
  const dash = React.useMemo(() => DashAIAssistant.getInstance(), []);
  const vc = useVoiceController(dash, {
    onResponse: async (message) => {
      try { await dash.speakResponse(message); } catch (e) { console.warn('[DashVoiceFAB] speakResponse error:', e); }
    },
  });

  // Load saved position on mount
  useEffect(() => {
    loadSavedPosition();
     
  }, []);

  const loadSavedPosition = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAB_POSITION_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        const clamped = clampPosition(x, y);
        pan.setValue({ x: clamped.x, y: clamped.y });
        // Re-save if we corrected an out-of-bounds persisted position
        if (clamped.x !== x || clamped.y !== y) {
          savePosition(clamped.x, clamped.y);
        }
      } else {
        const initial = getInitialPosition();
        const clamped = clampPosition(initial.x, initial.y);
        pan.setValue({ x: clamped.x, y: clamped.y });
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
    switch (position) {
      case 'bottom-left':
        return { x: -(screenWidth - FAB_SIZE - margin * 2), y: 0 };
      case 'top-right':
        return { x: 0, y: -(screenHeight - FAB_SIZE - 100) };
      case 'top-left':
        return { x: -(screenWidth - FAB_SIZE - margin * 2), y: -(screenHeight - FAB_SIZE - 100) };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.08,
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

  // Voice recording animation
  useEffect(() => {
    if (recordingState.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(voiceAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(voiceAnimation, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      voiceAnimation.setValue(0);
    }
     
  }, [recordingState.isRecording]);

  // Play click sound for tactile feedback
  const playClickSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/notification.wav'),
        { shouldPlay: true, volume: 0.3 }
      );
      // Unload after playing to prevent memory leak
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log('[FAB] Click sound failed:', e);
    }
  };

  // Ensure a conversation exists and Dash is initialized
  const ensureConversation = async (): Promise<string | null> => {
    try {
      const dash = DashAIAssistant.getInstance();
      try { await dash.initialize(); } catch { /* Intentional: non-fatal */ }
      const current = dash.getCurrentConversationId();
      if (!current) {
        const id = await dash.startNewConversation('Quick Voice');
        return id;
      }
      return current;
    } catch (e) {
      console.warn('[DashVoiceFAB] Failed to ensure conversation:', e);
      return null;
    }
  };

  const handleSingleTap = async () => {
    if (isDragging) return;
    try {
      setIsLoading(true);
      // Play click sound
      playClickSound();
      // Strong haptic for tap confirmation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((e) => {
        console.log('[FAB] Tap haptic failed:', e);
      });
      router.push('/screens/dash-assistant');
      // Reset loading after navigation (short delay for visual feedback)
      setTimeout(() => setIsLoading(false), 500);
    } catch (error) {
      console.error('[DashVoiceFAB] Single tap failed:', error);
      setIsLoading(false);
    }
  };

  // Long press will start app-wide quick voice modal
const handleLongPress = async () => {
    if (isDragging) return;
    try {
      setIsLoading(true);
      // Play distinct sound for long-press
      playClickSound();
      // Heavy haptic with error logging
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((e) => {
        console.log('[FAB] Long-press haptic failed:', e);
      });

      // Always ensure mic permission on Android to avoid second long-press
      try {
        if (Platform.OS === 'android') {
          const { PermissionsAndroid } = await import('react-native');
          console.log('[DashVoiceFAB] 🔍 Checking mic permission on long press...');
          const perm = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
          const already = await PermissionsAndroid.check(perm as any);
          console.log('[DashVoiceFAB] ✅ Permission already granted:', already);
          if (!already) {
            console.log('[DashVoiceFAB] 🔒 Requesting mic permission...');
            const status = await PermissionsAndroid.request(perm as any);
            console.log('[DashVoiceFAB] 📋 Permission result:', status, 'GRANTED?', status === PermissionsAndroid.RESULTS.GRANTED);
            if (status !== PermissionsAndroid.RESULTS.GRANTED) {
              console.error('[DashVoiceFAB] ❌ Permission DENIED, aborting long press');
              setIsLoading(false);
              return;
            }
            console.log('[DashVoiceFAB] ✅ Permission GRANTED, continuing with voice mode');
          }
        }
      } catch (err) {
        console.error('[DashVoiceFAB] ⚠️ Permission check error:', err);
      }

      // Ensure dash is initialized before opening voice mode
      try {
        await dash.initialize();
      } catch (e) {
        console.error('[DashVoiceFAB] ❌ Failed to initialize Dash:', e);
        setIsLoading(false);
        return;
      }
      
      await ensureConversation();
      // Open elegant full-screen voice mode
      setShowVoiceMode(true);
      setIsLoading(false);
    } catch (e) {
      console.error('[DashVoiceFAB] Long press failed:', e);
      setIsLoading(false);
    }
  };


  const handlePress = () => {
    if (longPressActivated.current) return;
    const now = Date.now();
    const delta = now - (lastTapRef.current || 0);
    lastTapRef.current = now;
    if (delta < 300) {
      // Double tap -> toggle elegant voice mode
      playClickSound();
      try { 
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((e) => {
          console.log('[FAB] Double-tap haptic failed:', e);
        }); 
      } catch { /* Intentional: non-fatal */ }
      // Ensure dash is initialized before toggling voice mode
      if (!showVoiceMode) {
        setIsLoading(true);
        dash.initialize().then(() => {
          setShowVoiceMode(true);
          setIsLoading(false);
        }).catch(e => {
          console.error('[DashVoiceFAB] ❌ Failed to initialize:', e);
          setIsLoading(false);
        });
      } else {
        setShowVoiceMode(false);
      }
    } else {
      // Single tap -> open full Dash assistant
      handleSingleTap();
    }
  };

  const handlePressIn = () => {
    // Play click sound
    playClickSound();
    
    // Strong haptic feedback on touch
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((e) => {
      console.log('[FAB] Haptic failed:', e);
    });
    
    // Start long-press timer
    longPressActivated.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true;
      handleLongPress();
    }, LONG_PRESS_DELAY);
    Animated.spring(scaleAnimation, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // If long-press activated, do nothing — user closes voice mode via X
    if (HOLD_TO_TALK && longPressActivated.current && showVoiceMode) {
      longPressActivated.current = false;
    }
    Animated.spring(scaleAnimation, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
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
        // Only mark as dragging if moved more than tolerance
        if (Math.abs(gesture.dx) > 15 || Math.abs(gesture.dy) > 15) {
          setIsDragging(true);
          if (showTooltip) setShowTooltip(false);
          // Cancel long-press if dragging
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
            longPressActivated.current = false;
          }
        }
        // Compute absolute candidate position from current offset + delta
        // @ts-ignore
        const ox = pan.x._offset || 0;
        // @ts-ignore
        const oy = pan.y._offset || 0;
        const targetX = ox + gesture.dx;
        const targetY = oy + gesture.dy;
        const clamped = clampPosition(targetX, targetY);
        // Set value relative to current offset so the UI stays smooth
        // @ts-ignore
        pan.x.setValue(clamped.x - ox);
        // @ts-ignore
        pan.y.setValue(clamped.y - oy);
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        handlePressOut();

        // Cancel long-press if user dragged far
        if (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10) {
          longPressActivated.current = false;
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        }

        // Read absolute position, clamp to screen bounds, animate to safe position, then save
        // @ts-ignore
        const currentX = pan.x._value || 0;
        // @ts-ignore
        const currentY = pan.y._value || 0;
        const clamped = clampPosition(currentX, currentY);

        if (clamped.x !== currentX || clamped.y !== currentY) {
          Animated.spring(pan, {
            toValue: { x: clamped.x, y: clamped.y },
            useNativeDriver: false,
            friction: 7,
            tension: 40,
          }).start();
        }
        savePosition(clamped.x, clamped.y);

        // If barely moved, treat as tap (unless long-press already handled)
        if (!isDragging && Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          handlePress();
        }

        setTimeout(() => setIsDragging(false), 100);
      },
    })
  ).current;


  return (
    <>
      {/* Floating Action Button */}
      {!showVoiceMode && (
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: Animated.multiply(scaleAnimation, pulseAnimation) },
            ],
          },
          style,
        ]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.button,
            {
              backgroundColor: recordingState.isRecording 
                ? '#FF3B30' 
                : theme.primary || '#007AFF',
              shadowColor: recordingState.isRecording ? '#FF3B30' : theme.primary || '#007AFF',
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : recordingState.isRecording ? (
            <Animated.View
              style={{
                opacity: voiceAnimation,
              }}
            >
              <Ionicons name="mic" size={28} color="#FFF" />
            </Animated.View>
) : isSpeaking ? (
            <Ionicons name="volume-high" size={28} color="#FFF" />
          ) : (
            <Ionicons name="sparkles" size={28} color="#FFF" />
          )}
        </View>

        {/* Tooltip */}
      </Animated.View>
      )}

      {/* Elegant ChatGPT-style Voice Mode */}
      <DashVoiceMode
        visible={showVoiceMode}
        onClose={() => setShowVoiceMode(false)}
        dashInstance={dash}
        onMessageSent={() => { /* no-op */ }}
      />
      
      {/* Global speaking overlay - shows when Dash is speaking */}
      <DashSpeakingOverlay 
        isSpeaking={isSpeaking}
        onStopSpeaking={() => {
          stopSpeaking();
          setDashResponse('');
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 90 : 80,
    zIndex: 999,
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltip: {
    position: 'absolute',
    right: FAB_SIZE + 12,
    top: FAB_SIZE / 2 - 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceContainer: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  recordingSection: {
    alignItems: 'center',
    gap: 16,
  },
  recordingPulse: {
    marginBottom: 8,
  },
  recordingDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  durationText: {
    fontSize: 32,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 8,
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  speakingSection: {
    alignItems: 'center',
    gap: 16,
  },
  speakingIcon: {
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  instructionsSection: {
    alignItems: 'center',
    gap: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
