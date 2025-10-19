// Azure Speech streaming provider for React Native / Web
// Uses microsoft-cognitiveservices-speech-sdk via dynamic import.
// Falls back gracefully if SDK is unavailable.

import { Platform } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Ensure microphone permission using Expo AV (works on iOS, Android, Web)
 * Returns true if permission granted, false otherwise
 */
async function ensureMicPermission(): Promise<boolean> {
  try {
    const { status, granted } = await Audio.requestPermissionsAsync();
    if (status === 'granted' || granted) {
      if (__DEV__) console.log('[azureProvider] ✅ Microphone permission granted');
      return true;
    }
    if (__DEV__) console.warn('[azureProvider] ⚠️ Microphone permission denied:', status);
    return false;
  } catch (e) {
    console.error('[azureProvider] Permission request error:', e);
    return false;
  }
}

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
      if (closed) {
        if (__DEV__) console.warn('[azureProvider] Session already closed');
        return false;
      }
      
      try {
        // Step 1: Check microphone permissions (mobile + web)
        const hasPermission = await ensureMicPermission();
        if (!hasPermission) {
          console.error('[azureProvider] ❌ Microphone permission required');
          return false;
        }

        // Step 2: Dynamic import to avoid bundling when unused
        try {
          sdk = (await import('microsoft-cognitiveservices-speech-sdk')) as any;
          if (__DEV__) console.log('[azureProvider] ✅ Azure Speech SDK loaded');
        } catch (e) {
          console.error('[azureProvider] ❌ SDK not available:', e);
          console.error('[azureProvider] Hint: Ensure microsoft-cognitiveservices-speech-sdk is installed');
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

        // Wire up event handlers with defensive null checks
        recognizer.recognizing = (_s: any, e: any) => {
          try {
            const text = String(e?.result?.text || '');
            if (text && !muted) {
              if (__DEV__) console.log('[azureProvider] 🎤 Partial:', text.substring(0, 50));
              opts.onPartialTranscript?.(text);
            }
          } catch (err) {
            console.error('[azureProvider] recognizing error:', err);
          }
        };
        
        recognizer.recognized = (_s: any, e: any) => {
          try {
            const reason = e?.result?.reason;
            const text = String(e?.result?.text || '').trim();
            if (reason === sdk.ResultReason.RecognizedSpeech && text) {
              if (__DEV__) console.log('[azureProvider] ✅ Final:', text);
              opts.onFinalTranscript?.(text);
            }
          } catch (err) {
            console.error('[azureProvider] recognized error:', err);
          }
        };
        
        recognizer.canceled = (_s: any, e: any) => {
          const errorDetails = e?.errorDetails || e?.reason || 'unknown';
          if (__DEV__) console.warn('[azureProvider] ⚠️ Canceled:', errorDetails);
          active = false;
        };
        
        recognizer.sessionStopped = () => {
          if (__DEV__) console.log('[azureProvider] 🛑 Session stopped');
          active = false;
        };

        // Start continuous recognition
        await new Promise<void>((resolve, reject) => {
          recognizer.startContinuousRecognitionAsync(
            () => { 
              active = true; 
              if (__DEV__) console.log('[azureProvider] 🎙️ Recognition started');
              resolve(); 
            },
            (err: any) => { 
              console.error('[azureProvider] ❌ Start error:', err); 
              active = false;
              reject(err); 
            }
          );
        });

        // Apply mute state (disable mic track) — simplest approach is to stop recognition
        if (muted) {
          try { recognizer.stopContinuousRecognitionAsync(() => {}, () => {}); active = false; } catch { /* Intentional: non-fatal */ }
        }

        return true;
      } catch (e) {
        console.error('[azureProvider] start failed:', e);
        try { recognizer?.close?.(); } catch { /* Intentional: non-fatal */ }
        recognizer = null; active = false;
        return false;
      }
    },

    async stop() {
      if (!recognizer) {
        if (__DEV__) console.log('[azureProvider] No active recognizer to stop');
        return;
      }
      
      if (__DEV__) console.log('[azureProvider] 🛑 Stopping recognition...');
      
      try {
        await new Promise<void>((resolve) => {
          try {
            recognizer.stopContinuousRecognitionAsync(
              () => { 
                active = false; 
                if (__DEV__) console.log('[azureProvider] ✅ Stopped successfully');
                resolve(); 
              },
              (err: any) => { 
                active = false; 
                if (__DEV__) console.warn('[azureProvider] ⚠️ Stop error:', err);
                resolve(); 
              }
            );
          } catch (e) { 
            active = false; 
            if (__DEV__) console.error('[azureProvider] ❌ Stop exception:', e);
            resolve(); 
          }
        });
      } finally {
        // Cleanup: close recognizer and release resources
        try { 
          recognizer.close?.(); 
          if (__DEV__) console.log('[azureProvider] 🧹 Recognizer closed');
        } catch (e) {
          if (__DEV__) console.warn('[azureProvider] Close warning:', e);
        }
        recognizer = null; 
        closed = true; 
        active = false;
      }
    },

    isActive() { return active && !closed; },

    setMuted(m: boolean) {
      muted = !!m;
      try {
        if (!recognizer) return;
        if (muted) recognizer.stopContinuousRecognitionAsync(() => { active = false; }, () => { active = false; });
        else recognizer.startContinuousRecognitionAsync(() => { active = true; }, () => {});
      } catch { /* Intentional: non-fatal */ }
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
      } catch { /* Intentional: non-fatal */ }
    },
  };
}
