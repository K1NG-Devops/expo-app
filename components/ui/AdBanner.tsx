import React from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const TEST_BANNER_ID = TestIds.BANNER; // 'ca-app-pub-3940256099942544/6300978111'

export default function AdBanner() {
  if (Platform.OS !== 'android') return null;
  if (process.env.EXPO_PUBLIC_ENABLE_ADS === '0') return null;

  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <BannerAd unitId={TEST_BANNER_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
