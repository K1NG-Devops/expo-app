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
    'expo-notifications',
  ];

  // Always include expo-dev-client for local development
  // Only exclude for production EAS builds
  if (isDevBuild || !process.env.EAS_BUILD_PLATFORM) plugins.push('expo-dev-client');

  // Use consistent runtimeVersion policy to avoid OTA compatibility issues
  // appVersion works with remote version source and couples OTA compatibility to app version
  const runtimeVersion = { policy: 'appVersion' };

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
      googleServicesFile: fs.existsSync(path.resolve(__dirname, 'app/google-services.json')) 
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
    },
    extra: {
      router: {},
      eas: {
        projectId: 'eaf53603-ff2f-4a95-a2e6-28faa4b2ece8',
      },
    },
  };
};
