/**
 * EnhancedInputArea Component
 * 
 * Modern input with multi-line auto-expand, attachments, and voice button.
 * Tier-aware gating for attachments.
 */

import React, { useMemo, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform, Animated, PanResponder } from 'react-native';
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
  onVoiceLock?: () => void;  // When user locks
  onVoiceCancel?: () => void; // When user slides left to cancel
  voiceState?: VoiceState;
  isVoiceLocked?: boolean;
  voiceTimerMs?: number;
}

export function EnhancedInputArea({ placeholder = 'Message Dash...', sending = false, onSend, onAttachmentsChange, onVoiceStart, onVoiceEnd, onVoiceLock, onVoiceCancel, voiceState, isVoiceLocked, voiceTimerMs }: EnhancedInputAreaProps) {
  const { theme, isDark } = useTheme();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<DashAttachment[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { can, tier } = useCapability();

  const canImages = can('multimodal.vision');
  const canDocs = can('multimodal.documents');
  
  const hasContent = text.trim().length > 0;

  // Gesture state for WhatsApp-like mic interactions
  const [gestureActive, setGestureActive] = useState(false);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const CANCEL_THRESHOLD = -80; // slide left to cancel
  const LOCK_THRESHOLD = -80;   // slide up to lock

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setGestureActive(true);
        setDx(0); setDy(0);
        try { onVoiceStart?.(); } catch {}
      },
      onPanResponderMove: (_, gesture) => {
        setDx(gesture.dx);
        setDy(gesture.dy);
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: () => {
        // Decide action based on gesture
        if (dx < CANCEL_THRESHOLD) {
          try { onVoiceCancel?.(); } catch {}
        } else if (dy < LOCK_THRESHOLD) {
          try { onVoiceLock?.(); } catch {}
        } else {
          try { onVoiceEnd?.(); } catch {}
        }
        setGestureActive(false);
        setDx(0); setDy(0);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderTerminate: () => {
        // Treat as cancel on interruption
        try { onVoiceCancel?.(); } catch {}
        setGestureActive(false);
        setDx(0); setDy(0);
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

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
          <Animated.View {...panResponder.panHandlers}>
            <View 
              style={[styles.actionButton, { backgroundColor: theme.accent, position: 'relative' }]}
            > 
              <Ionicons name="mic" size={20} color="#fff" />
            </View>
          </Animated.View>
        )}
      </View>

      {/* Gesture hints when recording */}
      {gestureActive && voiceState && (voiceState === 'prewarm' || voiceState === 'listening') && (
        <View style={styles.gestureHints}>
          <View style={styles.hintRow}>
            <Ionicons name="chevron-up" size={18} color={theme.textSecondary} />
            <Text style={[styles.hintText, { color: theme.textSecondary }]}>Slide up to lock</Text>
          </View>
          <View style={[styles.hintRow, { marginTop: 6 }]}>
            <Ionicons name="chevron-back" size={18} color={theme.error} />
            <Text style={[styles.hintText, { color: theme.error }]}>Slide left to cancel</Text>
          </View>
        </View>
      )}

      {/* Locked controls (show when locked) */}
      {isVoiceLocked && (
        <View style={styles.lockedRow}>
          <View style={styles.timerPill}>
            <Text style={[styles.timerText, { color: theme.text }]}>
              {Math.floor((voiceTimerMs || 0) / 1000)}s
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={[styles.lockedAction, { backgroundColor: theme.error }]}
            onPress={onVoiceCancel}
          >
            <Ionicons name="trash" size={16} color={theme.onError || '#fff'} />
            <Text style={[styles.lockedActionText, { color: theme.onError || '#fff' }]}>Delete</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={[styles.lockedAction, { backgroundColor: theme.primary }]}
            onPress={onVoiceEnd}
          >
            <Ionicons name="send" size={16} color={theme.onPrimary || '#fff'} />
            <Text style={[styles.lockedActionText, { color: theme.onPrimary || '#fff' }]}>Send</Text>
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
  gestureHints: {
    marginTop: 6,
    paddingHorizontal: 6,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timerPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(127,127,127,0.12)',
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
});
