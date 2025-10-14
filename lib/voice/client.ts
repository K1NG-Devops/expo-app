/**
 * Voice Service Client
 * 
 * Client library for interacting with the TTS proxy Edge Function
 * Handles text-to-speech synthesis, voice preferences, and usage tracking
 */

import { assertSupabase } from '../supabase';
import type {
  TTSRequest,
  TTSResponse,
  VoicePreference,
  SupportedLanguage,
  VoiceServiceError,
  SUPPORTED_LANGUAGES,
} from './types';

const EDGE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/tts-proxy';

class VoiceServiceClient {
  /**
   * Synthesize speech from text
   * 
   * @param request TTS request parameters
   * @returns Audio URL and metadata
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const supabase = assertSupabase();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw this.createError('AUTH_REQUIRED', 'User must be authenticated to use voice services');
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'synthesize',
          ...request,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createError(
          'TTS_FAILED',
          errorData.error || `TTS request failed with status ${response.status}`,
          errorData.provider,
          errorData
        );
      }

      const data: TTSResponse = await response.json();
      return data;
    } catch (error) {
      if ((error as VoiceServiceError).code) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', 'Failed to connect to voice service', undefined, error);
    }
  }

  /**
   * Get user's voice preferences
   * 
   * @returns User's voice preference or null
   */
  async getPreferences(): Promise<VoicePreference | null> {
    const supabase = assertSupabase();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw this.createError('AUTH_REQUIRED', 'User must be authenticated');
      }

      const { data, error } = await supabase
        .from('voice_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (acceptable)
        throw error;
      }

      return data || null;
    } catch (error) {
      if ((error as VoiceServiceError).code) {
        throw error;
      }
      console.error('[VoiceService] Failed to fetch preferences:', error);
      return null;
    }
  }

  /**
   * Save or update user's voice preferences
   * 
   * @param preferences Voice preference settings
   */
  async savePreferences(preferences: Partial<VoicePreference>): Promise<VoicePreference> {
    const supabase = assertSupabase();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw this.createError('AUTH_REQUIRED', 'User must be authenticated');
      }

      const preferenceData = {
        ...preferences,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('voice_preferences')
        .upsert(preferenceData, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      if ((error as VoiceServiceError).code) {
        throw error;
      }
      throw this.createError('SAVE_FAILED', 'Failed to save voice preferences', undefined, error);
    }
  }

  /**
   * Test voice output with sample text
   * 
   * @param language Language to test
   * @param voiceId Voice ID to test (optional)
   * @returns Audio URL for testing
   */
  async testVoice(language: SupportedLanguage, voiceId?: string): Promise<string> {
    const { SUPPORTED_LANGUAGES } = await import('./types');
    const languageInfo = SUPPORTED_LANGUAGES[language];
    
    const response = await this.synthesize({
      text: languageInfo.sampleText,
      language,
      voice_id: voiceId || languageInfo.defaultVoiceId,
    });

    return response.audio_url;
  }

  /**
   * Get usage statistics for the current user
   * 
   * @param limit Number of recent logs to fetch
   * @returns Array of usage logs
   */
  async getUsageStats(limit: number = 50) {
    const supabase = assertSupabase();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw this.createError('AUTH_REQUIRED', 'User must be authenticated');
      }

      const { data, error } = await supabase
        .from('voice_usage_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('[VoiceService] Failed to fetch usage stats:', error);
      return [];
    }
  }

  /**
   * Create a standardized error object
   */
  private createError(
    code: string,
    message: string,
    provider?: string,
    details?: any
  ): VoiceServiceError {
    return {
      code,
      message,
      provider,
      details,
    };
  }

  /**
   * Check if a language is supported
   */
  async isLanguageSupported(language: string): Promise<boolean> {
    const { SUPPORTED_LANGUAGES } = await import('./types');
    return language in SUPPORTED_LANGUAGES;
  }

  /**
   * Get all supported languages
   */
  async getSupportedLanguages() {
    const { SUPPORTED_LANGUAGES } = await import('./types');
    return SUPPORTED_LANGUAGES;
  }
}

// Export singleton instance
export const voiceService = new VoiceServiceClient();

// Export class for testing/custom instances
export { VoiceServiceClient };
