/**
 * Enhanced Biometric Authentication Service
 * 
 * Provides a more streamlined biometric authentication experience by maintaining
 * secure session tokens and bypassing email-based OTP flows for returning users.
 */

import { supabase } from '@/lib/supabase';
import { BiometricAuthService } from './BiometricAuthService';
import { Alert, Platform } from 'react-native';

// Dynamically import SecureStore to avoid web issues
let SecureStore: any = null;
try {
  if (Platform.OS !== 'web') {
    SecureStore = require('expo-secure-store');
  }
} catch (e) {
  console.debug('SecureStore import failed (web or unsupported platform)', e);
}

// Dynamically require AsyncStorage to avoid web/test issues
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.debug('AsyncStorage import failed (non-React Native env?)', e);
  // Web fallback using localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    AsyncStorage = {
      getItem: async (key: string) => {
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // ignore
        }
      },
      removeItem: async (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      },
    };
  }
}

// SecureStore adapter (preferred for iOS). Note: SecureStore has a ~2KB limit per item on Android.
const SecureStoreAdapter = SecureStore ? {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, { keychainService: key }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
} : null;

// AsyncStorage adapter (preferred for Android, no 2KB limit)
const AsyncStorageAdapter = AsyncStorage
  ? {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    }
  : null;

// In-memory fallback for tests or environments without the above storages
const MemoryStorageAdapter = {
  _map: new Map<string, string>(),
  getItem: async (key: string) => (MemoryStorageAdapter._map.has(key) ? MemoryStorageAdapter._map.get(key)! : null),
  setItem: async (key: string, value: string) => {
    MemoryStorageAdapter._map.set(key, value);
  },
  removeItem: async (key: string) => {
    MemoryStorageAdapter._map.delete(key);
  },
};

function chooseStorage() {
  try {
    // Web platform: use localStorage via AsyncStorage or memory fallback
    if (Platform?.OS === 'web') {
      if (AsyncStorageAdapter) return AsyncStorageAdapter;
      return MemoryStorageAdapter;
    }
    // Use AsyncStorage on Android to avoid SecureStore size limit warning/failures
    if (Platform?.OS === 'android' && AsyncStorageAdapter) return AsyncStorageAdapter;
    // iOS and other platforms: prefer SecureStore; fall back if unavailable
    if (SecureStoreAdapter) return SecureStoreAdapter;
    if (AsyncStorageAdapter) return AsyncStorageAdapter;
  } catch (e) {
    console.debug('chooseStorage unexpected error', e);
  }
  return MemoryStorageAdapter;
}

const storage = chooseStorage();

const BIOMETRIC_SESSION_KEY = 'biometric_session_token';
const BIOMETRIC_USER_PROFILE_KEY = 'biometric_user_profile';
const BIOMETRIC_REFRESH_TOKEN_KEY = 'biometric_refresh_token';

export interface BiometricSessionData {
  userId: string;
  email: string;
  sessionToken: string;
  expiresAt: string;
  lastUsed: string;
  profileSnapshot?: any;
}

export class EnhancedBiometricAuth {
  /**
   * Store secure session data for biometric users
   */
  static async storeBiometricSession(userId: string, email: string, profile?: any, refreshToken?: string): Promise<boolean> {
    try {
      // Create a session token that's valid for 30 days
      const expirationTime = new Date();
      expirationTime.setDate(expirationTime.getDate() + 30);
      
      const sessionData: BiometricSessionData = {
        userId,
        email,
        sessionToken: await this.generateSecureToken(),
        expiresAt: expirationTime.toISOString(),
        lastUsed: new Date().toISOString(),
        profileSnapshot: profile ? {
          role: profile.role,
          organization_id: profile.organization_id,
          seat_status: profile.seat_status,
          cached_at: new Date().toISOString()
        } : undefined
      };

      await storage.setItem(
        BIOMETRIC_SESSION_KEY,
        JSON.stringify(sessionData)
      );

      // Persist refresh token separately (prefer SecureStore)
      try {
        let tokenToStore = refreshToken;
        if (!tokenToStore) {
          // Try to get current session's refresh token
          const { getCurrentSession } = await import('@/lib/sessionManager');
          const current = await getCurrentSession();
          tokenToStore = current?.refresh_token;
        }
        if (tokenToStore) {
          if (SecureStore) {
            await SecureStore.setItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY, tokenToStore);
          } else if (AsyncStorage) {
            await AsyncStorage.setItem(BIOMETRIC_REFRESH_TOKEN_KEY, tokenToStore);
          }
        }
      } catch (storeTokenErr) {
        console.warn('Could not store biometric refresh token:', storeTokenErr);
      }

      console.log('Stored biometric session data for user:', email);
      return true;
    } catch (error) {
      console.error('Error storing biometric session:', error);
      return false;
    }
  }

  /**
   * Get stored biometric session data
   */
  static async getBiometricSession(): Promise<BiometricSessionData | null> {
    try {
      const sessionDataString = await storage.getItem(BIOMETRIC_SESSION_KEY);
      if (!sessionDataString) {
        return null;
      }

      const sessionData: BiometricSessionData = JSON.parse(sessionDataString);
      
      // Check if session is expired
      const expirationTime = new Date(sessionData.expiresAt);
      if (expirationTime < new Date()) {
        console.log('Biometric session expired, clearing data');
        await this.clearBiometricSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Error getting biometric session:', error);
      return null;
    }
  }

  /**
   * Clear stored biometric session
   */
  static async clearBiometricSession(): Promise<void> {
    try {
      await storage.removeItem(BIOMETRIC_SESSION_KEY);
      await storage.removeItem(BIOMETRIC_USER_PROFILE_KEY);
    } catch (error) {
      console.error('Error clearing biometric session:', error);
    }
  }

  /**
   * Perform enhanced biometric authentication with session management
   */
  static async authenticateWithBiometric(): Promise<{
    success: boolean;
    userData?: BiometricSessionData;
    sessionRestored?: boolean;
    error?: string;
  }> {
    try {
      // First check if device biometrics are available and enrolled
      const capabilities = await BiometricAuthService.checkCapabilities();
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Biometric authentication is not available or not enrolled on this device'
        };
      }

      // Get stored session data
      const sessionData = await this.getBiometricSession();
      if (!sessionData) {
        return {
          success: false,
          error: 'No biometric session found. Please sign in with password first.'
        };
      }

      // Perform biometric authentication
      const authResult = await BiometricAuthService.authenticate(
        'Use biometric authentication to sign in'
      );

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Biometric authentication failed'
        };
      }

      // Try to restore Supabase session if needed
      let sessionRestored = false;
      try {
        const { supabase } = await import('@/lib/supabase');
        if (supabase) {
          // Check if current session is valid
          const { data } = await supabase.auth.getSession();
          
          if (!data.session?.user) {
            console.log('No active Supabase session, attempting to restore');
            // Try to get stored session and refresh it (uses refresh flow if expired)
            const { getCurrentSession } = await import('@/lib/sessionManager');
            const storedSession = await getCurrentSession();
            
            // Try stored session first
            if (storedSession) {
              console.log('Found stored session, setting Supabase session via refresh');
              const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession({
                refresh_token: storedSession.refresh_token,
              });

              if (!refreshErr && refreshed?.session?.user) {
                console.log('Successfully refreshed and restored Supabase session');
                sessionRestored = true;
              } else {
                console.warn('Refresh failed from stored session, trying biometric refresh token');
                // Try biometric-stored refresh token
                let biometricRefresh: string | null = null;
                try {
                  biometricRefresh = SecureStore 
                    ? await SecureStore.getItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY)
                    : await AsyncStorage.getItem(BIOMETRIC_REFRESH_TOKEN_KEY);
                } catch {}

                if (biometricRefresh) {
                  const { data: refreshed2, error: refreshErr2 } = await supabase.auth.refreshSession({
                    refresh_token: biometricRefresh,
                  });
                  if (!refreshErr2 && refreshed2?.session?.user) {
                    console.log('Restored Supabase session using biometric refresh token');
                    sessionRestored = true;
                  } else {
                    console.warn('Biometric refresh token restore failed, falling back to setSession');
                    const { error: sessionError } = await supabase.auth.setSession({
                      access_token: storedSession.access_token,
                      refresh_token: storedSession.refresh_token,
                    });
                    if (!sessionError) {
                      console.log('Successfully restored Supabase session via setSession');
                      sessionRestored = true;
                    } else {
                      console.error('Failed to restore Supabase session:', sessionError || refreshErr2 || refreshErr);
                    }
                  }
                } else {
                  console.warn('No biometric refresh token available');
                }
              }
            } else {
              // No stored session at all (likely after sign out). Try biometric refresh token directly.
              let biometricRefresh: string | null = null;
              try {
                biometricRefresh = SecureStore 
                  ? await SecureStore.getItemAsync(BIOMETRIC_REFRESH_TOKEN_KEY)
                  : await AsyncStorage.getItem(BIOMETRIC_REFRESH_TOKEN_KEY);
              } catch {}
              if (biometricRefresh) {
                const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession({
                  refresh_token: biometricRefresh,
                });
                if (!refreshErr && refreshed?.session?.user) {
                  console.log('Restored Supabase session using biometric refresh token (no stored session)');
                  sessionRestored = true;
                } else {
                  console.error('Failed to restore session using biometric refresh token:', refreshErr);
                }
              }
            }
          } else {
            console.log('Valid Supabase session already exists');
            sessionRestored = true;
          }
        }
      } catch (sessionError) {
        console.error('Error during session restoration:', sessionError);
        // Continue anyway, as biometric auth was successful
      }

      // Update last used time
      sessionData.lastUsed = new Date().toISOString();
      await storage.setItem(
        BIOMETRIC_SESSION_KEY,
        JSON.stringify(sessionData)
      );

      console.log('Enhanced biometric authentication successful for:', sessionData.email);
      
      // Ensure session data is persisted for later restores if we refreshed tokens
      if (sessionRestored) {
        try {
          const { getCurrentSession } = await import('@/lib/sessionManager');
          const current = await getCurrentSession();
          if (current) {
            await storage.setItem(
              BIOMETRIC_SESSION_KEY,
              JSON.stringify({
                ...sessionData,
                lastUsed: new Date().toISOString(),
              })
            );
          }
        } catch (persistErr) {
          console.warn('Could not persist biometric session after restore:', persistErr);
        }
      }

      return {
        success: true,
        userData: sessionData,
        sessionRestored
      };

    } catch (error) {
      console.error('Enhanced biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed due to an error'
      };
    }
  }

  /**
   * Setup biometric authentication for a user after successful password login
   */
  static async setupBiometricForUser(user: any, profile?: any): Promise<boolean> {
    try {
      const capabilities = await BiometricAuthService.checkCapabilities();
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        Alert.alert(
          'Biometric Setup',
          'Biometric authentication is not available or not set up on this device.'
        );
        return false;
      }

      // Test biometric authentication
      const authResult = await BiometricAuthService.authenticate(
        'Enable biometric sign-in for faster access'
      );

      if (!authResult.success) {
        Alert.alert(
          'Setup Failed',
          authResult.error || 'Could not verify biometric authentication'
        );
        return false;
      }

      // Enable biometric auth in the service
      const enableResult = await BiometricAuthService.enableBiometric(user.id, user.email);
      if (!enableResult) {
        return false;
      }

      // Store enhanced session data
      const sessionStored = await this.storeBiometricSession(user.id, user.email, profile);
      if (!sessionStored) {
        // Rollback biometric enablement if session storage fails
        await BiometricAuthService.disableBiometric();
        Alert.alert('Setup Failed', 'Could not complete biometric setup');
        return false;
      }

      Alert.alert(
        'Biometric Sign-In Enabled',
        'You can now use biometric authentication to sign in quickly and securely.'
      );

      return true;
    } catch (error) {
      console.error('Error setting up biometric authentication:', error);
      Alert.alert('Setup Error', 'Failed to set up biometric authentication');
      return false;
    }
  }

  /**
   * Update cached profile data for biometric session
   */
  static async updateCachedProfile(profile: any): Promise<void> {
    try {
      const sessionData = await this.getBiometricSession();
      if (sessionData) {
        sessionData.profileSnapshot = {
          role: profile.role,
          organization_id: profile.organization_id,
          seat_status: profile.seat_status,
          cached_at: new Date().toISOString()
        };

        await storage.setItem(
          BIOMETRIC_SESSION_KEY,
          JSON.stringify(sessionData)
        );
      }
    } catch (error) {
      console.error('Error updating cached profile:', error);
    }
  }

  /**
   * Generate a secure token for session management
   */
  private static async generateSecureToken(): Promise<string> {
    try {
      // Use the centralized crypto utility
      const { generateSecureToken } = await import('@/utils/crypto');
      return await generateSecureToken(32);
    } catch (error) {
      console.error('Error generating secure token:', error);
      
      // Ultimate fallback: simple but functional
      const timestamp = Date.now().toString(16);
      const random1 = Math.random().toString(16).substring(2);
      const random2 = Math.random().toString(16).substring(2);
      const random3 = Math.random().toString(16).substring(2);
      return (timestamp + random1 + random2 + random3).substring(0, 64);
    }
  }
}