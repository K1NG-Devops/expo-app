import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

let initialized = false;
export async function startAds() {
  if (initialized) return; initialized = true;
  if (process.env.EXPO_PUBLIC_ENABLE_ADS === '0') return;
  await mobileAds()
    .setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: ['EMULATOR'],
    })
    .then(() => mobileAds().initialize());
}
