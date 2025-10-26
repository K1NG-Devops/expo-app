/**
 * Enhanced Biometric Debug Utility
 * 
 * Extended debugging for biometric authentication with session management
 */

import { BiometricAuthService } from '@/services/BiometricAuthService';
import { EnhancedBiometricAuth } from '@/services/EnhancedBiometricAuth';
import { getCurrentSession, getCurrentProfile } from '@/lib/sessionManager';
import { assertSupabase } from '@/lib/supabase';

export class BiometricDebugExtended {
  /**
   * Run comprehensive biometric authentication tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Starting Enhanced Biometric Authentication Tests');
    console.log('=================================================');

    try {
      // Test 1: Check capabilities
      console.log('\n1️⃣ Testing Biometric Capabilities...');
      const capabilities = await BiometricAuthService.checkCapabilities();
      console.log('Capabilities:', JSON.stringify(capabilities, null, 2));

      // Test 2: Check security info
      console.log('\n2️⃣ Testing Security Info...');
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      console.log('Security Info:', JSON.stringify(securityInfo, null, 2));

      // Test 3: Check stored biometric data
      console.log('\n3️⃣ Testing Stored Biometric Data...');
      const storedData = await BiometricAuthService.getStoredBiometricData();
      console.log('Stored Data:', storedData);

      // Test 4: Check enhanced biometric session
      console.log('\n4️⃣ Testing Enhanced Biometric Session...');
      const enhancedSession = await EnhancedBiometricAuth.getBiometricSession();
      console.log('Enhanced Session:', enhancedSession ? 'Found' : 'Not found');
      if (enhancedSession) {
        console.log('Session Details:', {
          userId: enhancedSession.userId,
          email: enhancedSession.email,
          expiresAt: enhancedSession.expiresAt,
          lastUsed: enhancedSession.lastUsed,
          hasProfile: !!enhancedSession.profileSnapshot
        });
      }

      // Test 5: Check session manager data
      console.log('\n5️⃣ Testing Session Manager Data...');
      const currentSession = await getCurrentSession();
      const currentProfile = await getCurrentProfile();
      console.log('Current Session:', currentSession ? 'Found' : 'Not found');
      if (currentSession) {
        console.log('Session Details:', {
          userId: currentSession.user_id,
          email: currentSession.email,
          expiresAt: new Date(currentSession.expires_at * 1000).toISOString()
        });
      }
      console.log('Current Profile:', currentProfile ? currentProfile.role : 'Not found');

      // Test 6: Check Supabase session
      console.log('\n6️⃣ Testing Supabase Session...');
      try {
        const { data, error } = await assertSupabase().auth.getSession();
        console.log('Supabase Session:', data.session ? 'Active' : 'None');
        console.log('Supabase User:', data.session?.user?.email || 'None');
        if (error) console.log('Supabase Error:', error);
      } catch { /* Intentional: non-fatal */ }

      console.log('\n✅ All tests completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  /**
   * Test the complete biometric login flow
   */
  static async testCompleteLoginFlow(): Promise<void> {
    console.log('🔐 Testing Complete Biometric Login Flow');
    console.log('=========================================');

    try {
      // Step 1: Check if biometric is available and enabled
      console.log('\n1️⃣ Checking Biometric Availability...');
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      
      if (!securityInfo.isEnabled || !securityInfo.capabilities.isAvailable) {
        console.log('❌ Biometric authentication is not available or enabled');
        console.log('Security Info:', securityInfo);
        return;
      }
      
      console.log('✅ Biometric authentication is available and enabled');

      // Step 2: Check for stored session data
      console.log('\n2️⃣ Checking Stored Session Data...');
      const enhancedSession = await EnhancedBiometricAuth.getBiometricSession();
      
      if (!enhancedSession) {
        console.log('❌ No enhanced biometric session found');
        console.log('ℹ️ User needs to log in with password first to enable biometric authentication');
        return;
      }
      
      console.log('✅ Enhanced biometric session found');
      console.log('Session expires:', enhancedSession.expiresAt);

      // Step 3: Test biometric authentication
      console.log('\n3️⃣ Testing Biometric Authentication...');
      const basicAuth = await BiometricAuthService.authenticate('Test biometric login flow');
      
      if (!basicAuth.success) {
        console.log('❌ Biometric authentication failed:', basicAuth.error);
        return;
      }
      
      console.log('✅ Biometric authentication successful');

      // Step 4: Test enhanced authentication with session restoration
      console.log('\n4️⃣ Testing Enhanced Authentication with Session Restoration...');
      const enhancedAuth = await EnhancedBiometricAuth.authenticateWithBiometric();
      
      if (!enhancedAuth.success) {
        console.log('❌ Enhanced authentication failed:', enhancedAuth.error);
        return;
      }
      
      console.log('✅ Enhanced authentication successful');
      console.log('Session restored:', enhancedAuth.sessionRestored);

      // Step 5: Verify Supabase session
      console.log('\n5️⃣ Verifying Supabase Session...');
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          console.log('✅ Supabase session is active');
          console.log('User:', data.session.user.email);
        } else {
          console.log('❌ No active Supabase session');
        }
      }

      console.log('\n🎉 Complete biometric login flow test successful!');
      
    } catch (error) {
      console.error('❌ Login flow test failed:', error);
    }
  }

  /**
   * Test session restoration specifically
   */
  static async testSessionRestoration(): Promise<void> {
    console.log('🔄 Testing Session Restoration');
    console.log('===============================');

    try {
      // Check current state
      console.log('\n1️⃣ Checking Current State...');
      const currentSession = await getCurrentSession();
      const enhancedSession = await EnhancedBiometricAuth.getBiometricSession();
      
      console.log('Session Manager Session:', currentSession ? 'Present' : 'Missing');
      console.log('Enhanced Biometric Session:', enhancedSession ? 'Present' : 'Missing');
      
      try {
        let { data } = await assertSupabase().auth.getSession();
        console.log('Initial Supabase Session:', data.session ? 'Active' : 'None');

        // If no active session, try to restore
        if (!data.session?.user && currentSession) {
          console.log('\n2️⃣ Attempting Session Restoration...');
          console.log('Using stored session:', {
            userId: currentSession.user_id,
            email: currentSession.email,
            expiresAt: new Date(currentSession.expires_at * 1000).toISOString()
          });
          
          const { error } = await assertSupabase().auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token
          });
          
          if (!error) {
            console.log('✅ Session restoration successful!');
            const { data: newData } = await assertSupabase().auth.getSession();
            console.log('Restored Session User:', newData.session?.user?.email);
            console.log('Session expires at:', new Date((newData.session?.expires_at || 0) * 1000).toISOString());
          } else {
            console.log('❌ Session restoration failed:', error.message);
          }
        } else if (data.session?.user) {
          console.log('✅ Active session already exists, no restoration needed');
        } else {
          console.log('❌ No stored session available for restoration');
        }
      } catch (e) {
        console.warn('Supabase session check failed:', e);
      }

    } catch (error) {
      console.error('❌ Session restoration test failed:', error);
    }
  }

  /**
   * Generate comprehensive debug report
   */
  static async generateComprehensiveReport(): Promise<string> {
    const report: string[] = [];
    
    report.push('🔍 COMPREHENSIVE BIOMETRIC DEBUG REPORT');
    report.push('======================================');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    try {
      // Device and capabilities
      const capabilities = await BiometricAuthService.checkCapabilities();
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      
      // Crypto information
      const { getCryptoInfo } = await import('@/utils/crypto');
      const cryptoInfo = getCryptoInfo();
      
      report.push('📱 DEVICE INFORMATION:');
      report.push(`Brand: ${capabilities.deviceInfo?.brand || 'Unknown'}`);
      report.push(`Model: ${capabilities.deviceInfo?.modelName || 'Unknown'}`);
      report.push(`OS: ${capabilities.deviceInfo?.osName || 'Unknown'} ${capabilities.deviceInfo?.osVersion || ''}`);
      report.push(`Platform: ${capabilities.deviceInfo?.platform || 'Unknown'}`);
      report.push('');

      report.push('🔐 BIOMETRIC CAPABILITIES:');
      report.push(`Hardware Available: ${capabilities.hasHardware}`);
      report.push(`Biometrics Enrolled: ${capabilities.isEnrolled}`);
      report.push(`Security Level: ${capabilities.securityLevel}`);
      report.push(`Supported Types: [${capabilities.supportedTypeNames?.join(', ') || 'None'}]`);
      report.push('');

      report.push('🛡️ EDUDASH BIOMETRIC SERVICE:');
      report.push(`Service Available: ${securityInfo.capabilities.isAvailable}`);
      report.push(`Service Enrolled: ${securityInfo.capabilities.isEnrolled}`);
      report.push(`Service Enabled: ${securityInfo.isEnabled}`);
      report.push(`Available Types: [${securityInfo.availableTypes.join(', ')}]`);
      report.push('');
      
      report.push('🔐 CRYPTO CAPABILITIES:');
      report.push(`Web Crypto API: ${cryptoInfo.hasWebCrypto ? '✅' : '❌'}`);
      report.push(`Global Crypto: ${cryptoInfo.hasGlobalCrypto ? '✅' : '❌'}`);
      report.push(`Expo Crypto: ${cryptoInfo.hasExpoCrypto ? '✅' : '❌'}`);
      report.push(`Recommended Method: ${cryptoInfo.recommendedMethod}`);
      report.push('');

      // Session information
      const currentSession = await getCurrentSession();
      const currentProfile = await getCurrentProfile();
      const enhancedSession = await EnhancedBiometricAuth.getBiometricSession();
      
      report.push('📊 SESSION STATUS:');
      report.push(`Session Manager: ${currentSession ? 'Active' : 'None'}`);
      if (currentSession) {
        report.push(`  User ID: ${currentSession.user_id}`);
        report.push(`  Email: ${currentSession.email}`);
        report.push(`  Expires: ${new Date(currentSession.expires_at * 1000).toISOString()}`);
        const timeLeft = currentSession.expires_at * 1000 - Date.now();
        report.push(`  Time Left: ${Math.max(0, Math.floor(timeLeft / 1000 / 60))} minutes`);
      }
      
      report.push(`Enhanced Session: ${enhancedSession ? 'Active' : 'None'}`);
      if (enhancedSession) {
        report.push(`  User ID: ${enhancedSession.userId}`);
        report.push(`  Email: ${enhancedSession.email}`);
        report.push(`  Expires: ${enhancedSession.expiresAt}`);
        report.push(`  Last Used: ${enhancedSession.lastUsed}`);
        report.push(`  Has Profile Cache: ${!!enhancedSession.profileSnapshot}`);
      }
      
      report.push(`User Profile: ${currentProfile ? currentProfile.role : 'None'}`);
      
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        report.push(`Supabase Session: ${data.session ? 'Active' : 'None'}`);
        if (data.session) {
          report.push(`  User: ${data.session.user?.email}`);
          report.push(`  Expires: ${new Date((data.session.expires_at || 0) * 1000).toISOString()}`);
        }
      }
      report.push('');

      // Diagnostics and recommendations
      report.push('🚨 DIAGNOSTIC RESULTS:');
      
      if (!capabilities.isAvailable) {
        report.push('❌ CRITICAL: Biometric hardware not available');
      } else if (!capabilities.isEnrolled) {
        report.push('⚠️ WARNING: No biometric data enrolled on device');
      } else if (!securityInfo.isEnabled) {
        report.push('ℹ️ INFO: Biometric authentication available but not enabled in app');
      } else if (!enhancedSession) {
        report.push('ℹ️ INFO: Biometric enabled but no session data (user needs to log in with password)');
      } else if (!currentSession) {
        report.push('⚠️ WARNING: Enhanced session exists but no session manager session');
      } else {
        report.push('✅ SUCCESS: All systems functioning correctly');
      }
      
      report.push('');
      report.push('💡 RECOMMENDATIONS:');
      
      if (capabilities.deviceInfo?.brand === 'OPPO') {
        report.push('• OPPO device: Consider using BIOMETRIC_WEAK security level for better compatibility');
      }
      
      if (!cryptoInfo.hasWebCrypto && !cryptoInfo.hasGlobalCrypto && !cryptoInfo.hasExpoCrypto) {
        report.push('• No secure crypto available - using fallback token generation (less secure)');
      }
      
      if (!capabilities.isAvailable) {
        report.push('• This device does not support biometric authentication');
      } else if (!capabilities.isEnrolled) {
        report.push('• Set up fingerprint or face recognition in device settings');
      } else if (!securityInfo.isEnabled) {
        report.push('• Enable biometric login in app settings');
      } else if (!enhancedSession && securityInfo.isEnabled) {
        report.push('• Log in with password once to initialize biometric authentication');
      } else if (enhancedSession && !currentSession) {
        report.push('• Session restoration may be needed');
      } else {
        report.push('• System is properly configured for biometric authentication');
      }

    } catch (error) {
      report.push(`❌ Error generating report: ${error}`);
    }

    report.push('');
    report.push('=== END REPORT ===');

    return report.join('\n');
  }

  /**
   * Test biometric authentication with detailed logging
   */
  static async testAuthWithLogging(): Promise<void> {
    console.log('🔍 Testing Biometric Authentication with Detailed Logging');
    console.log('========================================================');

    try {
      // Pre-auth checks
      console.log('\n📋 Pre-Authentication Checks:');
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      console.log('Capabilities:', securityInfo.capabilities);
      console.log('Is Enabled:', securityInfo.isEnabled);
      console.log('Available Types:', securityInfo.availableTypes);

      if (!securityInfo.capabilities.isAvailable || !securityInfo.capabilities.isEnrolled) {
        console.log('❌ Cannot proceed: Biometric not available or not enrolled');
        return;
      }

      if (!securityInfo.isEnabled) {
        console.log('❌ Cannot proceed: Biometric authentication not enabled');
        return;
      }

      // Attempt authentication
      console.log('\n🔐 Attempting Authentication...');
      const startTime = Date.now();
      
      const result = await BiometricAuthService.authenticate(
        'Test authentication with detailed logging'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Authentication completed in ${duration}ms`);
      console.log('Result:', result);
      
      if (result.success) {
        console.log('✅ Authentication successful!');
        console.log('Biometric type used:', result.biometricType || 'Unknown');
      } else {
        console.log('❌ Authentication failed:', result.error);
      }

    } catch (error) {
      console.error('❌ Authentication test failed:', error);
    }
  }

  /**
   * Clean up all biometric data (for troubleshooting)
   */
  static async cleanupAllData(): Promise<void> {
    console.log('🧹 Cleaning up all biometric data...');
    
    try {
      await BiometricAuthService.disableBiometric();
      console.log('✅ Disabled biometric service');
      
      await EnhancedBiometricAuth.clearBiometricSession();
      console.log('✅ Cleared enhanced biometric session');
      
      console.log('✅ All biometric data cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up biometric data:', error);
    }
  }
}

export default BiometricDebugExtended;