/**
 * Voice-Enabled Dash AI Assistant Floating Button
 * 
 * A floating button with integrated voice capabilities:
 * - Single tap: Quick voice interaction (speak to Dash, get spoken response)
 * - Double tap: Opens full Dash chat modal
 * - Draggable to any position on screen
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
  Modal,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVoiceInteraction } from '@/lib/voice';

// Conditional BlurView import with fallback
let BlurView: any = null;
let BLURVIEW_NATIVE_AVAILABLE = false;
try {
  const blurModule = require('expo-blur');
  if (blurModule && blurModule.BlurView) {
    // Verify native view manager exists to avoid runtime crash
    const name = 'ExpoBlurView';
    const config = (UIManager as any)?.getViewManagerConfig
      ? (UIManager as any).getViewManagerConfig(name)
      : (UIManager as any)?.[name];
    if (config) {
      BlurView = blurModule.BlurView;
      BLURVIEW_NATIVE_AVAILABLE = true;
    }
  }
} catch (e) {
  console.log('[DashVoiceFAB] BlurView not available, using fallback');
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DashVoiceFloatingButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showWelcomeMessage?: boolean;
  style?: any;
}

const FAB_POSITION_KEY = '@dash_fab_position';
const FAB_SIZE = 60;
const DOUBLE_TAP_DELAY = 300; // ms

export const DashVoiceFloatingButton: React.FC<DashVoiceFloatingButtonProps> = ({
  position = 'bottom-right',
  showWelcomeMessage = false,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const [showTooltip, setShowTooltip] = useState(showWelcomeMessage);
  const [isDragging, setIsDragging] = useState(false);
  const [showQuickVoice, setShowQuickVoice] = useState(false);
  const [dashResponse, setDashResponse] = useState<string>('');
  
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const tooltipAnimation = useRef(new Animated.Value(0)).current;
  const voiceAnimation = useRef(new Animated.Value(0)).current;
  
  const pan = useRef(new Animated.ValueXY()).current;
  const lastTap = useRef<number>(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Voice interaction hook
  const {
    recordingState,
    startRecording,
    stopRecording,
    speak,
    isSpeaking,
    stopSpeaking,
    hasPermission,
    requestPermission,
    preferredLanguage,
  } = useVoiceInteraction();

  // Load saved position on mount
  useEffect(() => {
    loadSavedPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedPosition = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAB_POSITION_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        pan.setValue({ x, y });
      } else {
        pan.setValue(getInitialPosition());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingState.isRecording]);

  // Ensure a conversation exists and Dash is initialized
  const ensureConversation = async (): Promise<string | null> => {
    try {
      const dash = DashAIAssistant.getInstance();
      try { await dash.initialize(); } catch {}
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check permissions
      if (hasPermission === false) {
        const granted = await requestPermission();
        if (!granted) {
          // Fallback to full modal if no mic permission
          router.push('/screens/dash-assistant');
          return;
        }
      }

      // Make sure a conversation exists to receive the response
      await ensureConversation();

      // Show quick voice interface
      setShowQuickVoice(true);

      // Start recording
      await startRecording();
    } catch (error) {
      console.error('[DashVoiceFAB] Single tap failed:', error);
      // Fallback to full modal
      router.push('/screens/dash-assistant');
    }
  };

  const handleDoubleTap = () => {
    if (isDragging) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Stop any ongoing voice interaction
    if (recordingState.isRecording) {
      stopRecording();
    }
    if (isSpeaking) {
      stopSpeaking();
    }
    setShowQuickVoice(false);
    
    // Open full Dash modal
    router.push('/screens/dash-assistant');
  };

  const handleVoiceComplete = async () => {
    try {
      // Stop recording and get audio URI
      const audioUri = await stopRecording();
      
      if (!audioUri) {
        setShowQuickVoice(false);
        return;
      }

      // Ensure we have an active conversation
      const dash = DashAIAssistant.getInstance();
      let convId = await ensureConversation();

      // Send voice message end-to-end (transcribes + responds)
      let response: any = null;
      try {
        response = await dash.sendVoiceMessage(audioUri, convId || undefined);
      } catch (e: any) {
        if (String(e?.message || '').includes('No active conversation')) {
          convId = await dash.startNewConversation('Quick Voice');
          response = await dash.sendVoiceMessage(audioUri, convId || undefined);
        } else {
          throw e;
        }
      }
      
      if (response && response.content) {
        setDashResponse(response.content);
        
        // Speak the response using Dash's TTS (South African English by default)
        try {
          await dash.speakResponse(response);
        } catch (speakErr) {
          console.warn('[DashVoiceFAB] speakResponse failed, falling back to hook speak:', speakErr);
          await speak(response.content, preferredLanguage);
        }
      }

      // Close after speaking
      setTimeout(() => {
        setShowQuickVoice(false);
        setDashResponse('');
      }, 1000);
    } catch (error) {
      console.error('[DashVoiceFAB] Voice complete failed:', error);
      setShowQuickVoice(false);
      try { router.push('/screens/dash-assistant'); } catch {}
    }
  };

  // Placeholder transcription function - replace with actual implementation
  const transcribeAudio = async (uri: string): Promise<string | null> => {
    // TODO: Call your transcription service here
    // This is where you'd integrate with Azure Speech-to-Text or OpenAI Whisper
    console.log('[DashVoiceFAB] Transcribing audio:', uri);
    return "Hello Dash"; // Placeholder
  };

  const handlePress = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap.current;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      handleDoubleTap();
    } else {
      // Potential single tap - wait to see if another tap comes
      lastTap.current = now;
      tapTimer.current = setTimeout(() => {
        handleSingleTap();
        tapTimer.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
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
        if (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10) {
          setIsDragging(true);
          if (showTooltip) setShowTooltip(false);
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(_, gesture);
      },
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        handlePressOut();

        // Save position
        // @ts-ignore
        const x = pan.x._value;
        // @ts-ignore
        const y = pan.y._value;
        savePosition(x, y);

        // If barely moved, treat as tap
        if (!isDragging && Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          handlePress();
        }

        setTimeout(() => setIsDragging(false), 100);
      },
    })
  ).current;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating Action Button */}
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
                : theme.colors.primary || '#007AFF',
              shadowColor: recordingState.isRecording ? '#FF3B30' : theme.colors.primary || '#007AFF',
            },
          ]}
        >
          {recordingState.isRecording ? (
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
        {showTooltip && (
          <Animated.View
            style={[
              styles.tooltip,
              {
                opacity: tooltipAnimation,
                backgroundColor: isDark ? '#2C2C2E' : '#FFF',
              },
            ]}
          >
            <Text style={[styles.tooltipText, { color: theme.colors.text }]}>
              Tap to speak • Double-tap for chat
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* Quick Voice Interaction Modal */}
      <Modal
        visible={showQuickVoice}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (recordingState.isRecording) {
            stopRecording();
          }
          setShowQuickVoice(false);
        }}
      >
        <View style={styles.modalOverlay}>
          {BlurView && BLURVIEW_NATIVE_AVAILABLE ? (
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]} />
          )}
          
          <View style={[styles.voiceContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
            {/* Recording Indicator */}
            {recordingState.isRecording && (
              <View style={styles.recordingSection}>
                <Animated.View
                  style={[
                    styles.recordingPulse,
                    {
                      opacity: voiceAnimation,
                      transform: [
                        {
                          scale: voiceAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.recordingDot} />
                </Animated.View>
                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                  Listening...
                </Text>
                <Text style={[styles.durationText, { color: theme.colors.textSecondary }]}>
                  {formatDuration(recordingState.duration)}
                </Text>
                <TouchableOpacity
                  style={[styles.stopButton, { backgroundColor: '#FF3B30' }]}
                  onPress={handleVoiceComplete}
                >
                  <Ionicons name="stop" size={24} color="#FFF" />
                  <Text style={styles.stopButtonText}>Stop & Send</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Speaking Indicator */}
            {isSpeaking && (
              <View style={styles.speakingSection}>
                <View style={styles.speakingIcon}>
                  <Ionicons name="volume-high" size={48} color={theme.colors.primary} />
                </View>
                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                  Dash is speaking...
                </Text>
                {dashResponse && (
                  <Text style={[styles.responseText, { color: theme.colors.textSecondary }]}>
                    {dashResponse}
                  </Text>
                )}
              </View>
            )}

            {/* Instructions */}
            {!recordingState.isRecording && !isSpeaking && (
              <View style={styles.instructionsSection}>
                <Ionicons name="mic-circle" size={64} color={theme.colors.primary} />
                <Text style={[styles.statusText, { color: theme.colors.text }]}>
                  Starting...
                </Text>
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                if (recordingState.isRecording) stopRecording();
                if (isSpeaking) stopSpeaking();
                setShowQuickVoice(false);
              }}
            >
              <Ionicons name="close-circle" size={32} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    whiteSpace: 'nowrap',
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
