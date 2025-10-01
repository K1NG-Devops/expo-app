import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';

export type VoiceState = 'idle' | 'prewarm' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

export interface VoiceController {
  state: VoiceState;
  isLocked: boolean;
  timerMs: number;
  startPress: () => Promise<void>;
  release: () => Promise<void>;
  lock: () => void;
  cancel: () => Promise<void>;
  interrupt: () => Promise<void>;
}

interface Options {
  onResponse?: (message: DashMessage) => void;
  autoSilenceMs?: number;
  maxListenMs?: number;
}

export function useVoiceController(dash: DashAIAssistant | null, opts: Options = {}): VoiceController {
  const { onResponse } = opts;
  const [prefAutoSilence, setPrefAutoSilence] = useState<number>(7000);
  const [prefListenCap, setPrefListenCap] = useState<number>(15000);
  const [prefDefaultLocked, setPrefDefaultLocked] = useState<boolean>(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [isLocked, setLocked] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const listenTimerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (listenTimerRef.current) { clearTimeout(listenTimerRef.current as unknown as number); listenTimerRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current as unknown as number); tickRef.current = null; }
  };

  // Load voice prefs (async storage) once
  useEffect(() => {
    (async () => {
      try {
        const AS = (await import('@react-native-async-storage/async-storage')).default;
        const [a, b, c] = await Promise.all([
          AS.getItem('@voice_auto_silence_ms'),
          AS.getItem('@voice_listen_cap_ms'),
          AS.getItem('@voice_default_lock'),
        ]);
        if (a && !Number.isNaN(Number(a))) setPrefAutoSilence(Math.max(2000, Number(a)));
        if (b && !Number.isNaN(Number(b))) setPrefListenCap(Math.max(5000, Number(b)));
        if (c !== null) setPrefDefaultLocked(c === 'true');
      } catch {}
    })();
  }, []);

  const startTick = () => {
    setTimerMs(0);
    tickRef.current = (setInterval(() => {
      setTimerMs((t) => t + 250);
    }, 250) as unknown) as number;
  };

  const startAutoSilence = () => {
    clearTimeout(listenTimerRef.current as unknown as number);
    listenTimerRef.current = (setTimeout(async () => {
      if (!isLocked) {
        await release();
      }
    }, prefAutoSilence) as unknown) as number;
  };

  const startPress = useCallback(async () => {
    try {
      if (!dash) return;
      if (state === 'speaking') {
        try { await dash.stopSpeaking(); } catch {}
      }
      setLocked(false);
      setState('prewarm');
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      try { await dash.preWarmRecorder(); } catch {}
      await dash.startRecording();
      setState('listening');
      startTick();
      if (prefDefaultLocked) {
        // honor default lock: set locked and start cap timer
        setLocked(true);
        clearTimeout(listenTimerRef.current as unknown as number);
        listenTimerRef.current = (setTimeout(async () => { await release(); }, prefListenCap) as unknown) as number;
      } else {
        startAutoSilence();
      }
    } catch {
      setState('error');
    }
  }, [dash, state]);

  const lock = useCallback(() => {
    setLocked(true);
    try { Haptics.selectionAsync(); } catch {}
    clearTimeout(listenTimerRef.current as unknown as number);
    listenTimerRef.current = (setTimeout(async () => {
      // Defer calling release via event loop to avoid closure order issues
      try { await release(); } catch {}
    }, prefListenCap) as unknown) as number;
  }, [prefListenCap]);

  const release = useCallback(async () => {
    try {
      if (!dash) return;
      if (state !== 'listening') return;
      clearTimers();
      setState('transcribing');
      let uri: string | null = null;
      try { uri = await dash.stopRecording(); } catch {}
      if (!uri) { setState('idle'); return; }
      const tr = await dash.transcribeOnly(uri);
      setState('thinking');
      const response = await dash.sendPreparedVoiceMessage(uri, tr.transcript || '', tr.duration || 0);
      onResponse?.(response);
      setState('idle');
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch {
      setState('error');
    } finally {
      clearTimers();
      setLocked(false);
      setTimerMs(0);
    }
  }, [dash, onResponse, state]);

  const cancel = useCallback(async () => {
    try {
      if (!dash) return;
      if (state === 'listening' || state === 'prewarm' || state === 'transcribing') {
        try { await dash.stopRecording(); } catch {}
      }
      if (state === 'speaking') {
        try { await dash.stopSpeaking(); } catch {}
      }
    } finally {
      clearTimers();
      setLocked(false);
      setTimerMs(0);
      setState('idle');
    }
  }, [dash, state]);

  const interrupt = useCallback(async () => {
    try { if (dash) await dash.stopSpeaking(); } catch {}
    try { await Haptics.selectionAsync(); } catch {}
    setState('idle');
  }, [dash]);

  useEffect(() => () => { clearTimers(); }, []);

  return { state, isLocked, timerMs, startPress, release, lock, cancel, interrupt };
}
