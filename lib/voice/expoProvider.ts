/**
 * Expo Speech Recognition Provider (Future-Ready Stub)
 * 
 * This is a placeholder for when Expo officially releases Speech Recognition.
 * Currently returns unavailable on all platforms.
 * 
 * To activate when Expo Speech Recognition becomes available:
 * 1. Update isAvailable() to check for the actual Expo module
 * 2. Implement start/stop/setMuted methods using the Expo API
 * 3. Wire up transcript callbacks
 * 
 * Benefits of this abstraction:
 * - Zero native module linking (managed workflow compatible)
 * - Consistent API across all platforms
 * - No rebuild required to enable (just update this file + app restart)
 */

import type { VoiceProvider, VoiceSession, VoiceStartOptions } from './unifiedProvider';

class ExpoSpeechSession implements VoiceSession {
  private active = false;

  async start(_opts: VoiceStartOptions): Promise<boolean> {
    if (__DEV__) {
      console.log('[ExpoProvider] start() called but Expo Speech Recognition not yet available');
    }
    // TODO: When Expo Speech Recognition ships, implement:
    // 1. Check for permissions
    // 2. Start recognition with language from opts
    // 3. Wire up onPartial and onFinal callbacks
    // 4. Set this.active = true
    return false;
  }

  async stop(): Promise<void> {
    if (__DEV__) {
      console.log('[ExpoProvider] stop() called');
    }
    this.active = false;
    // TODO: Stop recognition and release microphone
  }

  isActive(): boolean {
    return this.active;
  }

  setMuted(_muted: boolean): void {
    // TODO: Implement mute/unmute
    if (__DEV__) {
      console.log('[ExpoProvider] setMuted() called but not implemented yet');
    }
  }

  updateConfig(_cfg: { language?: string }): void {
    // TODO: Update language dynamically
    if (__DEV__) {
      console.log('[ExpoProvider] updateConfig() called but not implemented yet');
    }
  }
}

/**
 * Expo Speech Recognition Provider
 * Returns unavailable until Expo officially releases this module
 */
export const expoSpeech: VoiceProvider = {
  id: 'expo',
  
  async isAvailable(): Promise<boolean> {
    // TODO: When Expo Speech Recognition is released, check for:
    // 1. Module existence: expo-speech-recognition
    // 2. Platform support (should work on iOS, Android, Web)
    // 3. Runtime availability
    
    // For now, always return false (not available yet)
    // Uncomment this when ready:
    // try {
    //   const { SpeechRecognition } = await import('expo-speech-recognition');
    //   return !!SpeechRecognition;
    // } catch {
    //   return false;
    // }
    
    return false;
  },
  
  createSession(): VoiceSession {
    return new ExpoSpeechSession();
  },
};

/**
 * Example implementation when Expo Speech Recognition ships:
 * 
 * import { SpeechRecognition } from 'expo-speech-recognition';
 * 
 * async start(opts: VoiceStartOptions): Promise<boolean> {
 *   try {
 *     // Request permissions
 *     const { status } = await SpeechRecognition.requestPermissionsAsync();
 *     if (status !== 'granted') return false;
 *     
 *     // Configure recognition
 *     await SpeechRecognition.start({
 *       lang: opts.language || 'en-US',
 *       continuous: true,
 *       interimResults: true,
 *     });
 *     
 *     // Set up event listeners
 *     SpeechRecognition.onResult((event) => {
 *       const transcript = event.results[0].transcript;
 *       if (event.isFinal) {
 *         opts.onFinal?.(transcript);
 *       } else {
 *         opts.onPartial?.(transcript);
 *       }
 *     });
 *     
 *     this.active = true;
 *     return true;
 *   } catch (e) {
 *     console.error('[ExpoProvider] start failed:', e);
 *     return false;
 *   }
 * }
 */
