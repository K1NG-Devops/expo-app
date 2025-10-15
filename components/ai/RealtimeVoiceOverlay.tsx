import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PanResponder, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  visible: boolean;
  onClose: () => void;
  onFallback?: () => void; // called when streaming is unavailable
}

export const RealtimeVoiceOverlay: React.FC<Props> = ({ visible, onClose, onFallback }) => {
  const { theme } = useTheme();
  const [partial, setPartial] = useState('');
  const [assistant, setAssistant] = useState('');
  const [ready, setReady] = useState(false);
  const [prefEnabled, setPrefEnabled] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => { (async () => {
    try {
      const v = await AsyncStorage.getItem('@dash_streaming_enabled');
      setPrefEnabled(v === 'true');
    } catch {}
  })(); }, []);

  const envEnabled = String(process.env.EXPO_PUBLIC_DASH_STREAMING || '').toLowerCase() === 'true';
  const streamingEnabled = envEnabled || prefEnabled;

  const realtime = useRealtimeVoice({
    enabled: streamingEnabled,
    onPartialTranscript: (t) => setPartial(String(t || '')),
    onFinalTranscript: (t) => setPartial(String(t || '')),
    onAssistantToken: (tok) => setAssistant((p) => (p + String(tok || ''))),
    onStatusChange: (s) => {
      if (s === 'error' && visible) {
        try { onFallback?.(); } catch {}
      }
    },
  });

  // Start streaming when becoming visible
  useEffect(() => {
    (async () => {
      if (!visible) { return; }
      setAssistant(''); setPartial('');
      setReady(false);
      if (!streamingEnabled) { onFallback?.(); return; }
      const ok = await realtime.startStream();
      setReady(ok);
      if (!ok) { onFallback?.(); }
    })();
    // stop on hide
    return () => { try { realtime.stopStream(); } catch {} };
  }, [visible, streamingEnabled]);

  // Draggable pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value,
          // @ts-ignore
          y: pan.y._value,
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>{ready ? 'Listening…' : 'Connecting…'}</Text>
          {!!partial && (
            <Text numberOfLines={2} style={[styles.partial, { color: theme.textSecondary }]}>{partial}</Text>
          )}
          {!!assistant && (
            <Text numberOfLines={3} style={[styles.assistant, { color: theme.text }]}>{assistant}</Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.round, { backgroundColor: theme.error }]}
            onPress={async () => { try { await realtime.stopStream(); } catch {}; onClose(); }}
          >
            <Ionicons name="stop" size={18} color={theme.onError || '#fff'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.round, { backgroundColor: theme.surfaceVariant, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}
            onPress={() => onClose()}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: Platform.OS === 'ios' ? 104 : 88,
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
  },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  partial: { fontSize: 12 },
  assistant: { fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8 },
  round: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
