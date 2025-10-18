/**
 * Voice Availability Checker
 * 
 * Detects which voice features are available on the current platform
 * and provides helpful guidance when features are unavailable.
 */

import { Platform } from 'react-native';

export interface VoiceAvailability {
  picovoiceAvailable: boolean;
  webAudioAvailable: boolean;
  deviceTTSAvailable: boolean;
  recommendedAction?: string;
  errorDetails?: string;
}

// Extend Window interface for Web Audio API
declare global {
  interface Window {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

let cachedAvailability: VoiceAvailability | null = null;

/**
 * Check what voice features are available
 */
export async function checkVoiceAvailability(): Promise<VoiceAvailability> {
  // Return cached result if available
  if (cachedAvailability) {
    return cachedAvailability;
  }

  const availability: VoiceAvailability = {
    picovoiceAvailable: false,
    webAudioAvailable: false,
    deviceTTSAvailable: true, // Usually available
  };

  // Check Picovoice VoiceProcessor (native only)
  if (Platform.OS !== 'web') {
    try {
      const module = await import('@picovoice/react-native-voice-processor');
      if (module?.VoiceProcessor && module.VoiceProcessor.instance) {
        availability.picovoiceAvailable = true;
      } else {
        availability.errorDetails = 'VoiceProcessor module loaded but instance is null';
        availability.recommendedAction = 'Rebuild the app with: npx expo run:android or npx expo run:ios';
      }
    } catch (error: any) {
      availability.errorDetails = error?.message || String(error);
      if (error?.message?.includes('Native module cannot be null')) {
        availability.recommendedAction = 'Native module not linked. Run: npx expo prebuild --clean && npx expo run:android';
      } else if (error?.message?.includes('Cannot find module')) {
        availability.recommendedAction = 'Dependencies not installed. Run: npm install';
      } else {
        availability.recommendedAction = 'Rebuild dev client: npx expo run:android or npx expo run:ios';
      }
    }
  }

  // Check Web Audio API (web only)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    availability.webAudioAvailable = !!(
      (window as any).AudioContext ||
      (window as any).webkitAudioContext
    );
    
    if (!availability.webAudioAvailable) {
      availability.recommendedAction = 'Enable Web Audio API in your browser settings';
    }
  }

  cachedAvailability = availability;
  return availability;
}

/**
 * Get a user-friendly error message based on availability
 */
export function getVoiceErrorMessage(availability: VoiceAvailability): string {
  if (Platform.OS === 'web') {
    if (!availability.webAudioAvailable) {
      return 'Voice input is not available in your browser. Please use a modern browser with Web Audio support.';
    }
    return 'Voice features are available on web! Use the microphone button to start.';
  }

  if (!availability.picovoiceAvailable) {
    return `Voice input requires native module setup.\n${availability.recommendedAction || 'Please rebuild the app.'}`;
  }

  return 'Voice features are ready!';
}

/**
 * Reset the cache (useful for testing or after fixing issues)
 */
export function resetVoiceAvailabilityCache(): void {
  cachedAvailability = null;
}
