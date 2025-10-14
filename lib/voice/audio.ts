/**
 * Audio Recording and Playback Manager
 * 
 * Handles audio recording and playback using expo-av
 * Includes permissions management and state tracking
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import type { RecordingState, PlaybackState } from './types';

export class AudioManager {
  private static instance: AudioManager | null = null;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isInitialized: boolean = false;
  private recordingState: RecordingState = {
    isRecording: false,
    duration: 0,
  };
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

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[AudioManager] Failed to request permissions:', error);
      return false;
    }
  }

  /**
   * Check if microphone permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[AudioManager] Failed to check permissions:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   * 
   * @param onUpdate Callback for recording state updates
   */
  async startRecording(onUpdate?: (state: RecordingState) => void): Promise<void> {
    try {
      // Stop any existing recording first
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          console.warn('[AudioManager] Failed to stop existing recording:', e);
        }
        this.recording = null;
      }

      // Stop any playing sound
      if (this.sound) {
        try {
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
        } catch (e) {
          console.warn('[AudioManager] Failed to stop existing sound:', e);
        }
        this.sound = null;
      }

      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.recordingState = {
        isRecording: true,
        duration: 0,
      };

      // Set up status updates
      if (onUpdate) {
        recording.setOnRecordingStatusUpdate((status) => {
          if (status.isRecording) {
            this.recordingState = {
              isRecording: true,
              duration: status.durationMillis,
            };
            onUpdate(this.recordingState);
          }
        });
      }
    } catch (error) {
      this.recordingState = {
        isRecording: false,
        duration: 0,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      };
      if (onUpdate) {
        onUpdate(this.recordingState);
      }
      throw error;
    }
  }

  /**
   * Stop recording and return the audio URI
   */
  async stopRecording(): Promise<string> {
    try {
      if (!this.recording) {
        throw new Error('No active recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.recording = null;
      this.recordingState = {
        isRecording: false,
        duration: 0,
        uri: uri || undefined,
      };

      // Reset audio mode after recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      return uri;
    } catch (error) {
      this.recordingState = {
        isRecording: false,
        duration: 0,
        error: error instanceof Error ? error.message : 'Failed to stop recording',
      };
      throw error;
    }
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      this.recordingState = {
        isRecording: false,
        duration: 0,
      };
    } catch (error) {
      console.error('[AudioManager] Failed to cancel recording:', error);
    }
  }

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

  /**
   * Get current recording state
   */
  getRecordingState(): RecordingState {
    return { ...this.recordingState };
  }

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
    await this.cancelRecording();
    await this.stop();
  }
}

// Export singleton instance
export const audioManager = AudioManager.getInstance();

// Initialize on module load
audioManager.initialize().catch(err => {
  console.error('[AudioManager] Failed to initialize on load:', err);
});
