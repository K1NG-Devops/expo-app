import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet, AppState, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { startMonitoring } from '@/lib/monitoring';
import { initializeAdMob } from '@/lib/adMob';
import { initializeSession } from '@/lib/sessionManager';
import { getFeatureFlagsSync } from '@/lib/featureFlags';
import { track } from '@/lib/analytics';
import { trackAppLaunch } from '@/lib/otaObservability';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { AdsProvider } from '@/contexts/AdsContext';
import { assertSupabase } from '@/lib/supabase';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
// Initialize i18n
import i18n from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedStackWrapper } from '@/components/navigation/ThemedStackWrapper';
import { Ionicons } from '@expo/vector-icons';
import { QueryProvider } from '@/lib/query/queryClient';
import { UpdatesProvider } from '@/contexts/UpdatesProvider';
import { GlobalUpdateBanner } from '@/components/GlobalUpdateBanner';
import { UpdateDebugPanel } from '@/components/debug/UpdateDebugPanel';
import { DashboardPreferencesProvider } from '@/contexts/DashboardPreferencesContext';

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    let active = true;
    const handler = async (state: string) => {
      if (state === 'active') {
        try {
          // Determine if a session exists
          let hasSession = false;
          try {
            const { data } = await assertSupabase().auth.getSession();
            hasSession = !!data.session?.user;
    } catch (error) {
            hasSession = false;
          }
          const shouldGate = await BiometricAuthService.shouldGate({ hasSession, graceMs: 30000 });
          if (shouldGate) {
            setLocked(true);
            const res = await BiometricAuthService.authenticate('Unlock EduDash Pro');
            if (active) setLocked(!res.success);
          }
        } catch {
          if (active) setLocked(false);
        }
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => {
      active = false;
      sub.remove();
    };
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
      // Hydrate persisted language before rendering
      try {
        const persistedLang = await AsyncStorage.getItem('@edudash_language');
        if (persistedLang) {
          (global as any).__EDUDASH_LANG__ = persistedLang;
          await i18n.changeLanguage(persistedLang);
          if (__DEV__) console.log('[i18n] Hydrated language:', persistedLang);
        }
      } catch (e) {
        console.warn('[i18n] Language hydration skipped', e);
      }
      
      // Initialize session management
      console.log('🔐 Initializing session management...');
      await initializeSession();

      // Optional: initialize biometric service (migration)
      try {
        await BiometricAuthService.init();
      } catch (e) {
        console.warn('Biometric service init failed (continuing):', e);
      }

      // AdMob initialization now happens in AdsProvider based on subscription tier
      // We'll remove this direct initialization to prevent duplication
      console.log('📱 AdMob initialization deferred to AdsProvider...');
      const adMobInitialized = true; // Assume success since AdsProvider handles actual initialization

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
      
      // Track app launch with OTA context
      trackAppLaunch();
      
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

    const telemetryDisabled = process.env.EXPO_PUBLIC_TELEMETRY_DISABLED === 'true';
    const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED !== 'false' && !telemetryDisabled;
    const posthogEnabled = process.env.EXPO_PUBLIC_POSTHOG_ENABLED !== 'false' && !telemetryDisabled;

    const alwaysRequired = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    ];

    const maybeRequired: string[] = [];
    if (sentryEnabled) maybeRequired.push('EXPO_PUBLIC_SENTRY_DSN');
    if (posthogEnabled) maybeRequired.push('EXPO_PUBLIC_POSTHOG_KEY');

    const missingVars = [...alwaysRequired, ...maybeRequired].filter(varName => !process.env[varName]);

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
      console.log('  - Telemetry disabled:', telemetryDisabled);
    }
  };

  // Show loading screen during initialization
  if (!isInitialized && !initError) {
    return (
      <ThemeProvider>
        <ThemedLoadingScreen />
      </ThemeProvider>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <ThemeProvider>
        <ThemedErrorScreen error={initError} />
      </ThemeProvider>
    );
  }

  return (
    // Provide auth context globally to mirror standalone app behavior
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <DashboardPreferencesProvider>
              <UpdatesProvider>
              {/* Wrap in SubscriptionProvider so screens can access subscription data */}
              <SubscriptionProvider>
                {/* Wrap in AdsProvider for ad display gating and control */}
                <AdsProvider>
                  <ThemedStackWrapper />
                  <GlobalUpdateBanner />
                  <UpdateDebugPanel />
                  {locked && <ThemedLockScreen onUnlock={() => setLocked(false)} />}
                </AdsProvider>
              </SubscriptionProvider>
              </UpdatesProvider>
            </DashboardPreferencesProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

// Themed Loading Screen Component
function ThemedLoadingScreen() {
  const { theme, isDark } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
      textAlign: 'center',
    },
    subText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
  });
  
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} hidden />
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.loadingText}>Initializing EduDash Pro...</Text>
      <Text style={styles.subText}>Setting up monitoring, session management, and feature flags</Text>
    </View>
  );
}



// Themed Error Screen Component
function ThemedErrorScreen({ error }: { error: string }) {
  const { theme, isDark } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.error,
      marginBottom: 16,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
  
  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} hidden />
      <Text style={styles.errorTitle}>⚠️ Initialization Error</Text>
      <Text style={styles.errorText}>{error}</Text>
      <Text style={styles.subText}>Check console for details</Text>
    </View>
  );
}

// Themed Lock Screen Component  
function ThemedLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { theme, isDark } = useTheme();
  const { t } = require('react-i18next').useTranslation('common');
  
  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.modalOverlay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      width: '85%',
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: { 
      color: theme.text, 
      fontWeight: '700', 
      fontSize: 20,
      marginBottom: 8,
    },
    subtitle: { 
      color: theme.textSecondary, 
      textAlign: 'center',
      fontSize: 16,
      marginBottom: 24,
    },
    tryBtn: { 
      backgroundColor: theme.primary, 
      paddingHorizontal: 24, 
      paddingVertical: 12, 
      borderRadius: 12,
      minWidth: 120,
    },
    tryBtnText: { 
      color: theme.onPrimary, 
      fontWeight: '600',
      fontSize: 16,
      textAlign: 'center',
    },
  });
  
  return (
    <View style={[styles.overlay, { pointerEvents: 'auto' as any }]}>
      <StatusBar style={isDark ? "light" : "dark"} hidden />
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={32} color={theme.onPrimary} />
        </View>
        <Text style={styles.title}>{t('settings.biometric.unlockApp')}</Text>
        <Text style={styles.subtitle}>{t('settings.biometric.authRequired')}</Text>
        <TouchableOpacity
          style={styles.tryBtn}
          onPress={async () => {
            const res = await BiometricAuthService.authenticate('Unlock EduDash Pro');
            if (res.success) onUnlock();
          }}
        >
          <Text style={styles.tryBtnText}>{t('settings.biometric.authenticate')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
