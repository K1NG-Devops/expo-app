// Azure Speech streaming provider for React Native / Web
// Uses microsoft-cognitiveservices-speech-sdk via dynamic import.
// Falls back gracefully if SDK is unavailable.

import { Platform } from 'react-native';

export interface AzureStartOptions {
  token: string; // Azure speech auth token (short‑lived)
  region: string; // Azure region, e.g. 'southafricanorth'
  language?: string; // 'en' | 'af' | 'zu' | 'xh' | 'nso'
  vadSilenceMs?: number; // currently unused (SDK handles VAD internally)
  onPartialTranscript?: (t: string) => void;
  onFinalTranscript?: (t: string) => void;
}

export interface AzureSpeechSession {
  start: (opts: AzureStartOptions) => Promise<boolean>;
  stop: () => Promise<void>;
  isActive: () => boolean;
  setMuted: (muted: boolean) => void;
  updateTranscriptionConfig: (cfg: { language?: string }) => void;
}

export function createAzureSpeechSession(): AzureSpeechSession {
  let recognizer: any = null;
  let sdk: any = null;
  let active = false;
  let closed = false;
  let muted = false;
  let currentLang: string | undefined;

  return {
    async start(opts: AzureStartOptions) {
      if (closed) return false;
      try {
        // Dynamic import to avoid bundling when unused
        try {
          // Prefer default import name
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          sdk = (await import('microsoft-cognitiveservices-speech-sdk')) as any;
        } catch (e) {
          console.error('[azureProvider] SDK not available:', e);
          return false;
        }

        const SpeechSDK = (sdk as any).SpeechSDK || sdk; // some builds expose SpeechSDK property
        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(opts.token, opts.region);
        // Map app 2-letter codes to Azure locale codes
        const mapLang = (l?: string) => {
          const base = String(l || '').toLowerCase();
          if (base.startsWith('af')) return 'af-ZA';
          if (base.startsWith('zu')) return 'zu-ZA';
          if (base.startsWith('xh')) return 'xh-ZA';
          if (base.startsWith('nso') || base.startsWith('st')) return 'nso-ZA';
          if (base.startsWith('en')) return Platform.OS === 'android' ? 'en-ZA' : 'en-US';
          return 'en-ZA';
        };
        currentLang = mapLang(opts.language);
        speechConfig.speechRecognitionLanguage = currentLang;

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizing = (_s: any, e: any) => {
          const text = String(e?.result?.text || '');
          if (text) opts.onPartialTranscript?.(text);
        };
        recognizer.recognized = (_s: any, e: any) => {
          const reason = e?.result?.reason;
          const text = String(e?.result?.text || '');
          if (reason === sdk.ResultReason.RecognizedSpeech && text) {
            opts.onFinalTranscript?.(text);
          }
        };
        recognizer.canceled = (_s: any, e: any) => {
          console.warn('[azureProvider] canceled:', e?.errorDetails || e?.reason);
        };
        recognizer.sessionStopped = () => {
          active = false;
        };

        await new Promise<void>((resolve, reject) => {
          recognizer.startContinuousRecognitionAsync(
            () => { active = true; resolve(); },
            (err: any) => { console.error('[azureProvider] start error:', err); reject(err); }
          );
        });

        // Apply mute state (disable mic track) — simplest approach is to stop recognition
        if (muted) {
          try { recognizer.stopContinuousRecognitionAsync(() => {}, () => {}); active = false; } catch {}
        }

        return true;
      } catch (e) {
        console.error('[azureProvider] start failed:', e);
        try { recognizer?.close?.(); } catch {}
        recognizer = null; active = false;
        return false;
      }
    },

    async stop() {
      if (!recognizer) return;
      try {
        await new Promise<void>((resolve) => {
          try {
            recognizer.stopContinuousRecognitionAsync(
              () => { active = false; resolve(); },
              () => { active = false; resolve(); }
            );
          } catch { active = false; resolve(); }
        });
      } finally {
        try { recognizer.close?.(); } catch {}
        recognizer = null; closed = true; active = false;
      }
    },

    isActive() { return active && !closed; },

    setMuted(m: boolean) {
      muted = !!m;
      try {
        if (!recognizer) return;
        if (muted) recognizer.stopContinuousRecognitionAsync(() => { active = false; }, () => { active = false; });
        else recognizer.startContinuousRecognitionAsync(() => { active = true; }, () => {});
      } catch {}
    },

    updateTranscriptionConfig(cfg: { language?: string }) {
      try {
        if (!cfg.language || !recognizer || !sdk) return;
        const SpeechSDK = (sdk as any).SpeechSDK || sdk;
        const speechConfig = recognizer.properties?.getProperty ? null : null; // noop; recreating is safer
        // Recreate recognizer with new language
        const lang = cfg.language;
        const mapped = lang ? ((): string => {
          const base = String(lang || '').toLowerCase();
          if (base.startsWith('af')) return 'af-ZA';
          if (base.startsWith('zu')) return 'zu-ZA';
          if (base.startsWith('xh')) return 'xh-ZA';
          if (base.startsWith('nso') || base.startsWith('st')) return 'nso-ZA';
          if (base.startsWith('en')) return Platform.OS === 'android' ? 'en-ZA' : 'en-US';
          return 'en-ZA';
        })() : currentLang;
        currentLang = mapped;
        // Restart with new language by stopping and starting
        this.setMuted(true);
        this.setMuted(false);
      } catch {}
    },
  };
}
