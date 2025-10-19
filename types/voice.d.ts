/**
 * Type declarations for @react-native-voice/voice
 */
declare module '@react-native-voice/voice' {
  import { EmitterSubscription } from 'react-native';

  export interface SpeechStartEvent {
    error?: string;
  }

  export interface SpeechEndEvent {
    error?: string;
  }

  export interface SpeechErrorEvent {
    error?: {
      code?: string;
      message?: string;
    };
  }

  export interface SpeechResultsEvent {
    value?: string[];
  }

  export default class Voice {
    static start(locale?: string): Promise<void>;
    static stop(): Promise<void>;
    static cancel(): Promise<void>;
    static destroy(): Promise<void>;
    static removeAllListeners(): void;
    static isAvailable(): Promise<boolean>;
    static isRecognizing(): Promise<boolean>;
    static getSpeechRecognitionServices(): Promise<string[]>;
    
    static addListener(
      event: string, 
      handler: (e?: any) => void
    ): EmitterSubscription;
    
    static onSpeechStart?: (e?: SpeechStartEvent) => void;
    static onSpeechRecognized?: (e?: any) => void;
    static onSpeechEnd?: (e?: SpeechEndEvent) => void;
    static onSpeechError?: (e?: SpeechErrorEvent) => void;
    static onSpeechResults?: (e?: SpeechResultsEvent) => void;
    static onSpeechPartialResults?: (e?: SpeechResultsEvent) => void;
    static onSpeechVolumeChanged?: (e?: { value?: number }) => void;
  }
}