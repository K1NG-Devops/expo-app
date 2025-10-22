/**
 * Dash Voice Mode - Elegant ChatGPT-style Voice Interface
 * 
 * Full-screen voice conversation mode with:
 * - Holographic orb animation (Society 5.0 design)
 * - Real-time transcription (expo-speech-recognition + Whisper)
 * - Auto-speak responses (Azure TTS + expo-speech fallback)
 * - Clean, minimal UI
 * 
 * Architecture:
 * - Uses refactored hook (useDashVoiceSession-new) for session management
 * - Unified language synchronization
 * - Progressive TTS (speaks as sentences arrive)
 * - No phantom responses (manual start)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';
import type { IDashAIAssistant, DashMessage } from '@/services/dash-ai/DashAICompat';
import { useDashVoiceSession } from './dash-voice-mode/useDashVoiceSession-new';
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
  
  // Use refactored hook for session management
  const {
    status,
    partialTranscript,
    finalTranscript,
    aiPartial,
    aiFinal,
    errorMessage,
    audioLevel,
    languageProfile,
    startListening,
    stopListening,
    cancelAll,
    handleClose: sessionHandleClose,
    ready,
    isListening,
    isSpeaking,
    isThinking,
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
    await cancelAll();
  };
  
  // Start listening handler
  const handleStartListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await startListening();
  };
  
  // Early return if not visible
  if (!visible) return null;
  
  // Display transcript (show AI response while speaking, user transcript while listening)
  const displayTranscript = isSpeaking 
    ? (aiPartial || aiFinal) 
    : (partialTranscript || finalTranscript);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} animated={true} backgroundColor={isDark ? '#000' : '#fff'} />
      
      {/* Holographic Orb */}
      <DashVoiceOrb
        isListening={isListening}
        isSpeaking={isSpeaking}
        isThinking={isThinking}
        isMuted={false}
        audioLevel={audioLevel}
      />
      
      {/* Status and Transcript Display */}
      <DashVoiceStatus
        status={status}
        partialTranscript={displayTranscript}
        finalTranscript={displayTranscript}
        errorMessage={errorMessage}
      />
      
      {/* Control Buttons */}
      <DashVoiceControls
        isMuted={false}
        canStop={isSpeaking || isListening}
        onToggleMute={status === 'idle' ? handleStartListening : stopListening}
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
