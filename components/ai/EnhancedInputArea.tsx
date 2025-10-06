/**
 * EnhancedInputArea Component
 * 
 * Modern input with multi-line auto-expand, attachments, and voice button.
 * Tier-aware gating for attachments.
 */

import React, { useMemo, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCapability } from '@/hooks/useCapability';
import type { DashAttachment } from '@/services/DashAIAssistant';
import type { VoiceState } from '@/hooks/useVoiceController';
import { UpgradePromptModal } from './UpgradePromptModal';
import {
  pickDocuments,
  pickImages,
  uploadAttachment,
  formatFileSize,
} from '@/services/AttachmentService';

export interface EnhancedInputAreaProps {
  placeholder?: string;
  sending?: boolean;
  onSend: (text: string, attachments: DashAttachment[]) => Promise<void> | void;
  onAttachmentsChange?: (attachments: DashAttachment[]) => void;
  onVoiceStart?: () => void; // When user presses down on mic
  onVoiceEnd?: () => void;   // When user releases mic (send)
  onVoiceLock?: () => void;  // When user locks recording
  onVoiceCancel?: () => void; // When user cancels recording
  voiceState?: VoiceState;
  isVoiceLocked?: boolean;
  voiceTimerMs?: number;
}

export function EnhancedInputArea({ placeholder = 'Message Dash...', sending = false, onSend, onAttachmentsChange, onVoiceStart, onVoiceEnd, onVoiceLock, onVoiceCancel, voiceState, isVoiceLocked, voiceTimerMs }: EnhancedInputAreaProps) {
  // Stable JS callbacks for use with runOnJS to avoid inline closures
  const onVoiceStartJS = React.useCallback(() => {
    try { onVoiceStart?.(); } catch (e) { console.error('Voice start error:', e); }
  }, [onVoiceStart]);

  const onVoiceEndJS = React.useCallback(() => {
    try { onVoiceEnd?.(); } catch (e) { console.error('Voice end error:', e); }
  }, [onVoiceEnd]);

  const onVoiceLockJS = React.useCallback(() => {
    try { onVoiceLock?.(); } catch (e) { console.error('Voice lock error:', e); }
  }, [onVoiceLock]);
  const { theme, isDark } = useTheme();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<DashAttachment[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { can, tier } = useCapability();

  const canImages = can('multimodal.vision');
  const canDocs = can('multimodal.documents');
  
  const hasContent = text.trim().length > 0;

  // WhatsApp-style gesture state for mic interactions
  const [isGestureRecording, setIsGestureRecording] = useState(false);
  const [hasTriggeredLock, setHasTriggeredLock] = useState(false);
  const translateY = useSharedValue(0);

  const LOCK_THRESHOLD = -100; // WhatsApp-style threshold (same as your example)

  // Reset lock trigger when voice state changes
  React.useEffect(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      setHasTriggeredLock(false);
    }
  }, [voiceState]);

  const onVoiceLockJSInternal = React.useCallback(() => {
    setHasTriggeredLock(true);
    onVoiceLockJS();
  }, [onVoiceLockJS]);

  // Gesture handler for WhatsApp-style swipe-up-lock
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      translateY.value = 0;
      runOnJS(setIsGestureRecording)(true);
      runOnJS(onVoiceStartJS)();
    },
    onActive: (event) => {
      // Don't process further gestures if already locked
      if (isVoiceLocked) return;
      
      // Track upward swipe
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
      
      // Trigger lock when threshold crossed
      if (event.translationY < LOCK_THRESHOLD) {
        translateY.value = withSpring(0);
        runOnJS(onVoiceLockJSInternal)();
      }
    },
    onEnd: () => {
      if (isVoiceLocked) {
        // Keep recording, don't release
        translateY.value = withSpring(0);
      } else {
        // Release and send
        runOnJS(onVoiceEndJS)();
      }
      runOnJS(setIsGestureRecording)(false);
    },
  });

  const addAttachments = (items: DashAttachment[]) => {
    const next = [...attachments, ...items];
    setAttachments(next);
    onAttachmentsChange?.(next);
  };

  const handlePickImages = async () => {
    if (!canImages) {
      setShowUpgrade(true);
      return;
    }
    const picked = await pickImages();
    if (picked?.length) addAttachments(picked);
  };

  const handlePickDocs = async () => {
    if (!canDocs) {
      setShowUpgrade(true);
      return;
    }
    const picked = await pickDocuments();
    if (picked?.length) addAttachments(picked);
  };

  const handleSend = async () => {
    const message = text.trim();
    if (!message && attachments.length === 0) return;
    await onSend(message, attachments);
    setText('');
    setAttachments([]);
    onAttachmentsChange?.([]);
  };

  // Animated styles for WhatsApp-style feedback
  const animatedButtonStyles = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Animated lock icon that follows finger
  const animatedLockStyles = useAnimatedStyle(() => {
    const opacity = translateY.value < 0 ? Math.min(1, Math.abs(translateY.value) / 50) : 0;
    const scale = translateY.value < LOCK_THRESHOLD ? 1.2 : 1;
    return {
      opacity,
      transform: [
        { translateY: Math.max(translateY.value, -120) },
        { scale },
      ],
    };
  });

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: isDark ? '#0b0f14' : '#fff' }]}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={handlePickImages} style={[styles.iconButton]}> 
          <Ionicons name="image-outline" size={20} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickDocs} style={[styles.iconButton]}> 
          <Ionicons name="document-text-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[styles.input, { color: theme.text }]}
        />
        
        {/* Send/Mic toggle button */}
        {hasContent ? (
          <TouchableOpacity 
            disabled={sending} 
            onPress={handleSend} 
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
          > 
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ position: 'relative' }}>
            {/* Floating lock icon that appears on swipe up */}
            {(isGestureRecording || voiceState === 'listening') && !isVoiceLocked && (
              <Animated.View 
                style={[
                  styles.floatingLock,
                  { backgroundColor: theme.surface },
                  animatedLockStyles
                ]}
                pointerEvents="none"
              >
                <Ionicons 
                  name="lock-closed" 
                  size={24} 
                  color={theme.textSecondary} 
                />
                <View style={[styles.lockArrow, { borderTopColor: theme.textSecondary }]} />
              </Animated.View>
            )}
            
            <PanGestureHandler onGestureEvent={gestureHandler} enabled={!isVoiceLocked}>
              <Animated.View style={[styles.actionButton, { backgroundColor: isGestureRecording || voiceState === 'listening' ? theme.error : theme.accent }, animatedButtonStyles]}>
                <Ionicons name="mic" size={20} color="#fff" />
              </Animated.View>
            </PanGestureHandler>
          </View>
        )}
      </View>

      {/* Recording indicator - WhatsApp style */}
      {(isGestureRecording || voiceState === 'listening') && !isVoiceLocked && (
        <View style={styles.recordingIndicator}>
          <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
          <Text style={[styles.recordingText, { color: theme.text }]}>
            Recording... {Math.floor((voiceTimerMs || 0) / 1000)}s
          </Text>
          {/* WhatsApp-style swipe up to lock hint */}
          <View style={styles.gestureHintRow}>
            <Ionicons name="chevron-up" size={14} color={theme.textSecondary} />
            <Text style={[styles.recordingHint, { color: theme.textSecondary }]}>Slide up to lock</Text>
          </View>
        </View>
      )}

      {/* Locked indicator pill */}
      {isVoiceLocked && (
        <View style={styles.lockedPill}>
          <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
          <Text style={[styles.lockedPillText, { color: theme.textSecondary }]}>Recording Locked</Text>
        </View>
      )}

      {/* Locked controls - show when recording is locked */}
      {isVoiceLocked && voiceState && (voiceState === 'prewarm' || voiceState === 'listening') && (
        <View style={styles.lockedRow}>
          <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
          <View style={[styles.timerPill, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.timerText, { color: theme.text }]}>
              {Math.floor((voiceTimerMs || 0) / 1000)}s
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          {/* Delete/Cancel */}
          <TouchableOpacity 
            style={[styles.lockedAction, { backgroundColor: theme.error }]}
            onPress={onVoiceCancel}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={[styles.lockedActionText, { color: '#fff' }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          {/* Stop button (ends recording without needing to release gesture) */}
          <TouchableOpacity 
            style={[styles.lockedAction, { backgroundColor: theme.accent }]}
            onPress={onVoiceEnd}
          >
            <Ionicons name="stop" size={16} color="#fff" />
            <Text style={[styles.lockedActionText, { color: '#fff' }]}>Stop</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          {/* Send */}
          <TouchableOpacity 
            style={[styles.lockedAction, { backgroundColor: theme.primary }]}
            onPress={onVoiceEnd}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={[styles.lockedActionText, { color: '#fff' }]}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      <UpgradePromptModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentTier={tier}
        requiredTier={'premium'}
        capability={!canImages ? 'multimodal.vision' : 'multimodal.documents'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(127,127,127,0.08)',
    fontSize: 15,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gestureHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  recordingHint: {
    fontSize: 11,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  lockedPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(127,127,127,0.12)'
  },
  lockedPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lockedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  lockedActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  floatingLock: {
    position: 'absolute',
    bottom: 50,
    left: '50%',
    marginLeft: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lockArrow: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
