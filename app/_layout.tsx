import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { startMonitoring } from '@/lib/monitoring';
import { initializeAdMob } from '@/lib/adMob';
import { initializeSession } from '@/lib/sessionManager';
import { getFeatureFlagsSync } from '@/lib/featureFlags';
import { track } from '@/lib/analytics';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { AuthProvider } from '@/contexts/AuthContext';
// Initialize i18n
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Start with feature flag validation
      const flags = getFeatureFlagsSync();
      
      // Honor Android-only testing rule
      if (flags.android_only_mode && Platform.OS !== 'android') {
        console.warn(`Android-only mode enabled, but running on ${Platform.OS}`);
        setInitError(`This build is configured for Android testing only. Current platform: ${Platform.OS}`);
        return;
      }

      // Initialize monitoring systems first (for error tracking during init)
      console.log('🔧 Initializing monitoring...');
      startMonitoring();
      
      // Track app initialization start
      track('edudash.app.initialization_started', {
        platform: Platform.OS,
        android_only_mode: flags.android_only_mode,
        production_db_dev: flags.production_db_dev_mode,
        admob_test_ids: flags.admob_test_ids,
      });

      // Initialize i18n (internationalization)
      console.log('🌍 Initializing internationalization...');
      // i18n is already initialized via import
      
      // Initialize session management
      console.log('🔐 Initializing session management...');
      await initializeSession();

      // Initialize AdMob with test IDs only
      console.log('📱 Initializing AdMob...');
      const adMobInitialized = await initializeAdMob();
      
      if (!adMobInitialized && flags.android_only_mode) {
        console.warn('AdMob failed to initialize in Android-only mode');
      }

      // Validate environment configuration
      console.log('⚙️  Validating environment...');
      validateEnvironment();

      // Mark initialization as complete
      setIsInitialized(true);
      
      console.log('✅ App initialization completed successfully');
      
      // Track successful initialization
      track('edudash.app.initialization_completed', {
        platform: Platform.OS,
        duration_ms: Date.now() - performance.now(),
        admob_initialized: adMobInitialized,
        feature_flags_loaded: true,
      });
      
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      
      setInitError(
        error instanceof Error 
          ? `Initialization failed: ${error.message}` 
          : 'Unknown initialization error'
      );
      
      // Track initialization failure
      track('edudash.app.initialization_failed', {
        platform: Platform.OS,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const validateEnvironment = () => {
    const flags = getFeatureFlagsSync();
    const requiredEnvVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_SENTRY_DSN',
      'EXPO_PUBLIC_POSTHOG_KEY',
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn('⚠️  Missing environment variables:', missingVars);
    }
    
    // Validate Android-only testing configuration
    if (flags.android_only_mode) {
      console.log('📋 Android-only testing mode validated:');
      console.log('  - Platform:', Platform.OS);
      console.log('  - Production DB as dev:', flags.production_db_dev_mode);
      console.log('  - AdMob test IDs only:', flags.admob_test_ids);
      console.log('  - PII scrubbing enabled:', process.env.EXPO_PUBLIC_PII_SCRUBBING_ENABLED);
    }
  };

  // Show loading screen during initialization
  if (!isInitialized && !initError) {
    return (
      <View style={initStyles.container}>
        <StatusBar style="light" backgroundColor="#0b1220" />
        <ActivityIndicator size="large" color="#00f5ff" />
        <Text style={initStyles.loadingText}>Initializing EduDash Pro...</Text>
        <Text style={initStyles.subText}>Setting up monitoring, session management, and feature flags</Text>
      </View>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View style={initStyles.container}>
        <StatusBar style="light" backgroundColor="#0b1220" />
        <Text style={initStyles.errorTitle}>⚠️ Initialization Error</Text>
        <Text style={initStyles.errorText}>{initError}</Text>
        <Text style={initStyles.subText}>Check console for details</Text>
      </View>
    );
  }

  return (
    // Provide auth context globally to mirror standalone app behavior
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        {/* Wrap in SubscriptionProvider so screens can access subscription data */}
        <SubscriptionProvider>
          <StatusBar style="light" backgroundColor="#0b1220" />
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: '#0b1220' },
              headerTitleStyle: { color: '#ffffff' },
              headerTintColor: '#00f5ff',
              contentStyle: { backgroundColor: '#0b1220' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack>
        </SubscriptionProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

const initStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
});
