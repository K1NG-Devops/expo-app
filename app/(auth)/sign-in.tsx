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
import { storage } from '@/lib/storage';
import { secureStore } from '@/lib/secure-store';
import { signInWithSession } from '@/lib/sessionManager';

export default function SignIn() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

console.log('[SignIn] Component rendering, theme:', theme);

  useEffect(() => {
    console.log('[SignIn] Mounted');
    return () => console.log('[SignIn] Unmounted');
  }, []);

  const onContainerLayout = (e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    console.log('[SignIn] Container layout:', { x, y, width, height });
  };
  const onCardLayout = (e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    console.log('[SignIn] Card layout:', { x, y, width, height });
  };

  // Load saved credentials (web platform - no biometrics)
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Load saved email from remember me
        const savedRememberMe = await storage.getItem('rememberMe');
        const savedEmail = await storage.getItem('savedEmail');
        if (savedRememberMe === 'true' && savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
          
          // Try to load saved password from secure store (sanitize email for secure store key)
          const sanitizedKey = `password_${savedEmail.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const savedPassword = await secureStore.getItem(sanitizedKey);
          if (savedPassword) {
            setPassword(savedPassword);
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
          await storage.setItem('rememberMe', 'true');
          await storage.setItem('savedEmail', email.trim());
          const sanitizedKey = `password_${email.trim().replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await secureStore.setItem(sanitizedKey, password);
        } else {
          await storage.removeItem('rememberMe');
          await storage.removeItem('savedEmail');
          const sanitizedKey = `password_${email.trim().replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          try { await secureStore.deleteItem(sanitizedKey); } catch { /* Intentional: non-fatal */ }
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


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      ...(Platform.OS === 'web' && {
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
      }),
    },
    keyboardView: {
      flex: 1,
      ...(Platform.OS === 'web' && {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
      }),
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
      paddingTop: 20,
      ...(Platform.OS === 'web' && {
        paddingTop: 0,
      }),
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
      ...(Platform.OS === 'web' && {
        width: '100%',
      }),
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Platform.OS === 'ios' ? 20 : 40,
      ...(Platform.OS === 'web' && {
        minHeight: '100vh',
        justifyContent: 'center',
        paddingVertical: 40,
      }),
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      justifyContent: 'center',
      ...(Platform.OS === 'web' && {
        flex: 0,
        paddingVertical: 0,
      }),
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
      minHeight: 100,
      ...(Platform.OS === 'web' && {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        marginVertical: 20,
      }),
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
  });

return (
<SafeAreaView style={[styles.container, (__DEV__ && Platform.OS === 'web') && { backgroundColor: '#FDF4FF' }]} edges={['top', 'left', 'right']} onLayout={onContainerLayout}>
      {/* DEBUG RIBBON */}
      {__DEV__ && (
        <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, zIndex: 10 }}>
          <Text style={{ color: '#0b0f0a', fontWeight: '700' }}>SignIn Debug: Mounted</Text>
        </View>
      )}
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />


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

<View style={[styles.card, __DEV__ && { borderWidth: 4, borderColor: '#22c55e', backgroundColor: '#ffffff', zIndex: 2 }]} onLayout={onCardLayout}>
              <View style={styles.header}>
<Text style={styles.title}>{t('auth.sign_in.welcome_back', { defaultValue: 'Welcome Back' })}</Text>
                {__DEV__ && (
                  <Text style={[styles.subtitle, { color: '#16a34a' }]}>DEBUG: Card visible</Text>
                )}
                <Text style={styles.subtitle}>{t('auth.sign_in.sign_in_to_account', { defaultValue: 'Sign in to your account' })}</Text>
              </View>

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
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, styles.passwordInput]}
                placeholder={t('auth.password', { defaultValue: 'Password' })}
                placeholderTextColor={theme.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSignIn}
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

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? t('auth.sign_in.signing_in', { defaultValue: 'Signing In...' }) : t('auth.sign_in.cta', { defaultValue: 'Sign In' })}
              </Text>
            </TouchableOpacity>
          </View>


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
