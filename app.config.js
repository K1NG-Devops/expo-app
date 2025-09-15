// app.config.js
// Use a dynamic config so we can disable expo-dev-client for preview/production (OTA compatibility)

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
        androidAppId: 'ca-app-pub-3940256099942544~3347511713',
        iosAppId: 'ca-app-pub-3940256099942544~1458002511',
        androidManifestApplicationMetaData: {
          'com.google.android.gms.ads.APPLICATION_ID': 'ca-app-pub-3940256099942544~3347511713',
        },
      },
    ],
    'expo-localization',
    'expo-secure-store',
    'expo-notifications',
  ];

  // Only include expo-dev-client for development builds
  if (isDevBuild) plugins.push('expo-dev-client');

  return {
    ...config,
    name: 'EduDashPro',
    slug: 'edudashpro',
    owner: 'edudashpro',
    version: '1.0.0',
    runtimeVersion: { policy: 'appVersion' },
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
      googleServicesFile: './google-services.json',
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
        projectId: '253b1057-8489-44cf-b0e3-c3c10319a298',
      },
    },
  };
};
