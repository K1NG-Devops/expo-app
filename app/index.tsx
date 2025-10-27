import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import AppSplashScreen from '@/components/ui/AppSplashScreen';

/**
 * Root index route for EduDash Pro (mobile)
 * - Show branded splash then redirect to sign-in
 */
export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsAppLoading(false);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (!showSplash) router.replace('/(auth)/sign-in');
  }, [showSplash]);

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
