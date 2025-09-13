import React from 'react';
import { Platform, View } from 'react-native';

export default function AdBanner() {
  // Explicitly exclude web platform to prevent bundling issues
  if (Platform.OS === 'web') return null;
  if (Platform.OS !== 'android') return null;
  if (process.env.EXPO_PUBLIC_ENABLE_ADS === '0') return null;

  // Lazy-require the native module to avoid crashes if the dev client
  // wasn't built with react-native-google-mobile-ads.
  let BannerAd: any, BannerAdSize: any, TestIds: any;
  try {
    const ads = require('react-native-google-mobile-ads');
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch {
    // Native module not available in this build; no-op.
    return null;
  }

  const TEST_BANNER_ID = TestIds.BANNER; // 'ca-app-pub-3940256099942544/6300978111'

  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <BannerAd unitId={TEST_BANNER_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
