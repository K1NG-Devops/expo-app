/**
 * Audio Playback Manager
 * 
 * Handles audio playback for TTS using expo-av
 * Recording removed - use streaming via useVoiceController instead
 */

import { Audio } from 'expo-av';
import type { PlaybackState } from './types';

export class AudioManager {
  private static instance: AudioManager | null = null;
  private sound: Audio.Sound | null = null;
  private isInitialized: boolean = false;
  private playbackState: PlaybackState = {
    isPlaying: false,
    duration: 0,
    position: 0,
  };

  /**
   * Get singleton instance
   */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize audio system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set initial audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('[AudioManager] Failed to initialize:', error);
    }
  }

  // NOTE: Recording methods removed - use useVoiceController with streaming instead
  // Only TTS playback methods remain below

  /**
   * Play audio from URI
   * 
   * @param uri Audio file URI
   * @param onUpdate Callback for playback state updates
   */
  async play(uri: string, onUpdate?: (state: PlaybackState) => void): Promise<void> {
    try {
      // Stop any existing playback
      await this.stop();

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) {
            return;
          }

          this.playbackState = {
            isPlaying: status.isPlaying,
            duration: status.durationMillis || 0,
            position: status.positionMillis || 0,
            uri,
          };

          if (onUpdate) {
            onUpdate(this.playbackState);
          }

          // Auto-cleanup when playback finishes
          if (status.didJustFinish) {
            this.stop();
          }
        }
      );

      this.sound = sound;
    } catch (error) {
      this.playbackState = {
        isPlaying: false,
        duration: 0,
        position: 0,
        error: error instanceof Error ? error.message : 'Failed to play audio',
      };
      if (onUpdate) {
        onUpdate(this.playbackState);
      }
      throw error;
    }
  }

  /**
   * Pause current playback
   */
  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        this.playbackState.isPlaying = false;
      }
    } catch (error) {
      console.error('[AudioManager] Failed to pause:', error);
    }
  }

  /**
   * Resume paused playback
   */
  async resume(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
        this.playbackState.isPlaying = true;
      }
    } catch (error) {
      console.error('[AudioManager] Failed to resume:', error);
    }
  }

  /**
   * Stop playback and cleanup
   */
  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.playbackState = {
        isPlaying: false,
        duration: 0,
        position: 0,
      };
    } catch (error) {
      console.error('[AudioManager] Failed to stop:', error);
    }
  }

  // NOTE: getRecordingState removed - not needed for playback-only

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();

// Initialize on module load
audioManager.initialize().catch(err => {
  console.error('[AudioManager] Failed to initialize on load:', err);
});
