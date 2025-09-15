import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  View,
  Alert,
  Modal,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { signInWithSession } from "@/lib/sessionManager";
import KeyboardScreen from "@/components/ui/KeyboardScreen";
import { BiometricAuthService } from "@/services/BiometricAuthService";
import { BiometricBackupManager } from "@/lib/BiometricBackupManager";
// Biometric setup component (used conditionally)
// import { BiometricSetup } from "@/components/auth/BiometricSetup";
import { EnhancedBiometricAuth } from "@/services/EnhancedBiometricAuth";
import BiometricDebugger from "../../utils/biometricDebug";
import { Ionicons } from "@expo/vector-icons";
import { registerForPushNotificationsAsync, onNotificationReceived, scheduleLocalNotification } from "@/lib/notifications";

export default function SignIn() {
  const { theme } = useTheme();
  console.log('Theme loaded:', theme.background); // Prevent unused warning
  const { t } = useTranslation();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [storedUserData, setStoredUserData] = useState<any>(null);
  // Biometric setup modal state (conditionally used)
  // const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const hasPromptedRef = React.useRef(false);
  // Multi-account biometric support
  const [biometricAccounts, setBiometricAccounts] = useState<Array<{ userId: string; email: string; lastUsed: string; expiresAt: string }>>([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [switchLoadingUserId, setSwitchLoadingUserId] = useState<string | null>(null);

  const canUseSupabase = !!supabase;

  // Read query params (e.g., switch=1 to open account picker)
  const params = useLocalSearchParams<{ switch?: string }>();

  // Check biometric availability on component mount
  useEffect(() => {
    checkBiometricStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register for push notifications when the sign-in screen mounts
  useEffect(() => {
    let unsubscribe: undefined | (() => void);
    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          console.log('Expo push token:', token);
          // TODO: send token to your backend if you want server-initiated pushes
        }
        unsubscribe = onNotificationReceived((n) => {
          console.log('Notification received:', n);
        });
      } catch (e) {
        console.warn('Push registration failed:', e);
      }
    })();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const checkBiometricStatus = async () => {
    try {
      console.log('[SignIn] Checking biometric status...');
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      const isAvailable = securityInfo.capabilities.isAvailable && securityInfo.capabilities.isEnrolled;
      setBiometricAvailable(isAvailable);
      setBiometricEnabled(securityInfo.isEnabled);

      console.log('[SignIn] Biometric status:', {
        isAvailable,
        isEnabled: securityInfo.isEnabled,
        availableTypes: securityInfo.availableTypes,
      });

      // Determine the primary biometric type for display
      const availableTypes = securityInfo.availableTypes;
      if (availableTypes.includes('Fingerprint')) {
        setBiometricType('fingerprint');
      } else if (availableTypes.includes('Face ID')) {
        setBiometricType('face');
      } else if (availableTypes.includes('Iris Scan')) {
        setBiometricType('iris');
      } else {
        setBiometricType('biometric');
      }

      // Check both old and new biometric data storage
      const userData = await BiometricAuthService.getStoredBiometricData();
      const enhancedSessionData = await EnhancedBiometricAuth.getBiometricSession();
      
      console.log('[SignIn] Biometric data found:', {
        hasUserData: !!userData,
        hasEnhancedSession: !!enhancedSessionData,
        userEmail: userData?.email || enhancedSessionData?.email,
      });

      // Prefer enhanced session data if available, fall back to legacy data
      const effectiveUserData = enhancedSessionData ? {
        userId: enhancedSessionData.userId,
        email: enhancedSessionData.email,
        enabledAt: enhancedSessionData.lastUsed,
        securityToken: enhancedSessionData.sessionToken,
        version: 2
      } : userData;
      
      setStoredUserData(effectiveUserData);

      // Pre-populate email if we have stored biometric data
      if (effectiveUserData?.email) {
        setEmail(effectiveUserData.email);
      }

      // Load any stored biometric accounts (multi-account)
      try {
        const accounts = await EnhancedBiometricAuth.getBiometricAccounts();
        setBiometricAccounts(accounts);

        // If we were routed here to switch accounts, open picker or auto-login
        if (params?.switch === '1') {
          if (accounts.length > 1) {
            setShowAccountPicker(true);
          } else if (accounts.length === 1) {
            // Auto-login to the single stored account
            onBiometricLoginForUser(accounts[0].userId);
          }
        }
      } catch (accErr) {
        console.warn('Could not load biometric accounts:', accErr);
      }

      // Auto-open biometric prompt modal if conditions are met and not prompted yet
      console.log('[SignIn] Auto-prompt check:', {
        isAvailable,
        isEnabled: securityInfo.isEnabled,
        hasUserData: !!effectiveUserData,
        hasPrompted: hasPromptedRef.current,
        willShowPrompt: isAvailable && !!effectiveUserData && !hasPromptedRef.current,
      });

      if (isAvailable && effectiveUserData && !hasPromptedRef.current) {
        console.log('[SignIn] Showing biometric prompt modal');
        hasPromptedRef.current = true;
        // Add a small delay to ensure the screen is fully rendered
        setTimeout(() => {
          setShowBiometricPrompt(true);
        }, 500);
      }

      // Log debug info in development
      if (__DEV__) {
        await BiometricDebugger.logDebugInfo();
      }
    } catch (error) {
      console.error("Error checking biometric status:", error);
    }
  };

  async function onSignInWithPassword() {
    setError(null);
    if (!canUseSupabase) {
      setError(
        "Supabase env not set (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).",
      );
      return;
    }
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      // Use unified session manager to ensure tokens are stored for biometric restore
      const { session, profile, error } = await signInWithSession(
        email.trim(),
        password
      );
      setLoading(false);

      if (error || !session) {
        return setError(error || "Failed to sign in.");
      }

      console.log('Password login successful for:', session.email);
      
      // Store enhanced biometric session data for future biometric logins
      try {
        const effectiveProfile = profile ?? (await (await import('@/lib/rbac')).fetchEnhancedUserProfile(session.user_id));
        await EnhancedBiometricAuth.storeBiometricSession(
          session.user_id,
          session.email!,
          effectiveProfile as any
        );
        console.log('Stored biometric session data for future use');
      } catch (sessionError) {
        console.error('Error storing biometric session data:', sessionError);
        // Continue anyway as this is not critical for login
      }
      
      // Check if biometric is available but not enabled
      try {
        const securityInfo = await BiometricAuthService.getSecurityInfo();
        if (securityInfo.capabilities.isAvailable && 
            securityInfo.capabilities.isEnrolled && 
            !securityInfo.isEnabled) {
          // Show biometric setup modal (feature temporarily disabled)
          // setShowBiometricSetup(true);
          // return; // Don't redirect yet, let user decide on biometric setup
        }
      } catch (e) {
        console.warn('Could not check biometric status:', e);
      }
      router.replace("/profiles-gate");
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? "Failed to sign in.");
    }
  }

  async function sendCode() {
    setError(null);
    if (!canUseSupabase) {
      setError(
        "Supabase env not set (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).",
      );
      return;
    }
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    const redirectTo = Linking.createURL("/auth-callback");
    const { error: err } = await (await import('@/lib/supabase')).assertSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  async function verifyCode() {
    setError(null);
    if (!canUseSupabase) {
      setError(
        "Supabase env not set (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).",
      );
      return;
    }
    if (!email || !code) {
      setError("Enter the email and the 6-digit code.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await (await import('@/lib/supabase')).assertSupabase().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.user) {
      router.replace("/profiles-gate");
    }
  }

  async function onBiometricLogin() {
    // Close modal before starting auth to avoid overlay during system prompt
    if (showBiometricPrompt) setShowBiometricPrompt(false);
    if (!biometricAvailable || !biometricEnabled) {
      Alert.alert(
        t("settings.biometric.title"),
        t("settings.biometric.notAvailable"),
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clarify messaging when device supports biometrics but it is turned off in-app
      if (!biometricAvailable) {
        Alert.alert(t("settings.biometric.title"), t("settings.biometric.notAvailable"));
        setLoading(false);
        return;
      }
      if (!biometricEnabled) {
        Alert.alert(
          t("settings.biometric.title"),
          t("settings.biometric.enableToUse", { defaultValue: "Biometric sign-in is turned off. Enable it in your Account settings to use quick sign-in." })
        );
        setLoading(false);
        return;
      }

      console.log('Starting enhanced biometric authentication');
      
      // Use the enhanced biometric authentication which handles session restoration
      const result = await EnhancedBiometricAuth.authenticateWithBiometric();
      
      if (!result.success) {
        setError(result.error || "Biometric authentication failed");
        setLoading(false);
        return;
      }

      console.log('Enhanced biometric authentication successful');
      
      if (result.sessionRestored && result.userData) {
        // Use cached profile snapshot if present to route faster, else go to profiles gate
        const enhanced = result.userData;
        if (enhanced?.profileSnapshot?.role) {
          const mockUser = { id: enhanced.userId, email: enhanced.email };
          const cachedProfile = {
            id: enhanced.userId,
            role: enhanced.profileSnapshot.role,
            organization_id: enhanced.profileSnapshot.organization_id,
            seat_status: enhanced.profileSnapshot.seat_status,
            hasCapability: () => true,
            organization_membership: { plan_tier: 'basic' }
          };
          try {
            const { routeAfterLogin } = await import('@/lib/routeAfterLogin');
            await routeAfterLogin(mockUser as any, cachedProfile as any);
            setLoading(false);
            return;
          } catch (e) {
            console.warn('Routing with cached profile failed, going to profiles gate:', e);
          }
        }
        router.replace("/profiles-gate");
      } else {
        console.error('Could not restore valid session for biometric login');
        setError("Session expired. Please sign in with your password to re-enable biometric login.");
        // Clear biometric data since session is invalid
        await EnhancedBiometricAuth.clearBiometricSession();
        await BiometricAuthService.disableBiometric();
      }

      setLoading(false);
      
    } catch (error) {
      console.error("Enhanced biometric authentication error:", error);
      setError("Biometric login failed. Please try password login.");
      setLoading(false);
    }
  }

  async function onBiometricLoginForUser(userId: string) {
    // Close any modals
    setShowBiometricPrompt(false);
    setShowAccountPicker(false);
    if (!biometricAvailable) {
      Alert.alert(t("settings.biometric.title"), t("settings.biometric.notAvailable"));
      return;
    }
    if (!biometricEnabled) {
      Alert.alert(
        t("settings.biometric.title"),
        t("settings.biometric.enableToUse", { defaultValue: "Biometric sign-in is turned off. Enable it in your Account settings to use quick sign-in." })
      );
      return;
    }

    try {
      setSwitchLoadingUserId(userId);
      setError(null);
      const result = await EnhancedBiometricAuth.authenticateWithBiometricForUser(userId);
      setSwitchLoadingUserId(null);
      
      if (!result.success) {
        setError(result.error || "Biometric authentication failed");
        return;
      }

      if (result.sessionRestored && result.userData) {
        // Same routing approach as default biometric login
        const enhanced = result.userData;
        if (enhanced?.profileSnapshot?.role) {
          const mockUser = { id: enhanced.userId, email: enhanced.email };
          const cachedProfile = {
            id: enhanced.userId,
            role: enhanced.profileSnapshot.role,
            organization_id: enhanced.profileSnapshot.organization_id,
            seat_status: enhanced.profileSnapshot.seat_status,
            hasCapability: () => true,
            organization_membership: { plan_tier: 'basic' }
          };
          try {
            const { routeAfterLogin } = await import('@/lib/routeAfterLogin');
            await routeAfterLogin(mockUser as any, cachedProfile as any);
            return;
          } catch (e) {
            console.warn('Routing with cached profile failed, going to profiles gate:', e);
          }
        }
        router.replace("/profiles-gate");
      } else {
        setError("Session expired. Please sign in with your password to re-enable biometric login.");
        await EnhancedBiometricAuth.clearBiometricSession();
        await BiometricAuthService.disableBiometric();
      }

    } catch (err) {
      console.error('Biometric switch account error:', err);
      setError("Biometric login failed. Please try password login.");
      setSwitchLoadingUserId(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: t("auth.signIn"),
          headerShown: true,
          headerStyle: { backgroundColor: "#0b1220" },
          headerTitleStyle: { color: "#ffffff" },
          headerTintColor: "#00f5ff",
        }}
      />
      {/* Biometric Prompt Modal */}
      <Modal
        visible={showBiometricPrompt && biometricAvailable && biometricEnabled && !!storedUserData}
        animationType="fade"
        transparent
        onRequestClose={() => setShowBiometricPrompt(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Ionicons 
                name={biometricType === 'face' ? 'scan' : biometricType === 'iris' ? 'eye' : 'finger-print'}
                size={28}
                color="#0b1220"
              />
            </View>
            <Text style={styles.modalTitle}>Quick sign-in</Text>
            <Text style={styles.modalSubtitle}>
              {storedUserData?.email ? `Sign in as ${storedUserData.email}` : 'Use your biometrics to sign in'}
            </Text>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onBiometricLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#0b1220" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Use biometrics</Text>
              )}
            </TouchableOpacity>
            {biometricAccounts.length > 1 && (
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowAccountPicker(true)}>
                <Text style={styles.modalSecondaryBtnText}>Switch account</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowBiometricPrompt(false)}>
              <Text style={styles.modalSecondaryBtnText}>Use password instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Picker Modal */}
      <Modal
        visible={showAccountPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAccountPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose an account</Text>
            {biometricAccounts.map((acc) => (
              <TouchableOpacity
                key={acc.userId}
                style={[styles.modalPrimaryBtn, { marginBottom: 8, backgroundColor: '#0ea5e9' }]}
                onPress={() => onBiometricLoginForUser(acc.userId)}
                disabled={switchLoadingUserId === acc.userId}
              >
                {switchLoadingUserId === acc.userId ? (
                  <ActivityIndicator color="#0b1220" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>{acc.email}</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowAccountPicker(false)}>
              <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardScreen contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t("auth.signIn")}</Text>

        {/* Biometric Login Button */}
        {biometricAvailable && biometricEnabled && storedUserData && (
          <View style={styles.biometricSection}>
            <TouchableOpacity
              disabled={loading}
              style={styles.biometricButton}
              onPress={onBiometricLogin}
            >
              {loading ? (
                <ActivityIndicator color="#0b1220" size="small" />
              ) : (
                <>
                  <Ionicons 
                    name={
                      biometricType === 'face' ? 'scan' :
                      biometricType === 'iris' ? 'eye' :
                      'finger-print'
                    } 
                    size={24} 
                    color="#0b1220" 
                  />
                  <Text style={styles.biometricButtonText}>
                    {biometricType === 'fingerprint' ? t("settings.biometric.useFingerprint") :
                     biometricType === 'face' ? t("settings.biometric.useFaceId") :
                     t("settings.biometric.biometricLogin")}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {biometricAccounts.length > 1 && (
              <TouchableOpacity
                style={styles.fallbackLink}
                onPress={() => setShowAccountPicker(true)}
              >
                <Text style={styles.fallbackLinkText}>Switch account</Text>
              </TouchableOpacity>
            )}

            {/* Fallback Authentication Link */}
            <TouchableOpacity
              style={styles.fallbackLink}
              onPress={async () => {
                const success =
                  await BiometricBackupManager.showFallbackOptions();
                if (success) {
                  router.replace("/profiles-gate");
                }
              }}
            >
              <Text style={styles.fallbackLinkText}>
                {t("settings.biometric.backupAvailable")}
              </Text>
            </TouchableOpacity>
            <Text style={styles.biometricEmail}>
              Signed in as: {storedUserData.email}
            </Text>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        )}

        <View style={styles.toggleRow}>
          <TouchableOpacity
            onPress={() => setMode("password")}
            style={[
              styles.toggleBtn,
              mode === "password" && styles.toggleBtnActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "password" && styles.toggleTextActive,
              ]}
            >
              Password
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("otp")}
            style={[styles.toggleBtn, mode === "otp" && styles.toggleBtnActive]}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "otp" && styles.toggleTextActive,
              ]}
            >
              Email code
            </Text>
          </TouchableOpacity>
        </View>

        {!canUseSupabase && (
          <Text style={styles.envWarning}>
            Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and
            EXPO_PUBLIC_SUPABASE_ANON_KEY, then reload.
          </Text>
        )}

        {/* Common email field */}
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#7b8794"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {mode === "password" ? (
          <>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { marginBottom: 0, flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="#7b8794"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.showBtn}
                onPress={() => setShowPassword((s) => !s)}
              >
                <Text style={styles.showBtnText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity
              disabled={loading}
              style={styles.button}
              onPress={onSignInWithPassword}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.link}
              onPress={() => setMode("otp")}
            >
              <Text style={styles.linkText}>
                Forgot password? Use email code instead
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {sent && (
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor="#7b8794"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                maxLength={6}
              />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!sent ? (
              <TouchableOpacity
                disabled={loading}
                style={styles.button}
                onPress={sendCode}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.buttonText}>Send code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled={loading}
                style={styles.button}
                onPress={verifyCode}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.buttonText}>Verify & continue</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.link}
              onPress={() => setMode("password")}
            >
              <Text style={styles.linkText}>Use password instead</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/screens/teacher-invite-accept')}
        >
          <Text style={styles.linkText}>Have an invite token? Accept it</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => router.back()}>
          <Text style={styles.linkText}>Back</Text>
        </TouchableOpacity>
      </KeyboardScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1220",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "900", color: "#fff", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#111827",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  passwordRow: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  showBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  showBtnText: { color: "#00f5ff", fontWeight: "700" },
  button: {
    backgroundColor: "#00f5ff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 180,
    alignItems: "center",
  },
  buttonText: { color: "#000", fontWeight: "800" },
  link: { marginTop: 14 },
  linkText: { color: "#00f5ff", fontWeight: "700", textAlign: "center" },
  errorText: { color: "#ff6b6b", marginBottom: 10, textAlign: "center" },
  envWarning: { color: "#fbbf24", marginBottom: 10, textAlign: "center" },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  toggleBtnActive: { backgroundColor: "#00f5ff" },
  toggleText: { color: "#9CA3AF", fontWeight: "700" },
  toggleTextActive: { color: "#000" },
  biometricSection: {
    width: "100%",
    maxWidth: 420,
    marginBottom: 20,
  },
  biometricButton: {
    backgroundColor: "#00f5ff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  biometricButtonText: {
    color: "#0b1220",
    fontWeight: "700",
    fontSize: 16,
  },
  biometricEmail: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1f2937",
  },
  dividerText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  fallbackLink: {
    marginTop: 8,
    paddingVertical: 4,
  },
  fallbackLinkText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0b1220',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: '#00f5ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#0b1220',
    fontWeight: '800',
    fontSize: 16,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSecondaryBtnText: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
});
