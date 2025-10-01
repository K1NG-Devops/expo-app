// app.config.js
// Use a dynamic config so we can disable expo-dev-client for preview/production (OTA compatibility)
const fs = require('fs');
const path = require('path');

/**
 * @param {import('@expo/config').ConfigContext} ctx
 */
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE || process.env.NODE_ENV || '';
  const isDevBuild = profile === 'development' || profile === 'dev';
  const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web';

  const plugins = [
    'expo-router',
    'sentry-expo',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
        androidManifestApplicationMetaData: {
          'com.google.android.gms.ads.APPLICATION_ID': process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
        },
      },
    ],
    'expo-localization',
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#00f5ff',
        defaultChannel: 'default',
        sounds: ['./assets/sounds/notification.wav'],
      },
    ],
  ];

  // Include expo-dev-client for mobile development only, not for web
  // Only exclude for production EAS builds or web platform
  if (!isWeb && (isDevBuild || !process.env.EAS_BUILD_PLATFORM)) plugins.push('expo-dev-client');

  // In bare workflow, runtimeVersion policies are not supported.
  // Use a static runtimeVersion string to match the native build.
  const runtimeVersion = '1.0.2';

  return {
    ...config,
    name: 'EduDashPro',
    slug: 'dashpro',
    owner: 'edudashprotest',
    version: '1.0.2',
    runtimeVersion,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'edudashpro',
    newArchEnabled: true,
    assetBundlePatterns: [
      '**/*',
      'locales/**/*.json',
    ],
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.k1ngdevops.edudashpro',
    },
    android: {
      edgeToEdgeEnabled: true,
      package: 'com.edudashpro',
      googleServicesFile:
        fs.existsSync(path.resolve(__dirname, 'app/google-services.json'))
          ? './app/google-services.json'
          : fs.existsSync(path.resolve(__dirname, 'android/app/google-services.json'))
            ? './android/app/google-services.json'
            : fs.existsSync(path.resolve(__dirname, 'google-services.json'))
              ? './google-services.json'
              : undefined,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.WAKE_LOCK',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.VIBRATE',
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
      ],
      blockedPermissions: [
        'android.permission.CAMERA',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      minSdkVersion: 21,
      versionCode: 3,
    },
    plugins,
    experiments: {
      typedRoutes: false,
    },
    developmentClient: {
      silentLaunch: true,
    },
    web: {
      favicon: './assets/favicon.png',
      name: 'EduDash Pro - AI-Powered Educational Platform',
      shortName: 'EduDash Pro',
      lang: 'en',
      scope: '/',
      themeColor: '#00f5ff',
      backgroundColor: '#0a0a0f',
      description:
        'Revolutionary AI-powered educational platform for preschools. Trusted by educators worldwide for next-generation learning experiences with Society 5.0 technology.',
      keywords: [
        'education',
        'preschool',
        'AI',
        'learning',
        'teachers',
        'parents',
        'lessons',
        'artificial intelligence',
        'educational technology',
        'edtech',
      ],
      author: 'EduDash Pro Team',
      viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
      startUrl: '/',
      display: 'standalone',
      orientation: 'any',
      bundler: 'metro',
    },
    updates: {
      url: 'https://u.expo.dev/eaf53603-ff2f-4a95-a2e6-28faa4b2ece8',
    },
    extra: {
      router: {},
      eas: {
        projectId: 'eaf53603-ff2f-4a95-a2e6-28faa4b2ece8',
      },
    },
  };
};
