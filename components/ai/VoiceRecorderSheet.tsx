import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import { useTheme } from '@/contexts/ThemeContext';

interface VoiceRecorderSheetProps {
  visible: boolean;
  onClose: () => void;
  dash: DashAIAssistant;
  onSend: (audioUri: string, transcript: string, duration: number) => Promise<void>;
}

export const VoiceRecorderSheet: React.FC<VoiceRecorderSheetProps> = ({ visible, onClose, dash, onSend }) => {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<'recording' | 'processing' | 'preview'>('recording');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [timer, setTimer] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    const start = async () => {
      try {
        await dash.preWarmRecorder();
        await dash.startRecording();
        setPhase('recording');
        // Start timer
        timerRef.current = (setInterval(() => {
          setTimer((t) => t + 1);
        }, 1000) as unknown) as number;
        // Haptic feedback
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
        // Pulse anim
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1.0, duration: 800, useNativeDriver: true }),
          ])
        ).start();
      } catch (e) {
        console.error('[VoiceRecorderSheet] Failed to start recording', e);
        onClose();
      }
    };
    start();
    return () => { mounted = false; if (timerRef.current) clearInterval(timerRef.current as unknown as number); };
  }, [visible]);

  const stop = async () => {
    try {
      if (timerRef.current) { clearInterval(timerRef.current as unknown as number); timerRef.current = null; }
      setPhase('processing');
      const uri = await dash.stopRecording();
      setAudioUri(uri);
      const tr = await dash.transcribeOnly(uri);
      setTranscript(tr.transcript || '');
      setDuration(tr.duration || 0);
      setPhase('preview');
    } catch (e) {
      console.error('[VoiceRecorderSheet] Failed to stop/ transcribe', e);
      onClose();
    }
  };

  const send = async () => {
    if (!audioUri) return;
    setSending(true);
    try {
      await onSend(audioUri, transcript, duration);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      onClose();
    } catch (e) {
      console.error('[VoiceRecorderSheet] Send failed', e);
      setSending(false);
    }
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.sheet, { backgroundColor: theme.elevated }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {phase === 'recording' ? 'Listening…' : phase === 'processing' ? 'Transcribing…' : 'Preview'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {phase === 'recording' && (
            <View style={styles.center}>
              <Animated.View style={[styles.micCircle, { backgroundColor: theme.error, transform: [{ scale: pulse }] }]}> 
                <Ionicons name="mic" size={32} color={theme.onError || '#fff'} />
              </Animated.View>
              <Text style={[styles.timer, { color: theme.textSecondary }]}>{mm}:{ss}</Text>
              <TouchableOpacity style={[styles.bigStop, { backgroundColor: theme.error }]} onPress={stop} accessibilityLabel="Stop recording">
                <Ionicons name="stop" size={26} color={theme.onError || '#fff'} />
              </TouchableOpacity>
            </View>
          )}

          {phase === 'processing' && (
            <View style={styles.center}>
              <Text style={[styles.processingText, { color: theme.text }]}>
                Transcribing your voice note…
              </Text>
            </View>
          )}

          {phase === 'preview' && (
            <View style={styles.preview}>
              <Text style={[styles.previewText, { color: theme.text }]}>{transcript || 'No speech detected.'}</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose}>
                  <Ionicons name="trash-outline" size={18} color={theme.onPrimary || '#fff'} />
                  <Text style={[styles.actionText, { color: theme.onPrimary || '#fff' }]}>Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.sendBtn]} onPress={send} disabled={sending}>
                  <Ionicons name="arrow-up" size={18} color={theme.onPrimary || '#fff'} />
                  <Text style={[styles.actionText, { color: theme.onPrimary || '#fff' }]}>{sending ? 'Sending…' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, minHeight: 260 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  micCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  timer: { marginTop: 12, fontSize: 16 },
  bigStop: { width: 64, height: 64, borderRadius: 32, marginTop: 18, alignItems: 'center', justifyContent: 'center' },
  processingText: { fontSize: 15 },
  preview: { paddingVertical: 12 },
  previewText: { fontSize: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  cancelBtn: { backgroundColor: '#6b7280' },
  sendBtn: { backgroundColor: '#2563eb' },
  actionText: { fontWeight: '600' },
});

export default VoiceRecorderSheet;
