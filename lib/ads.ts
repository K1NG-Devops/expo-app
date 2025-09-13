import { Platform } from 'react-native';

let initialized = false;
export async function startAds() {
  if (initialized) return; initialized = true;
  if (Platform.OS === 'web') return; // Skip on web
  if (process.env.EXPO_PUBLIC_ENABLE_ADS === '0') return;
  
  try {
    // Dynamically import ads module only on mobile platforms
    const { default: mobileAds, MaxAdContentRating } = require('react-native-google-mobile-ads');
    
    await mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: ['EMULATOR'],
      })
      .then(() => mobileAds().initialize());
  } catch (error) {
    console.warn('Failed to initialize ads:', error);
  }
}
