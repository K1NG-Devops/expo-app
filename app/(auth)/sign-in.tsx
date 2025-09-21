import React from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { EnhancedSignIn } from '@/components/auth/EnhancedSignIn';

export default function SignIn() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: "Sign In",
          headerShown: true,
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTitleStyle: { color: theme.headerText },
          headerTintColor: theme.headerTint,
        }}
      />
      
      {/* Use the beautiful enhanced sign-in component with all real backend functionality */}
      <EnhancedSignIn
        showSocialLogin={true}
        showRememberMe={true}
        showRegisterLink={true}
        enableMFA={true}
        onSuccess={(user, response) => {
          console.log('Sign in successful:', user.email);
        }}
        onError={(error) => {
          console.error('Sign in error:', error);
        }}
        onForgotPassword={() => {
          // Navigate to password recovery
          router.push('/components/auth/PasswordRecovery');
        }}
        onRegister={() => {
          // Navigate to registration
          router.push('/screens/teacher-invite-accept');
        }}
        onSocialLogin={(provider) => {
          console.log('Social login with:', provider);
          // TODO: Implement real social login with Supabase
        }}
      />
    </View>
  );
}