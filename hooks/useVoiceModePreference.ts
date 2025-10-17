/**
 * Voice Mode Preference Hook
 * 
 * Manages user's preferred voice interaction mode and provides
 * easy access to the current selection.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceModeType = 'simple' | 'original' | 'chatgpt';

const VOICE_MODE_KEY = '@dash_preferred_voice_mode';
const DEFAULT_MODE: VoiceModeType = 'chatgpt';

export function useVoiceModePreference() {
  const [voiceMode, setVoiceMode] = useState<VoiceModeType>(DEFAULT_MODE);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(VOICE_MODE_KEY);
        if (saved && ['simple', 'original', 'chatgpt'].includes(saved)) {
          setVoiceMode(saved as VoiceModeType);
        }
      } catch (error) {
        console.error('Failed to load voice mode preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, []);

  // Update preference
  const updateVoiceMode = useCallback(async (mode: VoiceModeType) => {
    try {
      setVoiceMode(mode);
      await AsyncStorage.setItem(VOICE_MODE_KEY, mode);
    } catch (error) {
      console.error('Failed to save voice mode preference:', error);
      // Revert on error
      const saved = await AsyncStorage.getItem(VOICE_MODE_KEY);
      if (saved && ['simple', 'original', 'chatgpt'].includes(saved)) {
        setVoiceMode(saved as VoiceModeType);
      }
    }
  }, []);

  // Get mode configuration
  const getModeConfig = useCallback((mode: VoiceModeType = voiceMode) => {
    switch (mode) {
      case 'chatgpt':
        return {
          title: 'ChatGPT Voice',
          description: 'Continuous conversation with natural turn-taking',
          icon: 'chatbubbles' as const,
          features: ['Auto-listening', 'Voice interruption', 'Natural flow'],
          supportsStreaming: true,
          supportsInterruption: true,
          supportsAutoListen: true,
        };
      case 'original':
        return {
          title: 'Voice Orb',
          description: 'Elegant orb interface with streaming',
          icon: 'radio-button-on' as const,
          features: ['Real-time streaming', 'Visual feedback', 'Manual control'],
          supportsStreaming: true,
          supportsInterruption: true,
          supportsAutoListen: false,
        };
      case 'simple':
        return {
          title: 'Simple Recording',
          description: 'Basic voice recording and transcription',
          icon: 'mic' as const,
          features: ['Reliable recording', 'Offline support', 'Simple UI'],
          supportsStreaming: false,
          supportsInterruption: false,
          supportsAutoListen: false,
        };
      default:
        return getModeConfig('chatgpt');
    }
  }, [voiceMode]);

  return {
    voiceMode,
    updateVoiceMode,
    getModeConfig,
    isLoading,
  };
}

export default useVoiceModePreference;