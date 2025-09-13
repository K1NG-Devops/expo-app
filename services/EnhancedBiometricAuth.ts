/**
 * Enhanced Biometric Authentication Service
 * 
 * Provides a more streamlined biometric authentication experience by maintaining
 * secure session tokens and bypassing email-based OTP flows for returning users.
 */

import { supabase } from '@/lib/supabase';
import { BiometricAuthService } from './BiometricAuthService';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BIOMETRIC_SESSION_KEY = 'biometric_session_token';
const BIOMETRIC_USER_PROFILE_KEY = 'biometric_user_profile';

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
  static async storeBiometricSession(userId: string, email: string, profile?: any): Promise<boolean> {
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

      await SecureStore.setItemAsync(
        BIOMETRIC_SESSION_KEY,
        JSON.stringify(sessionData)
      );

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
      const sessionDataString = await SecureStore.getItemAsync(BIOMETRIC_SESSION_KEY);
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
      await SecureStore.deleteItemAsync(BIOMETRIC_SESSION_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_USER_PROFILE_KEY);
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
    error?: string;
  }> {
    try {
      // First check if biometrics are available and enabled
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      if (!securityInfo.isEnabled || !securityInfo.capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available or enabled'
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

      // Update last used time
      sessionData.lastUsed = new Date().toISOString();
      await SecureStore.setItemAsync(
        BIOMETRIC_SESSION_KEY,
        JSON.stringify(sessionData)
      );

      console.log('Enhanced biometric authentication successful for:', sessionData.email);
      
      return {
        success: true,
        userData: sessionData
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

        await SecureStore.setItemAsync(
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
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}