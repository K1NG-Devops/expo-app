import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSubscription } from './SubscriptionContext';

interface AdsContextType {
  maybeShowInterstitial: (placement: string) => Promise<boolean>;
  offerRewarded: (placement: string) => Promise<{ shown: boolean; rewarded: boolean }>;
  canShowBanner: boolean;
  adsEnabled: boolean;
  loading: boolean;
}

const AdsContext = createContext<AdsContextType | null>(null);

interface AdsProviderProps {
  children: React.ReactNode;
}

export function AdsProvider({ children }: AdsProviderProps) {
  const { tier, ready: subscriptionReady } = useSubscription();
  const [loading, setLoading] = useState(true);

  // Determine if ads should be shown based on subscription
  const adsEnabled = subscriptionReady && tier === 'free';
  const canShowBanner = adsEnabled;

  useEffect(() => {
    // Simulate ads initialization
    const initializeAds = async () => {
      setLoading(true);
      // Add actual ad SDK initialization here if needed
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);
    };

    if (subscriptionReady) {
      initializeAds();
    }
  }, [subscriptionReady]);

  const maybeShowInterstitial = async (placement: string): Promise<boolean> => {
    if (!adsEnabled) return false;
    
    // In development/testing, show alert instead of actual ad
    if (__DEV__) {
      console.log('Would show interstitial ad for placement:', placement);
      return true;
    }

    // Add actual interstitial ad logic here
    return false;
  };

  const offerRewarded = async (placement: string): Promise<{ shown: boolean; rewarded: boolean }> => {
    if (!adsEnabled) return { shown: false, rewarded: false };
    
    // In development/testing, simulate rewarded ad
    if (__DEV__) {
      console.log('Would show rewarded ad for placement:', placement);
      return { shown: true, rewarded: true };
    }

    // Add actual rewarded ad logic here
    return { shown: false, rewarded: false };
  };

  const value: AdsContextType = {
    maybeShowInterstitial,
    offerRewarded,
    canShowBanner,
    adsEnabled,
    loading,
  };

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextType {
  const context = useContext(AdsContext);
  if (!context) {
    throw new Error('useAds must be used within an AdsProvider');
  }
  return context;
}