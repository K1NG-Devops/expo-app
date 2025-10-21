/**
 * Dash AI Voice-Enabled Floating Action Button
 * 
 * @status ACTIVE - Primary FAB component in use
 * @location app/_layout.tsx (currently deployed)
 * 
 * This is the main floating action button with voice AI capabilities.
 * Features:
 * - Single tap: Opens full Dash Assistant chat interface
 * - Long press: Opens elegant voice mode (DashVoiceMode) for hands-free interaction
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

import React from 'react';
import { View, Animated, StyleSheet, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useVoiceInteraction } from '@/lib/voice';
import { DashSpeakingOverlay } from '@/components/ai/DashSpeakingOverlay';
import { useVoiceUI } from '@/components/voice/VoiceUIController';
import { useFABAnimations } from '@/hooks/useFABAnimations';
import { useFABDragGesture } from '@/hooks/useFABDragGesture';
import { useFABVoiceActivation } from '@/hooks/useFABVoiceActivation';
import { FAB_SIZE } from '@/lib/fab-position';


const { width: screenWidth } = Dimensions.get('window');

interface DashVoiceFloatingButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showWelcomeMessage?: boolean;
  style?: any;
}

const HOLD_TO_TALK = true; // long-press press-and-hold streaming

export const DashVoiceFloatingButton: React.FC<DashVoiceFloatingButtonProps> = ({
  position = 'bottom-right',
  showWelcomeMessage = false,
  style,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const voiceUI = useVoiceUI();

  const { recordingState, isSpeaking, stopSpeaking } = useVoiceInteraction();
  const { scaleAnimation, pulseAnimation, voiceAnimation } = useFABAnimations(recordingState.isRecording);
  const { pan, panHandlers, isDraggingRef } = useFABDragGesture(position);
  const { isLoading, handleSingleTap, handlePressIn, handlePressOut } = useFABVoiceActivation();

  const onTap = () => {
    if (!isDraggingRef.current) handleSingleTap();
  };

  return (
    <>
      {/* Floating Action Button */}
      {!voiceUI.isOpen && (
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
          {...panHandlers}
        >
          <View
            style={[
              styles.button,
              {
                backgroundColor: recordingState.isRecording ? '#FF3B30' : theme.primary || '#007AFF',
                shadowColor: recordingState.isRecording ? '#FF3B30' : theme.primary || '#007AFF',
              },
            ]}
            onTouchStart={() => handlePressIn(scaleAnimation)}
            onTouchEnd={() => handlePressOut(scaleAnimation)}
            onTouchCancel={() => handlePressOut(scaleAnimation)}
            onStartShouldSetResponder={() => true}
            onResponderRelease={onTap}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : recordingState.isRecording ? (
              <Animated.View style={{ opacity: voiceAnimation }}>
                <Ionicons name="mic" size={28} color="#FFF" />
              </Animated.View>
            ) : isSpeaking ? (
              <Ionicons name="volume-high" size={28} color="#FFF" />
            ) : (
              <Ionicons name="sparkles" size={28} color="#FFF" />
            )}
          </View>
        </Animated.View>
      )}

      {/* Global speaking overlay - shows when Dash is speaking */}
      <DashSpeakingOverlay
        isSpeaking={isSpeaking}
        onStopSpeaking={() => {
          stopSpeaking();
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
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
