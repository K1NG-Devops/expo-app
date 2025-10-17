/**
 * AssistantMicModal
 *
 * A minimal, stable microphone modal that records speech-to-text using
 * @react-native-voice/voice. Keeps UI simple to avoid freezes:
 * - Start/Stop mic
 * - Editable transcript TextInput
 * - Send and Close actions
 *
 * This intentionally avoids reanimated gestures, complex animations,
 * and controller indirection to maximize reliability.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
  SpeechRecognizedEvent,
} from '@react-native-voice/voice';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface AssistantMicModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<void> | void;
}

export default function AssistantMicModal({ visible, onClose, onSend }: AssistantMicModalProps) {
  const { theme } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean>(true);

  // Initialize listeners once
  useEffect(() => {
    try {
      Voice.onSpeechStart = (_e: SpeechStartEvent) => {
        setIsListening(true);
        setError(null);
      };
      Voice.onSpeechEnd = (_e: SpeechEndEvent) => {
        setIsListening(false);
      };
      Voice.onSpeechRecognized = (_e: SpeechRecognizedEvent) => {
        // no-op
      };
      Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          setPartial(e.value[0]);
        }
      };
      Voice.onSpeechResults = (e: SpeechResultsEvent) => {
        if (e.value && e.value.length > 0) {
          const t = e.value[0];
          setFinalText(t);
          setPartial('');
        }
      };
      Voice.onSpeechError = (e: SpeechErrorEvent) => {
        const msg = e.error?.message || 'Speech recognition error';
        setError(msg);
        setIsListening(false);
      };

      if (typeof (Voice as any).isAvailable === 'function') {
        (Voice as any).isAvailable()
          .then((available: number) => setVoiceAvailable(available === 1))
          .catch(() => setVoiceAvailable(false));
      }
    } catch {
      setVoiceAvailable(false);
    }

    return () => {
      try {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
      } catch {}
    };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setIsListening(false);
      setPartial('');
      setFinalText('');
      setError(null);
      setSending(false);
    }
  }, [visible]);

  const composedText = useMemo(() => {
    const t = finalText || partial;
    return t.trim();
  }, [finalText, partial]);

  const start = async () => {
    try {
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await Voice.start('en-ZA');
      setIsListening(true);
    } catch (e: any) {
      setError('Failed to start microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const stop = async () => {
    try {
      await Voice.stop();
    } catch {}
  };

  const cancel = async () => {
    try {
      await Voice.cancel();
    } catch {}
    setIsListening(false);
    setPartial('');
  };

  const handleSend = async () => {
    const text = composedText;
    if (!text) {
      onClose();
      return;
    }
    try {
      setSending(true);
      await onSend(text);
      onClose();
    } catch (e) {
      setError('Failed to send. Please try again.');
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.headerBtn, { backgroundColor: theme.error }]} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={[styles.title, { color: theme.text }]}>Voice Note</Text>

            <TouchableOpacity onPress={handleSend} disabled={sending} style={[styles.headerBtn, { backgroundColor: theme.primary, opacity: sending ? 0.6 : 1 }]} accessibilityLabel="Send">
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          {/* Transcript input */}
          <View style={[styles.body, { backgroundColor: theme.surface }]}>
            {!voiceAvailable && Platform.OS === 'web' ? (
              <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
                Voice capture is not available on web in this build. Type your message below.
              </Text>
            ) : null}

            <TextInput
              value={composedText}
              onChangeText={(t) => { setFinalText(t); setPartial(''); }}
              placeholder="Speak or type your message..."
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            />

            {!!error && (
              <Text style={{ color: theme.error, marginTop: 6 }}>{error}</Text>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={isListening ? stop : start}
              style={[styles.micBtn, { backgroundColor: isListening ? theme.error : theme.primary }]}
              disabled={!voiceAvailable && Platform.OS !== 'web'}
              accessibilityLabel={isListening ? 'Stop' : 'Start'}
            >
              <Ionicons name={isListening ? 'stop' : 'mic'} size={26} color="#fff" />
            </TouchableOpacity>
            {isListening && (
              <TouchableOpacity onPress={cancel} style={[styles.cancelBtn, { borderColor: theme.border }]} accessibilityLabel="Cancel recording">
                <Ionicons name="trash" size={18} color={theme.error} />
                <Text style={{ color: theme.error, marginLeft: 6, fontWeight: '600' }}>Discard</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    marginTop: 12,
  },
  textarea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    textAlignVertical: 'top',
  },
  controls: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
