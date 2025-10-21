/**
 * Dash Voice Mode - Elegant ChatGPT-style Voice Interface
 * 
 * Full-screen voice conversation mode with:
 * - Holographic orb animation (Society 5.0 design)
 * - Real-time transcription (Azure Speech SDK on mobile)
 * - Auto-speak responses
 * - Clean, minimal UI
 * 
 * Architecture:
 * - Uses custom hook (useDashVoiceSession) for session management
 * - Modular components for UI elements
 * - Azure Speech SDK on mobile (<1s init, ~98% reliability)
 * - Deepgram on web (handled in web branch)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { IDashAIAssistant, DashMessage } from '@/services/dash-ai/DashAICompat';
import { useDashVoiceSession } from './dash-voice-mode/useDashVoiceSession';
import { DashVoiceOrb } from './dash-voice-mode/DashVoiceOrb';
import { DashVoiceControls } from './dash-voice-mode/DashVoiceControls';
import { DashVoiceStatus } from './dash-voice-mode/DashVoiceStatus';
import * as Haptics from 'expo-haptics';

interface DashVoiceModeProps {
  visible: boolean;
  onClose: () => void;
  dashInstance: IDashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
  forcedLanguage?: string;
}

export const DashVoiceMode: React.FC<DashVoiceModeProps> = ({ 
  visible, 
  onClose, 
  dashInstance,
  onMessageSent,
  forcedLanguage
}) => {
  const { isDark } = useTheme();
  
  // Use custom hook for session management
  const {
    ready,
    isConnected,
    speaking,
    errorMessage,
    userTranscript,
    aiResponse,
    handleClose: sessionHandleClose,
    toggleMute,
    muted,
    thinking,
  } = useDashVoiceSession({
    visible,
    dashInstance,
    onMessageSent,
    forcedLanguage,
  });
  
  // Close handler
  const handleClose = async () => {
    await sessionHandleClose();
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onClose();
  };
  
  // Stop handler
  const handleStop = async () => {
    try { 
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
    } catch {}
    await dashInstance?.stopSpeaking?.();
  };
  
  // Early return if not visible
  if (!visible) return null;
  
  // Compute UI state
  const isListening = ready && isConnected && !speaking;
  const isThinking = !ready || !isConnected;
  
  // Determine status for UI
  const getStatus = (): 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' => {
    if (errorMessage) return 'error';
    if (speaking) return 'speaking';
    if (thinking) return 'thinking';
    if (isListening) return 'listening';
    if (isThinking) return 'thinking';
    return 'idle';
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Holographic Orb */}
      <DashVoiceOrb
        isListening={isListening}
        isSpeaking={speaking}
        isThinking={isThinking}
        isMuted={muted}
      />
      
      {/* Status and Transcript Display */}
      <DashVoiceStatus
        status={getStatus()}
        partialTranscript={userTranscript}
        finalTranscript={aiResponse}
        errorMessage={errorMessage}
      />
      
      {/* Control Buttons */}
      <DashVoiceControls
        isMuted={muted}
        canStop={speaking}
        onToggleMute={toggleMute}
        onStop={handleStop}
        onClose={handleClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    zIndex: 9999,
  },
});
