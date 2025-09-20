/**
 * Authentication Recovery Utility
 * 
 * Provides utilities to recover from authentication issues and
 * clean up corrupted session data
 */

import { assertSupabase } from '@/lib/supabase';
import { clearStoredData } from '@/lib/sessionManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys used by Supabase for session storage
const SUPABASE_AUTH_KEYS = [
  'sb-lvvvjywrmpcqrpvuptdi-auth-token',
  'supabase.auth.token',
  'sb-auth-token',
];

// Keys used by the app's session manager
const APP_SESSION_KEYS = [
  'edudash_user_session',
  'edudash_user_profile',
  'biometric_session',
];

export class AuthRecovery {
  /**
   * Clear all authentication data from storage
   */
  static async clearAllAuthData(): Promise<void> {
    console.log('[AuthRecovery] Clearing all authentication data...');

    try {
      // Clear app session data
      await clearStoredData();

      // Clear Supabase auth data
      const storage = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.localStorage 
        : AsyncStorage;

      if (Platform.OS === 'web' && storage === window.localStorage) {
        // Web: Clear localStorage
        [...SUPABASE_AUTH_KEYS, ...APP_SESSION_KEYS].forEach(key => {
          try {
            storage.removeItem(key);
          } catch (e) {
            console.debug(`Failed to remove ${key}:`, e);
          }
        });

        // Also clear any keys that contain 'supabase' or 'auth'
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          try {
            storage.removeItem(key);
          } catch (e) {
            console.debug(`Failed to remove ${key}:`, e);
          }
        });
      } else {
        // Mobile: Clear AsyncStorage
        const allKeys = [...SUPABASE_AUTH_KEYS, ...APP_SESSION_KEYS];
        await Promise.all(
          allKeys.map(key => 
            AsyncStorage.removeItem(key).catch(e => 
              console.debug(`Failed to remove ${key}:`, e)
            )
          )
        );
      }

      console.log('[AuthRecovery] All authentication data cleared');
    } catch (error) {
      console.error('[AuthRecovery] Error clearing auth data:', error);
    }
  }

  /**
   * Check and validate current authentication state
   */
  static async checkAuthState(): Promise<{
    hasSupabaseSession: boolean;
    hasAppSession: boolean;
    supabaseUser: any;
    errors: string[];
  }> {
    const errors: string[] = [];
    let hasSupabaseSession = false;
    let hasAppSession = false;
    let supabaseUser = null;

    try {
      // Check Supabase session
      const { data: { session }, error } = await assertSupabase().auth.getSession();
      
      if (error) {
        errors.push(`Supabase session error: ${error.message}`);
      } else if (session) {
        hasSupabaseSession = true;
        supabaseUser = session.user;
      }

      // Check app session
      const storage = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? window.localStorage 
        : AsyncStorage;

      if (Platform.OS === 'web') {
        const sessionData = storage.getItem('edudash_user_session');
        hasAppSession = !!sessionData;
      } else {
        const sessionData = await AsyncStorage.getItem('edudash_user_session');
        hasAppSession = !!sessionData;
      }

    } catch (error) {
      errors.push(`Auth state check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      hasSupabaseSession,
      hasAppSession,
      supabaseUser,
      errors,
    };
  }

  /**
   * Attempt to recover from authentication errors
   */
  static async recoverAuth(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('[AuthRecovery] Starting authentication recovery...');

      const authState = await this.checkAuthState();
      
      if (authState.errors.length > 0) {
        console.log('[AuthRecovery] Found authentication errors, clearing all data');
        await this.clearAllAuthData();
        
        // Sign out from Supabase to ensure clean state
        try {
          await assertSupabase().auth.signOut();
        } catch (e) {
          console.debug('Supabase signOut failed (expected if already signed out):', e);
        }

        return {
          success: true,
          message: 'Authentication data cleared. Please sign in again.',
        };
      }

      if (!authState.hasSupabaseSession && !authState.hasAppSession) {
        return {
          success: true,
          message: 'No authentication data found. Please sign in.',
        };
      }

      if (!authState.hasSupabaseSession && authState.hasAppSession) {
        console.log('[AuthRecovery] App session exists but Supabase session missing, clearing app session');
        await this.clearAllAuthData();
        
        return {
          success: true,
          message: 'Stale session data cleared. Please sign in again.',
        };
      }

      return {
        success: true,
        message: 'Authentication state is healthy.',
      };

    } catch (error) {
      console.error('[AuthRecovery] Recovery failed:', error);
      
      // Last resort: clear everything
      try {
        await this.clearAllAuthData();
        await assertSupabase().auth.signOut();
      } catch (e) {
        console.debug('Cleanup failed:', e);
      }

      return {
        success: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please clear browser data and try again.`,
      };
    }
  }

  /**
   * Force refresh the current session
   */
  static async forceRefreshSession(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('[AuthRecovery] Force refreshing session...');
      
      const { data, error } = await assertSupabase().auth.refreshSession();
      
      if (error) {
        return {
          success: false,
          message: `Session refresh failed: ${error.message}`,
        };
      }

      if (!data.session) {
        return {
          success: false,
          message: 'No session returned after refresh',
        };
      }

      return {
        success: true,
        message: 'Session refreshed successfully',
      };

    } catch (error) {
      return {
        success: false,
        message: `Refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Convenience functions for common recovery scenarios
export const clearAuthData = () => AuthRecovery.clearAllAuthData();
export const checkAuthHealth = () => AuthRecovery.checkAuthState();
export const recoverFromAuthError = () => AuthRecovery.recoverAuth();