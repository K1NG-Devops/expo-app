/**
 * Voice Service Types
 * 
 * Type definitions for the South African multilingual voice system
 */

export type SupportedLanguage = 'af' | 'zu' | 'xh' | 'nso';

export interface VoicePreference {
  user_id: string;
  language: SupportedLanguage;
  voice_id: string;
  speaking_rate?: number;
  pitch?: number;
  volume?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TTSRequest {
  text: string;
  language: SupportedLanguage;
  voice_id?: string;
  speaking_rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSResponse {
  audio_url: string;
  cache_hit: boolean;
  provider: 'azure' | 'google' | 'openai';
  content_hash: string;
  duration_ms?: number;
}

export interface TranscriptionRequest {
  audio_url: string;
  language?: SupportedLanguage;
}

export interface TranscriptionResponse {
  text: string;
  language: string;
  confidence: number;
  duration_ms: number;
}

export interface VoiceUsageLog {
  id?: string;
  user_id: string;
  preschool_id: string;
  operation_type: 'tts' | 'transcription';
  language: SupportedLanguage;
  provider: string;
  cache_hit: boolean;
  character_count?: number;
  audio_duration_seconds?: number;
  cost_estimate?: number;
  created_at?: string;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  uri?: string;
  error?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  duration: number;
  position: number;
  uri?: string;
  error?: string;
}

export interface VoiceServiceError {
  code: string;
  message: string;
  provider?: string;
  details?: any;
}

// Language metadata
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  englishName: string;
  flag: string;
  defaultVoiceId: string;
  sampleText: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  af: {
    code: 'af',
    name: 'Afrikaans',
    englishName: 'Afrikaans',
    flag: '🇿🇦',
    defaultVoiceId: 'af-ZA-AdriNeural',
    sampleText: 'Hallo, welkom by EduDash Pro. Ons help jou om beter te leer.',
  },
  zu: {
    code: 'zu',
    name: 'isiZulu',
    englishName: 'Zulu',
    flag: '🇿🇦',
    defaultVoiceId: 'zu-ZA-ThandoNeural',
    sampleText: 'Sawubona, wamkelekile ku-EduDash Pro. Siyakusiza ukuthi ufunde kangcono.',
  },
  xh: {
    code: 'xh',
    name: 'isiXhosa',
    englishName: 'Xhosa',
    flag: '🇿🇦',
    defaultVoiceId: 'xh-ZA-Online',
    sampleText: 'Molo, wamkelekile kwi-EduDash Pro. Sikunceda ukuba ufunde ngcono.',
  },
  nso: {
    code: 'nso',
    name: 'Sepedi',
    englishName: 'Northern Sotho',
    flag: '🇿🇦',
    defaultVoiceId: 'nso-ZA-Online',
    sampleText: 'Thobela, kamogelô go EduDash Pro. Re go thuša go ithuta ka mahlale.',
  },
};

// Voice provider priorities
export const PROVIDER_PRIORITY: Record<SupportedLanguage, Array<'azure' | 'google' | 'openai'>> = {
  af: ['azure'],      // Full support on Azure
  zu: ['azure'],      // Full support on Azure
  xh: ['google'],     // Google Cloud TTS
  nso: ['openai'],    // OpenAI Whisper (fallback)
};
