// app.config.js
// Use a dynamic config so we can disable expo-dev-client for preview/production (OTA compatibility)

/**
 * @param {import('@expo/config').ConfigContext} ctx
 */
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE || process.env.NODE_ENV || '';
  const isDevBuild = profile === 'development' || profile === 'dev';

  // Environment selection for app behavior (dev or prod)
  const APP_ENV = process.env.APP_ENV === 'prod' ? 'prod' : 'dev';

  // Prefer env-provided EAS project ID so profiles or CI can inject it
  // This will be populated by EAS CLI when we initialize the project
  const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '';

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

  // Use consistent runtimeVersion policy to avoid OTA compatibility issues
  // appVersion works with remote version source and couples OTA compatibility to app version
  const runtimeVersion = { policy: 'appVersion' };

  return {
    ...config,
    name: APP_ENV === 'prod' ? 'EduDashPro' : 'EduDashPro Dev',
    slug: APP_ENV === 'prod' ? 'edudashpro' : 'edudashpro-dev',
    owner: APP_ENV === 'prod' ? 'dashpro' : 'edudashpro',
    version: '1.0.2',
    runtimeVersion,
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      checkAutomatically: isDevBuild ? 'ON_ERROR_RECOVERY' : 'ON_LOAD',
      fallbackToCacheTimeout: isDevBuild ? 0 : 5000,
    },
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: APP_ENV === 'prod' ? 'edudashpro' : 'edudashpro-dev',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: APP_ENV === 'prod' ? 'com.k1ngdevops.edudashpro' : 'com.k1ngdevops.edudashpro.dev',
    },
    android: {
      edgeToEdgeEnabled: true,
      package: APP_ENV === 'prod' ? 'com.edudashpro' : 'com.edudashpro.dev',
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
    privacy: 'https://www.edudashpro.org.za/marketing/privacy-policy',
    extra: {
      router: {},
      appEnv: APP_ENV,
      eas: {
        projectId: EAS_PROJECT_ID,
      },
      dataPolicy: {
        privacyPolicy: 'https://www.edudashpro.org.za/marketing/privacy-policy',
        termsOfService: 'https://www.edudashpro.org.za/marketing/terms-of-service',
        dataDeletion: 'https://www.edudashpro.org.za/marketing/data-deletion',
        accountDeletion: 'https://www.edudashpro.org.za/marketing/account-deletion',
      },
    },
  };
};
