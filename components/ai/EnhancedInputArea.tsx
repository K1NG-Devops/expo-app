/**
 * EnhancedInputArea Component
 * 
 * Modern input with multi-line auto-expand, attachments, and voice button.
 * Tier-aware gating for attachments.
 */

import React, { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCapability } from '@/hooks/useCapability';
import type { DashAttachment } from '@/services/DashAIAssistant';
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
  onVoiceEnd?: () => void;   // When user releases mic
  onVoiceLock?: () => void;  // When user long-presses to lock
}

export function EnhancedInputArea({ placeholder = 'Message Dash...', sending = false, onSend, onAttachmentsChange, onVoiceStart, onVoiceEnd, onVoiceLock }: EnhancedInputAreaProps) {
  const { theme, isDark } = useTheme();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<DashAttachment[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { can, tier } = useCapability();

  const canImages = can('multimodal.vision');
  const canDocs = can('multimodal.documents');
  
  const hasContent = text.trim().length > 0;

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
          <TouchableOpacity 
            onPressIn={onVoiceStart}  // Start recording when pressed
            onPressOut={() => { setTimeout(() => onVoiceEnd?.(), 180); }}   // Slight delay to allow start
            onLongPress={onVoiceLock}
            delayLongPress={300}
            activeOpacity={0.8}
            style={[styles.actionButton, { backgroundColor: theme.accent }]}
          > 
            <Ionicons name="mic" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

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
});
