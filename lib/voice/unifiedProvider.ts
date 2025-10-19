/**
 * Unified Voice Provider Abstraction
 * 
 * Selects the best available voice recognition provider by priority:
 * 1. Expo Speech Recognition (future - when officially released)
 * 2. Azure Speech SDK (current - works on web + mobile)
 * 3. Noop fallback (graceful degradation)
 * 
 * Benefits:
 * - Single interface for all voice recognition providers
 * - Future-proof architecture for Expo Speech Recognition
 * - Secure token management (never exposes Azure keys client-side)
 * - Platform-agnostic (web, iOS, Android)
 */

import { createAzureSpeechSession, type AzureSpeechSession } from '@/lib/voice/azureProvider';
import { getAzureSpeechToken } from '@/lib/voice/realtimeToken';
import { expoSpeech } from '@/lib/voice/expoProvider';

export type VoicePartialCb = (text: string) => void;
export type VoiceFinalCb = (text: string) => void;

export interface VoiceStartOptions {
  language?: string; // 'en' | 'af' | 'zu' | 'xh' | 'nso'
  onPartial?: VoicePartialCb;
  onFinal?: VoiceFinalCb;
}

export interface VoiceSession {
  start(opts: VoiceStartOptions): Promise<boolean>;
  stop(): Promise<void>;
  isActive(): boolean;
  setMuted(muted: boolean): void;
  updateConfig(cfg: { language?: string }): void;
}

export interface VoiceProvider {
  id: 'expo' | 'azure' | 'noop';
  isAvailable(): Promise<boolean>;
  createSession(): VoiceSession;
}

/**
 * Noop session - graceful fallback when no provider is available
 */
class NoopSession implements VoiceSession {
  async start() {
    if (__DEV__) console.warn('[UnifiedProvider] NoopSession: No voice provider available');
    return false;
  }
  async stop() {}
  isActive() { return false; }
  setMuted() {}
  updateConfig() {}
}

/**
 * Get the default voice provider based on availability and optional override
 * Priority: Expo Speech Recognition → Azure Speech SDK → Noop
 */
export async function getDefaultVoiceProvider(language?: string): Promise<VoiceProvider> {
  // Allow environment override for testing
  const envOverride = process.env.EXPO_PUBLIC_VOICE_PROVIDER as 'expo' | 'azure' | 'auto' | undefined;
  
  if (__DEV__) {
    console.log('[UnifiedProvider] Selecting voice provider:', {
      language,
      envOverride: envOverride || 'auto',
    });
  }

  // 1) Expo Speech Recognition (future - check availability first)
  if (envOverride !== 'azure') {
    try {
      const expoAvailable = await expoSpeech.isAvailable();
      if (expoAvailable) {
        if (__DEV__) console.log('[UnifiedProvider] ✅ Using Expo Speech Recognition');
        return expoSpeech;
      }
    } catch (e) {
      if (__DEV__) console.warn('[UnifiedProvider] Expo Speech check failed:', e);
    }
  }

  // 2) Azure Speech SDK (current - works on web + mobile)
  if (envOverride !== 'expo') {
    try {
      const token = await getAzureSpeechToken();
      if (token?.token && token.region) {
        if (__DEV__) {
          console.log('[UnifiedProvider] ✅ Using Azure Speech SDK:', {
            region: token.region,
            hasToken: !!token.token,
          });
        }

        return {
          id: 'azure',
          async isAvailable() { return true; },
          createSession() {
            const sess: AzureSpeechSession = createAzureSpeechSession();
            
            // Wrap Azure session to match VoiceSession interface
            return {
              async start(opts: VoiceStartOptions) {
                return await sess.start({
                  token: token.token,
                  region: token.region,
                  language: opts.language,
                  onPartialTranscript: opts.onPartial,
                  onFinalTranscript: opts.onFinal,
                });
              },
              async stop() { await sess.stop(); },
              isActive() { return sess.isActive(); },
              setMuted(m) { sess.setMuted(m); },
              updateConfig(cfg) { 
                sess.updateTranscriptionConfig({ language: cfg.language }); 
              },
            };
          },
        };
      } else {
        if (__DEV__) {
          console.warn('[UnifiedProvider] ⚠️ Azure Speech SDK unavailable:', {
            hasToken: !!token?.token,
            hasRegion: !!token?.region,
          });
          console.warn('[UnifiedProvider] Hint: Check if azure-speech-token Edge Function is deployed');
          console.warn('[UnifiedProvider] Hint: Verify AZURE_SPEECH_KEY and AZURE_SPEECH_REGION secrets in Supabase');
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[UnifiedProvider] Azure Speech check failed:', e);
    }
  }

  // 3) Fallback - no provider available
  if (__DEV__) {
    console.warn('[UnifiedProvider] ⚠️ No voice provider available - falling back to noop');
  }
  
  return {
    id: 'noop',
    async isAvailable() { return false; },
    createSession() { return new NoopSession(); },
  };
}
