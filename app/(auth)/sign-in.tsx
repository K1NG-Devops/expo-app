import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator, ScrollView, KeyboardAvoidingView } from "react-native";
import { Stack, router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { assertSupabase } from "@/lib/supabase";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { SocialLoginButtons } from '@/components/ui/SocialLoginButtons';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import * as SecureStore from 'expo-secure-store';
import { signInWithSession } from '@/lib/sessionManager';

export default function SignIn() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [storedUserEmail, setStoredUserEmail] = useState<string | null>(null);
  const [showBiometricLoading, setShowBiometricLoading] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false); // Track if biometric failed
  const shouldAutoTriggerBiometric = useRef(false);
  const hasTriggeredBiometric = useRef(false);

  // Load saved credentials and check biometric availability
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Check biometric availability
        const securityInfo = await BiometricAuthService.getSecurityInfo();
        const isAvailable = securityInfo.capabilities.isAvailable && securityInfo.capabilities.isEnrolled;
        const biometricEnabled = isAvailable && securityInfo.isEnabled;
        setBiometricAvailable(biometricEnabled);
        
        // Determine biometric type
        const availableTypes = securityInfo.availableTypes;
        if (availableTypes.includes('Fingerprint')) {
          setBiometricType('fingerprint');
        } else if (availableTypes.includes('Face ID')) {
          setBiometricType('face');
        } else {
          setBiometricType('biometric');
        }
        
        // Load saved email from remember me
        const savedRememberMe = await AsyncStorage.getItem('rememberMe');
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        if (savedRememberMe === 'true' && savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
          setStoredUserEmail(savedEmail);
          
          // Try to load saved password from secure store (sanitize email for secure store key)
          const sanitizedKey = `password_${savedEmail.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const savedPassword = await SecureStore.getItemAsync(sanitizedKey);
          if (savedPassword) {
            setPassword(savedPassword);
          }
          
          // Set flag to auto-trigger biometric authentication if available and credentials are saved
          if (biometricEnabled && savedPassword) {
            console.log('[Sign-In] Biometric credentials available, will auto-trigger');
            shouldAutoTriggerBiometric.current = true;
          }
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('auth.sign_in.enter_email_password', { defaultValue: 'Please enter email and password' }));
      return;
    }

    setLoading(true);
    let signInSuccess = false;
    
    try {
      // Use centralized session manager to avoid throwing on network/storage quirks
      const res = await signInWithSession(email.trim(), password);
      if (res.error) {
        Alert.alert(t('auth.sign_in.failed', { defaultValue: 'Sign In Failed' }), res.error);
        setLoading(false);
        return;
      }

      console.log('Sign in successful:', email.trim());
      signInSuccess = true;

      // Save remember me preference and credentials (best-effort; do not block sign-in)
      try {
        if (rememberMe) {
          await AsyncStorage.setItem('rememberMe', 'true');
          await AsyncStorage.setItem('savedEmail', email.trim());
          const sanitizedKey = `password_${email.trim().replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await SecureStore.setItemAsync(sanitizedKey, password);
        } else {
          await AsyncStorage.removeItem('rememberMe');
          await AsyncStorage.removeItem('savedEmail');
          const sanitizedKey = `password_${email.trim().replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          try { await SecureStore.deleteItemAsync(sanitizedKey); } catch { /* Intentional: non-fatal */ }
        }
      } catch (credErr) {
        console.warn('Remember me save failed:', credErr);
      }

      // AuthContext will handle routing via auth state change listener
      // No fallback timeout needed - this was causing double navigation
      console.log('[Sign-In] Sign-in complete, AuthContext will handle routing');
      
      // Keep loading true - AuthContext will handle routing and the screen will unmount
      // Don't set loading false when sign-in succeeds
    } catch (_error: any) {
      // Enhanced debug logging to trace error source
      console.error('=== SIGN IN ERROR DEBUG ===');
      console.error('Error object:', _error);
      console.error('Error name:', _error?.name);
      console.error('Error message:', _error?.message);
      console.error('Error stack:', _error?.stack);
      console.error('Error cause:', _error?.cause);
      console.error('Error keys:', Object.keys(_error || {}));
      console.error('========================');
      
      const msg = _error?.message || t('common.unexpected_error', { defaultValue: 'An unexpected error occurred' });
      Alert.alert(t('common.error', { defaultValue: 'Error' }), msg);
      setLoading(false);
    }
  };

  const handleBiometricLogin = async (isAutoTrigger = false) => {
    if (!biometricAvailable) {
      Alert.alert(t('auth.biometric_not_available.title', { defaultValue: 'Biometric Not Available' }), t('auth.biometric_not_available.desc', { defaultValue: 'Please use your password to sign in.' }));
      return;
    }

    if (isAutoTrigger) {
      setShowBiometricLoading(true);
    }
    setLoading(true);
    
    try {
      // Authenticate with biometrics
      const authResult = await BiometricAuthService.authenticate(t('auth.biometric.prompt', { defaultValue: 'Sign in to EduDash Pro' }));
      
      if (authResult.success) {
        // Use stored credentials to sign in
        if (email && password) {
          // Optionally clear the biometric loading overlay now; sign-in flow will proceed
          setShowBiometricLoading(false);
          // Delegate to email/password sign-in (will set its own loading state)
          setLoading(false);
          await handleSignIn();
        } else {
          // No saved credentials: stop any loading and show the form
          setShowBiometricLoading(false);
          setLoading(false);
          Alert.alert(t('common.error', { defaultValue: 'Error' }), t('auth.sign_in.no_saved_credentials', { defaultValue: 'No saved credentials found. Please sign in with your password.' }));
        }
      } else {
        // Biometric failed/cancelled: stop spinners and show password form
        setShowBiometricLoading(false);
        setLoading(false);
        setBiometricFailed(true); // Show password form
        // Only show alert if user didn't just cancel
        if (authResult.error && !authResult.error.includes('cancel')) {
          Alert.alert(t('auth.biometric_failed.title', { defaultValue: 'Authentication Failed' }), authResult.error || t('auth.biometric_failed.desc', { defaultValue: 'Biometric authentication failed' }));
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      setShowBiometricLoading(false);
      setLoading(false);
      setBiometricFailed(true); // Show password form on error
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('auth.biometric_failed.unexpected', { defaultValue: 'An error occurred during biometric authentication' }));
    }
  };

  // Auto-trigger biometric authentication when ready
  useEffect(() => {
    if (shouldAutoTriggerBiometric.current && !hasTriggeredBiometric.current && biometricAvailable && email && password) {
      hasTriggeredBiometric.current = true;
      console.log('[Sign-In] Auto-triggering biometric authentication');
      // Small delay to ensure UI is ready
      setTimeout(() => {
        handleBiometricLogin(true);
      }, 500);
    }
  }, [biometricAvailable, email, password]);

  const handleSocialLogin = async (provider: string) => {
    try {
      const supabase = assertSupabase();
      const redirectTo = Linking.createURL('/auth-callback');
      // Map UI provider name to Supabase provider id
      const mapped = provider === 'microsoft' ? 'azure' : provider; // 'azure' for Microsoft
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: mapped as any,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web' ? false : undefined,
        },
      });
      
      if (error) {
        console.error('OAuth Error:', error);
        let errorMessage = t('auth.oauth.failed_start', { defaultValue: 'Failed to start social login' });
        
        if (error.message?.includes('provider is not enabled') || 
            error.message?.includes('Unsupported provider')) {
          errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not available yet. Please use email/password sign-in or contact support.`;
        } else if (error.message?.includes('redirect_uri')) {
          errorMessage = t('auth.oauth.config_error', { defaultValue: 'OAuth configuration error. Please contact support.' });
        } else {
          errorMessage = error.message;
        }
        
        Alert.alert(t('auth.oauth.unavailable', { defaultValue: 'Sign-in Unavailable' }), errorMessage);
        return;
      }
    } catch (e: any) {
      console.error('OAuth Exception:', e);
      let errorMessage = t('auth.oauth.failed_start', { defaultValue: 'Failed to start social login' });
      
      if (e?.message?.includes('provider is not enabled') || 
          e?.message?.includes('Unsupported provider')) {
        errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not available yet. Please use email/password sign-in or contact support.`;
      } else {
        errorMessage = e?.message || t('common.unexpected_error', { defaultValue: 'An unexpected error occurred' });
      }
      
      Alert.alert(t('auth.oauth.error', { defaultValue: 'Sign-in Error' }), errorMessage);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      Alert.alert('Email required', 'Enter your email above, then tap Resend.');
      return;
    }
    try {
      const { error } = await assertSupabase().auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: 'https://www.edudashpro.org.za/landing?flow=email-confirm',
        },
      } as any);
      if (error) throw error;
      Alert.alert('Sent', 'We have resent the confirmation email. Please check your inbox and spam folder.');
    } catch (e: any) {
      let msg = e?.message || 'Failed to resend confirmation';
      if (msg.toLowerCase().includes('already confirmed')) {
        msg = 'This email is already confirmed. You can sign in now.';
      }
      Alert.alert('Resend', msg);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardView: {
      flex: 1,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
      paddingTop: 20,
    },
    logoCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 2,
      borderColor: theme.border,
    },
    logoText: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 4,
    },
    logoSubtext: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      justifyContent: 'center',
      minHeight: Platform.OS === 'web' ? 'auto' : undefined,
    },
    card: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      shadowColor: theme.shadow,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
      alignSelf: 'center',
    },
    header: {
      marginBottom: 20,
      alignItems: 'center',
      gap: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    form: {
      marginTop: 16,
      gap: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.inputBorder,
      borderRadius: 10,
      padding: 14,
      color: theme.inputText,
      backgroundColor: theme.inputBackground,
    },
    button: {
      flex: 1,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    buttonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    buttonDisabled: {
      backgroundColor: theme.textSecondary,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordInput: {
      paddingRight: 48,
    },
    eyeButton: {
      position: 'absolute',
      right: 12,
      top: 14,
      padding: 4,
    },
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.border,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.inputBackground,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    rememberMeText: {
      fontSize: 14,
      color: theme.text,
    },
    biometricInlineHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    biometricHintText: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    signInButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    biometricQuickButton: {
      width: 50,
      height: 50,
      borderRadius: 10,
      backgroundColor: theme.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginVertical: 8,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginHorizontal: 12,
    },
    signupPrompt: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    signupOptions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    signupButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    signupButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    schoolSignupLink: {
      alignItems: 'center',
      padding: 12,
    },
    schoolSignupText: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    schoolSignupLinkText: {
      color: theme.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    biometricLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    biometricLoadingContent: {
      alignItems: 'center',
      padding: 32,
    },
    biometricLoadingLogo: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#F0F9FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
      borderWidth: 3,
      borderColor: '#33C3D4',
    },
    biometricLoadingText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: 12,
      textAlign: 'center',
    },
    biometricLoadingSubtext: {
      fontSize: 15,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 32,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Biometric Loading Overlay - Full Splash Screen Style */}
      {showBiometricLoading && (
        <View style={styles.biometricLoadingOverlay}>
          <View style={styles.biometricLoadingContent}>
            <View style={styles.biometricLoadingLogo}>
              <Ionicons name="school" size={64} color="#33C3D4" />
            </View>
            <Text style={styles.biometricLoadingText}>
              {t('app.fullName', { defaultValue: 'EduDash Pro' })}
            </Text>
            <Text style={styles.biometricLoadingSubtext}>
              {biometricType === 'face' ? t('auth.biometric.authenticating_face', { defaultValue: 'Authenticating with Face ID...' }) :
               biometricType === 'fingerprint' ? t('auth.biometric.authenticating_fingerprint', { defaultValue: 'Authenticating with Fingerprint...' }) :
               t('auth.biometric.authenticating', { defaultValue: 'Authenticating...' })}
            </Text>
            <ActivityIndicator size="large" color="#33C3D4" style={{ transform: [{ scale: 1.5 }] }} />
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="school" size={32} color={theme.primary} />
              </View>
              <Text style={styles.logoText}>{t('app.fullName', { defaultValue: 'EduDash Pro' })}</Text>
              <Text style={styles.logoSubtext}>{t('app.tagline', { defaultValue: 'Empowering Education Through AI' })}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>{t('auth.sign_in.welcome_back', { defaultValue: 'Welcome Back' })}</Text>
                <Text style={styles.subtitle}>{t('auth.sign_in.sign_in_to_account', { defaultValue: 'Sign in to your account' })}</Text>
              </View>

          {/* Biometric quick access - shown inline if available */}
          {biometricAvailable && storedUserEmail && !biometricFailed && (
            <View style={styles.biometricInlineHint}>
              <Ionicons
                name={
                  biometricType === 'face' ? 'scan' :
                  biometricType === 'fingerprint' ? 'finger-print' :
                  'shield-checkmark'
                }
                size={16}
                color={theme.primary}
              />
              <Text style={styles.biometricHintText}>
                {t('auth.biometric.enabled_for', { defaultValue: 'Biometric login enabled' })}
              </Text>
            </View>
          )}

          {/* Show email/password form only when biometrics not available or failed */}
          {(!biometricAvailable || !storedUserEmail || biometricFailed) && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('auth.email', { defaultValue: 'Email' })}
              placeholderTextColor={theme.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={t('auth.password', { defaultValue: 'Password' })}
                placeholderTextColor={theme.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color={theme.onPrimary} />
                )}
              </View>
              <Text style={styles.rememberMeText}>{t('auth.remember_me', { defaultValue: 'Remember me' })}</Text>
            </TouchableOpacity>

            <View style={styles.signInButtonContainer}>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? t('auth.sign_in.signing_in', { defaultValue: 'Signing In...' }) : t('auth.sign_in.cta', { defaultValue: 'Sign In' })}
                </Text>
              </TouchableOpacity>
              
              {/* Biometric quick retry button */}
              {biometricAvailable && storedUserEmail && (
                <TouchableOpacity
                  style={styles.biometricQuickButton}
                  onPress={() => handleBiometricLogin(false)}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      biometricType === 'face' ? 'scan' :
                      biometricType === 'fingerprint' ? 'finger-print' :
                      'shield-checkmark'
                    }
                    size={24}
                    color={loading ? theme.textDisabled : theme.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 10 }}
              onPress={handleResendConfirmation}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.primary, textDecorationLine: 'underline' }}>
                {t('auth.resend_confirmation', { defaultValue: 'Resend confirmation email' })}
              </Text>
            </TouchableOpacity>
          </View>
          )}

          {/* Show biometric retry button when form is hidden */}
          {biometricAvailable && storedUserEmail && !biometricFailed && (
            <TouchableOpacity
              style={[styles.button, { marginTop: 16 }]}
              onPress={() => handleBiometricLogin(false)}
              disabled={loading}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={
                    biometricType === 'face' ? 'scan' :
                    biometricType === 'fingerprint' ? 'finger-print' :
                    'shield-checkmark'
                  }
                  size={20}
                  color={theme.onPrimary}
                />
                <Text style={styles.buttonText}>
                  {biometricType === 'face' ? t('auth.biometric.use_face_id', { defaultValue: 'Use Face ID' }) :
                   biometricType === 'fingerprint' ? t('auth.biometric.use_fingerprint', { defaultValue: 'Use Fingerprint' }) :
                   t('auth.biometric.use_biometric', { defaultValue: 'Use Biometric' })}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <SocialLoginButtons onSocialLogin={handleSocialLogin} />

          {/* Sign-up options for parents and teachers */}
          <View style={styles.signupPrompt}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.dont_have_account', { defaultValue: "Don't have an account?" })}</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.signupOptions}>
              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => router.push('/screens/parent-registration' as any)}
              >
                <Ionicons name="people" size={20} color={theme.primary} />
                <Text style={styles.signupButtonText}>{t('auth.sign_up_parent', { defaultValue: 'Sign up as Parent' })}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => router.push('/screens/teacher-registration' as any)}
              >
                <Ionicons name="school" size={20} color={theme.primary} />
                <Text style={styles.signupButtonText}>{t('auth.sign_up_teacher', { defaultValue: 'Sign up as Teacher' })}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.schoolSignupLink}
              onPress={() => router.push('/screens/principal-onboarding' as any)}
            >
              <Text style={styles.schoolSignupText}>
                {t('auth.school_register_q', { defaultValue: 'Looking to register a school?' })} <Text style={styles.schoolSignupLinkText}>{t('common.click_here', { defaultValue: 'Click here' })}</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.schoolSignupLink}
              onPress={() => router.push('/screens/org-onboarding' as any)}
            >
              <Text style={styles.schoolSignupText}>
                {t('auth.org_onboard_q', { defaultValue: 'Looking to onboard an organization?' })} <Text style={styles.schoolSignupLinkText}>{t('common.click_here', { defaultValue: 'Click here' })}</Text>
              </Text>
            </TouchableOpacity>
          </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
