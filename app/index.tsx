import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AppSplashScreen from '@/components/ui/AppSplashScreen';

/**
 * Root index route for EduDash Pro
 * 
 * Mobile apps: Show splash screen, then redirect to sign-in
 * - Professional branded experience on app launch
 * - No marketing landing page for native apps
 * - Users downloaded from app store - go straight to auth after splash
 */
export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsAppLoading(false);
    };

    initializeApp();
  }, []);

  useEffect(() => {
    // Navigate to sign-in after splash completes
    if (!showSplash) {
      router.replace('/(auth)/sign-in');
    }
  }, [showSplash]);

  // Show splash screen
  if (showSplash) {
    return (
      <AppSplashScreen
        isLoading={isAppLoading}
        onLoadingComplete={() => setShowSplash(false)}
        minimumDisplayTime={2000}
        message="Initializing Neural Network..."
      />
    );
  }

  return null;
}

