import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  View,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { Stack, router } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { signInWithSession } from "@/lib/sessionManager";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function EnhancedSignIn() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const canUseSupabase = !!supabase;

  // Social OAuth handlers
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In production, this would use actual Google OAuth
      Alert.alert(
        "🔗 Google Sign-In",
        "This would integrate with Google OAuth in production. Features:\n\n• One-click authentication\n• Secure OAuth 2.0 flow\n• Account linking\n• Profile synchronization",
        [
          { text: "Demo Success", onPress: async () => {
            Alert.alert("Demo", "Google sign-in successful! Routing to dashboard...");
            // In a real implementation, this would create a session and route properly
            setTimeout(() => {
              // For demo purposes, route to a sample dashboard
              router.replace("/screens/teacher-dashboard");
            }, 1000);
          }},
          { text: "Cancel", style: "cancel" }
        ]
      );
    } catch (error) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      Alert.alert(
        "🍎 Apple Sign-In",
        "This would integrate with Apple Sign-In in production. Features:\n\n• Sign in with Apple ID\n• Privacy-focused authentication\n• Hide My Email option\n• Seamless iOS integration",
        [
          { text: "Demo Success", onPress: async () => {
            Alert.alert("Demo", "Apple sign-in successful! Routing to dashboard...");
            // In a real implementation, this would create a session and route properly
            setTimeout(() => {
              // For demo purposes, route to a sample dashboard
              router.replace("/screens/parent-dashboard");
            }, 1000);
          }},
          { text: "Cancel", style: "cancel" }
        ]
      );
    } catch (error) {
      setError("Apple sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      Alert.alert(
        "🏢 Microsoft Sign-In",
        "This would integrate with Microsoft Azure AD in production. Features:\n\n• Enterprise SSO integration\n• Office 365 account linking\n• Active Directory authentication\n• Organization management",
        [
          { text: "Demo Success", onPress: async () => {
            Alert.alert("Demo", "Microsoft sign-in successful! Routing to dashboard...");
            // In a real implementation, this would create a session and route properly
            setTimeout(() => {
              // For demo purposes, route to a sample dashboard
              router.replace("/screens/principal-dashboard");
            }, 1000);
          }},
          { text: "Cancel", style: "cancel" }
        ]
      );
    } catch (error) {
      setError("Microsoft sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Email/Password sign-in
  const handleEmailSignIn = async () => {
    if (!canUseSupabase) {
      setError("Supabase configuration is required for email sign-in.");
      return;
    }
    
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { session, profile, error } = await signInWithSession(
        email.trim(),
        password
      );
      
      if (error || !session) {
        setError(error || "Failed to sign in.");
        return;
      }
      
      // Use proper post-login routing to direct to appropriate dashboard
      try {
        const { routeAfterLogin } = await import('@/lib/routeAfterLogin');
        // session is UserSession type, need to get actual Supabase user for routing
        const { data: { user } } = await supabase.auth.getUser();
        await routeAfterLogin(user, profile);
      } catch (routingError) {
        console.error('Post-login routing failed:', routingError);
        // Fallback to profiles-gate if routing fails
        router.replace("/profiles-gate");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.description}>Sign in to your account</Text>
          </View>
        </View>

        {/* Social Authentication Buttons */}
        <View style={styles.socialSection}>
          {/* Google Sign-In */}
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <View style={styles.socialIcon}>
              <Text style={styles.socialIconText}>🔍</Text>
            </View>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
            {loading && <ActivityIndicator size="small" color="#666" />}
          </TouchableOpacity>

          {/* Apple Sign-In */}
          <TouchableOpacity 
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <View style={styles.socialIcon}>
              <Text style={styles.socialIconText}>🍎</Text>
            </View>
            <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continue with Apple</Text>
            {loading && <ActivityIndicator size="small" color="#fff" />}
          </TouchableOpacity>

          {/* Microsoft Sign-In */}
          <TouchableOpacity 
            style={[styles.socialButton, styles.microsoftButton]}
            onPress={handleMicrosoftSignIn}
            disabled={loading}
          >
            <View style={styles.socialIcon}>
              <Text style={styles.socialIconText}>🏢</Text>
            </View>
            <Text style={[styles.socialButtonText, styles.microsoftButtonText]}>Continue with Microsoft</Text>
            {loading && <ActivityIndicator size="small" color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email/Password Form */}
        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="superadmin@edudashpro.org.za"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity 
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color="#000" />}
              </View>
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => Alert.alert("Forgot Password", "Password reset functionality would be implemented here.")}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Sign In Button */}
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleEmailSignIn}
            disabled={loading}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.signInGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{" "}
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    marginBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#9ca3af",
    marginBottom: 16,
  },
  continueText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  socialSection: {
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: "#000000",
  },
  microsoftButton: {
    backgroundColor: "#0078d4",
  },
  socialIcon: {
    marginRight: 12,
  },
  socialIconText: {
    fontSize: 20,
  },
  socialButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  appleButtonText: {
    color: "#ffffff",
  },
  microsoftButtonText: {
    color: "#ffffff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#374151",
  },
  dividerText: {
    color: "#6b7280",
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: "500",
  },
  formSection: {
    marginBottom: 32,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#6b7280",
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#00f5ff",
    borderColor: "#00f5ff",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#e5e7eb",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#00f5ff",
    fontWeight: "600",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  signInButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    paddingTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: "#9ca3af",
    flexDirection: "row",
    alignItems: "center",
  },
  signUpText: {
    color: "#00f5ff",
    fontWeight: "600",
  },
});