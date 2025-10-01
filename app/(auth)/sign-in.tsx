import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator, ScrollView, KeyboardAvoidingView } from "react-native";
import { Stack, router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { assertSupabase } from "@/lib/supabase";
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { SocialLoginButtons } from '@/components/ui/SocialLoginButtons';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import * as SecureStore from 'expo-secure-store';

export default function SignIn() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [storedUserEmail, setStoredUserEmail] = useState<string | null>(null);

  // Load saved credentials and check biometric availability
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Check biometric availability
        const securityInfo = await BiometricAuthService.getSecurityInfo();
        const isAvailable = securityInfo.capabilities.isAvailable && securityInfo.capabilities.isEnrolled;
        setBiometricAvailable(isAvailable && securityInfo.isEnabled);
        
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
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await assertSupabase().auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert("Sign In Failed", error.message);
      } else {
        console.log("Sign in successful:", data.user?.email);
        // Save remember me preference and credentials
        if (rememberMe) {
          await AsyncStorage.setItem('rememberMe', 'true');
          await AsyncStorage.setItem('savedEmail', email.trim());
          // Save password securely for quick access (sanitize email for secure store key)
          const sanitizedKey = `password_${email.trim().replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          await SecureStore.setItemAsync(sanitizedKey, password);
        } else {
          await AsyncStorage.removeItem('rememberMe');
          await AsyncStorage.removeItem('savedEmail');
          const sanitizedKey = `password_${email.trim().replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          try {
            await SecureStore.deleteItemAsync(sanitizedKey);
          } catch (e) {
            // Key might not exist, ignore
          }
        }
        // The AuthContext will handle routing automatically
      }
    } catch (_error) {
      console.error("Sign in error:", _error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) {
      Alert.alert('Biometric Not Available', 'Please use your password to sign in.');
      return;
    }

    setLoading(true);
    try {
      // Authenticate with biometrics
      const authResult = await BiometricAuthService.authenticate('Sign in to EduDash Pro');
      
      if (authResult.success) {
        // Use stored credentials to sign in
        if (email && password) {
          await handleSignIn();
        } else {
          Alert.alert('Error', 'No saved credentials found. Please sign in with your password.');
        }
      } else {
        Alert.alert('Authentication Failed', authResult.error || 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'An error occurred during biometric authentication');
    } finally {
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
        let errorMessage = 'Failed to start social login';
        
        if (error.message?.includes('provider is not enabled') || 
            error.message?.includes('Unsupported provider')) {
          errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not available yet. Please use email/password sign-in or contact support.`;
        } else if (error.message?.includes('redirect_uri')) {
          errorMessage = 'OAuth configuration error. Please contact support.';
        } else {
          errorMessage = error.message;
        }
        
        Alert.alert('Sign-in Unavailable', errorMessage);
        return;
      }
    } catch (e: any) {
      console.error('OAuth Exception:', e);
      let errorMessage = 'Failed to start social login';
      
      if (e?.message?.includes('provider is not enabled') || 
          e?.message?.includes('Unsupported provider')) {
        errorMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not available yet. Please use email/password sign-in or contact support.`;
      } else {
        errorMessage = e?.message || 'An unexpected error occurred';
      }
      
      Alert.alert('Sign-in Error', errorMessage);
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
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 4,
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
    biometricSection: {
      marginTop: 16,
      marginBottom: 16,
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.surfaceVariant,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    biometricWelcome: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    biometricEmail: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
    },
    biometricButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginBottom: 12,
    },
    biometricButtonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '600',
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
              <Text style={styles.logoText}>EduDash Pro</Text>
              <Text style={styles.logoSubtext}>AI-Powered Education Platform</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your account</Text>
              </View>

          {/* Biometric Login Section */}
          {biometricAvailable && storedUserEmail && (
            <View style={styles.biometricSection}>
              <Text style={styles.biometricWelcome}>Welcome back!</Text>
              <Text style={styles.biometricEmail}>{storedUserEmail}</Text>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name={
                        biometricType === 'face' ? 'scan' :
                        biometricType === 'fingerprint' ? 'finger-print' :
                        'lock-closed'
                      }
                      size={22}
                      color={theme.onPrimary}
                    />
                    <Text style={styles.biometricButtonText}>
                      {biometricType === 'face' ? 'Use Face ID' :
                       biometricType === 'fingerprint' ? 'Use Fingerprint' :
                       'Use Biometric'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
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
                placeholder="Password"
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
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          <SocialLoginButtons onSocialLogin={handleSocialLogin} />

          {/* Sign-up options for parents and teachers */}
          <View style={styles.signupPrompt}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Don't have an account?</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <View style={styles.signupOptions}>
              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => router.push('/screens/parent-registration' as any)}
              >
                <Ionicons name="people" size={20} color={theme.primary} />
                <Text style={styles.signupButtonText}>Sign up as Parent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => router.push('/screens/teacher-registration' as any)}
              >
                <Ionicons name="school" size={20} color={theme.primary} />
                <Text style={styles.signupButtonText}>Sign up as Teacher</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.schoolSignupLink}
              onPress={() => router.push('/screens/principal-onboarding' as any)}
            >
              <Text style={styles.schoolSignupText}>
                Looking to register a school? <Text style={styles.schoolSignupLinkText}>Click here</Text>
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
