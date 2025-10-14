import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DashAIAssistant } from '@/services/DashAIAssistant';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface VoiceRecorderSheetProps {
  visible: boolean;
  onClose: () => void;
  dash: DashAIAssistant;
  onSend: (audioUri: string, transcript: string, duration: number) => Promise<void>;
}

export const VoiceRecorderSheet: React.FC<VoiceRecorderSheetProps> = ({ visible, onClose, dash, onSend }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'recording' | 'processing' | 'preview' | 'error'>('recording');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [timer, setTimer] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressPhase, setProgressPhase] = useState<string>(t('voice.recording.starting', { defaultValue: 'Preparing...' }));
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      resetState();
      return;
    }
    
    let mounted = true;
    const start = async () => {
      try {
        // Reset state before starting new recording
        resetState();
        
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
    return () => { 
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current as unknown as number);
        timerRef.current = null;
      }
      // Stop any ongoing recording when unmounting
      if (phase === 'recording') {
        try {
          dash.stopRecording().catch(() => {});
        } catch {}
      }
    };
  }, [visible]);

  const stop = async () => {
    try {
      if (timerRef.current) { clearInterval(timerRef.current as unknown as number); timerRef.current = null; }
      setPhase('processing');
      setError(null);
      setProgressPhase(t('voice.recording.stopping_recording', { defaultValue: 'Stopping recording...' }));
      setProgressPercent(10);
      
      const uri = await dash.stopRecording();
      setAudioUri(uri);
      
      // Transcribe with progress updates
      const tr = await dash.transcribeOnly(uri, (stage, percent) => {
        setProgressPercent(percent);
        switch (stage) {
          case 'validating':
            setProgressPhase(t('voice.recording.validating_audio', { defaultValue: 'Validating audio...' }));
            break;
          case 'uploading':
            setProgressPhase(t('voice.recording.uploading_cloud', { defaultValue: 'Uploading to cloud...' }));
            break;
          case 'transcribing':
            setProgressPhase(t('voice.recording.transcribing_speech', { defaultValue: 'Transcribing speech...' }));
            break;
          case 'complete':
            setProgressPhase(t('voice.recording.done', { defaultValue: 'Done!' }));
            break;
        }
      });
      
      setTranscript(tr.transcript || '');
      setDuration(tr.duration || 0);
      
      // Check if transcription failed
      if (tr.error) {
        setError(tr.transcript); // User-friendly error message is in transcript
        setPhase('error');
      } else {
        setPhase('preview');
      }
    } catch (e) {
      console.error('[VoiceRecorderSheet] Failed to stop/transcribe', e);
      const errorMsg = e instanceof Error ? e.message : t('voice.recording.failed_process', { defaultValue: 'Failed to process voice recording' });
      setError(errorMsg);
      setPhase('error');
    }
  };

  const send = async () => {
    if (!audioUri || sending) return; // Prevent double-send
    setSending(true);
    try {
      await onSend(audioUri, transcript, duration);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      // Reset state before closing to ensure clean next open
      resetState();
      onClose();
    } catch (e) {
      console.error('[VoiceRecorderSheet] Send failed', e);
      const errorMsg = e instanceof Error ? e.message : t('voice.recording.failed_send', { defaultValue: 'Failed to send message' });
      setError(errorMsg);
      setPhase('error');
      setSending(false);
    }
  };
  
  // Helper to reset all state
  const resetState = () => {
    setPhase('recording');
    setAudioUri(null);
    setTranscript('');
    setTimer(0);
    setSending(false);
    setError(null);
    setProgressPhase(t('voice.recording.starting', { defaultValue: 'Preparing...' }));
    setProgressPercent(0);
    if (timerRef.current) {
      clearInterval(timerRef.current as unknown as number);
      timerRef.current = null;
    }
  };

  const retry = async () => {
    resetState();
    // Restart recording
    try {
      await dash.preWarmRecorder();
      await dash.startRecording();
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
      console.error('[VoiceRecorderSheet] Failed to retry recording', e);
      setError(e instanceof Error ? e.message : t('voice.errors.failed_start', { defaultValue: 'Failed to start recording' }));
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
              {phase === 'recording' ? t('voice.recording.listening', { defaultValue: 'Listening…' }) : phase === 'processing' ? t('voice.recording.transcribing', { defaultValue: 'Transcribing…' }) : t('voice.recording.preview', { defaultValue: 'Preview' })}
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
              <TouchableOpacity style={[styles.bigStop, { backgroundColor: theme.error }]} onPress={stop} accessibilityLabel={t('voice.recording.stop_recording_label', { defaultValue: 'Stop recording' })}>
                <Ionicons name="stop" size={26} color={theme.onError || '#fff'} />
              </TouchableOpacity>
            </View>
          )}

          {phase === 'processing' && (
            <View style={styles.center}>
              <Text style={[styles.processingText, { color: theme.text }]}>
                {progressPhase}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
              </View>
              <Text style={[styles.progressPercent, { color: theme.textSecondary }]}>
                {progressPercent}%
              </Text>
            </View>
          )}

          {phase === 'preview' && (
            <View style={styles.preview}>
              <Text style={[styles.previewText, { color: theme.text }]}>{transcript || t('voice.recording.no_speech_detected', { defaultValue: 'No speech detected.' })}</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose}>
                  <Ionicons name="trash-outline" size={18} color={theme.onPrimary || '#fff'} />
                  <Text style={[styles.actionText, { color: theme.onPrimary || '#fff' }]}>{t('voice.recording.discard', { defaultValue: 'Discard' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.sendBtn]} onPress={send} disabled={sending}>
                  <Ionicons name="arrow-up" size={18} color={theme.onPrimary || '#fff'} />
                  <Text style={[styles.actionText, { color: theme.onPrimary || '#fff' }]}>{sending ? t('voice.recording.sending', { defaultValue: 'Sending…' }) : t('voice.recording.send', { defaultValue: 'Send' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {phase === 'error' && (
            <View style={styles.preview}>
              <View style={[styles.errorBox, { backgroundColor: theme.errorLight || '#fee' }]}>
                <Ionicons name="alert-circle" size={32} color={theme.error} />
                <Text style={[styles.errorText, { color: theme.error }]}>{error || t('voice.recording.something_wrong', { defaultValue: 'Something went wrong' })}</Text>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose}>
                  <Ionicons name="close" size={18} color={theme.onPrimary || '#fff'} />
                  <Text style={[styles.actionText, { color: theme.onPrimary || '#fff' }]}>{t('cancel', { defaultValue: 'Cancel' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.retryBtn]} onPress={retry}>
                  <Ionicons name="refresh" size={18} color={theme.onPrimary || '#fff'} />
                  <Text style={[styles.actionText, { color: theme.onPrimary || '#fff' }]}>{t('voice.recording.try_again', { defaultValue: 'Try Again' })}</Text>
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
  processingText: { fontSize: 15, marginBottom: 16 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPercent: { marginTop: 8, fontSize: 13 },
  preview: { paddingVertical: 12 },
  previewText: { fontSize: 16, lineHeight: 24 },
  errorBox: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  errorText: { fontSize: 15, marginTop: 12, textAlign: 'center', lineHeight: 22 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  cancelBtn: { backgroundColor: '#6b7280' },
  sendBtn: { backgroundColor: '#2563eb' },
  retryBtn: { backgroundColor: '#ea580c' },
  actionText: { fontWeight: '600' },
});

export default VoiceRecorderSheet;
