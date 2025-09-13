import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  View,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import KeyboardScreen from "@/components/ui/KeyboardScreen";
import { BiometricAuthService } from "@/services/BiometricAuthService";
import { BiometricBackupManager } from "@/lib/BiometricBackupManager";
import { BiometricSetup } from "@/components/auth/BiometricSetup";
import { EnhancedBiometricAuth } from "@/services/EnhancedBiometricAuth";
import BiometricDebugger from "../../utils/biometricDebug";
import { Ionicons } from "@expo/vector-icons";

export default function SignIn() {
  const { theme, isDark } = useTheme();
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
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);

  const canUseSupabase = !!supabase;

  // Check biometric availability on component mount
  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const securityInfo = await BiometricAuthService.getSecurityInfo();
      setBiometricAvailable(
        securityInfo.capabilities.isAvailable &&
          securityInfo.capabilities.isEnrolled,
      );
      setBiometricEnabled(securityInfo.isEnabled);

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
      if (userData?.email) {
        setEmail(userData.email);
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
      const { data, error: err } = await supabase!.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (err) return setError(err.message);
      if (data?.user) {
        console.log('Password login successful for:', data.user.email);
        
        // Store enhanced biometric session data for future biometric logins
        try {
          // Get user profile for caching
          const { fetchEnhancedUserProfile } = await import('@/lib/rbac');
          const profile = await fetchEnhancedUserProfile(data.user.id);
          
          // Store biometric session data (this doesn't enable biometric auth yet)
          await EnhancedBiometricAuth.storeBiometricSession(
            data.user.id, 
            data.user.email!, 
            profile
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
            // Show biometric setup modal
            setShowBiometricSetup(true);
            return; // Don't redirect yet, let user decide on biometric setup
          }
        } catch (e) {
          console.warn('Could not check biometric status:', e);
        }
        router.replace("/profiles-gate");
      }
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
    const { error: err } = await supabase!.auth.signInWithOtp({
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
    const { data, error: err } = await supabase!.auth.verifyOtp({
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

      console.log('Starting biometric unlock for existing session');
      
      // Gate with device authentication
      const authRes = await BiometricAuthService.authenticate('Use biometric authentication to unlock');
      if (!authRes.success) {
        setError(authRes.error || "Biometric authentication failed");
        setLoading(false);
        return;
      }

      // After unlock, verify session is still valid
      try {
        const { data } = await supabase!.auth.getSession();
        if (data.session?.user) {
          // Use cached profile snapshot if present to route faster, else go to profiles gate
          const enhanced = await EnhancedBiometricAuth.getBiometricSession();
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
          setError("Session expired. Please sign in.");
        }
      } catch (e) {
        console.error('Session check after biometric unlock failed:', e);
        setError("Could not verify session after unlock.");
      }

      setLoading(false);
      
    } catch (error) {
      console.error("Biometric unlock error:", error);
      setError("Biometric login failed. Please try password login.");
      setLoading(false);
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
});
