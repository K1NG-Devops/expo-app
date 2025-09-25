import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { assertSupabase } from "@/lib/supabase";
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { SocialLoginButtons } from '@/components/ui/SocialLoginButtons';

export default function SignIn() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        // The AuthContext will handle routing automatically
      }
    } catch (_error) {
      console.error("Sign in error:", _error);
      Alert.alert("Error", "An unexpected error occurred");
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
      await supabase.auth.signInWithOAuth({
        provider: mapped as any,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web' ? false : undefined,
        },
      });
    } catch (e: any) {
      Alert.alert('OAuth Error', e?.message || 'Failed to start social login');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
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
    },
    header: {
      marginBottom: 16,
      alignItems: 'center',
      gap: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
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
  });

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to EduDash Pro</Text>
            <Text style={styles.subtitle}>Fast, secure sign-in to your AI-powered dashboard</Text>
          </View>

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

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

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
        </View>
      </View>
    </SafeAreaView>
  );
}
