const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to fix Android Manifest merger errors
 * - Adds android:appComponentFactory with proper value to avoid merger errors
 * - Works with both local builds (expo run:android) and EAS builds
 */
const withAndroidManifestFix = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Ensure the application tag exists
    if (androidManifest.manifest.application) {
      const application = androidManifest.manifest.application[0];
      
      // Add the appComponentFactory attribute to fix the merger error
      application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
      
      // Ensure tools namespace is declared
      if (!androidManifest.manifest.$['xmlns:tools']) {
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
      
      // Add tools:replace for appComponentFactory
      const existingReplace = application.$['tools:replace'] || '';
      if (!existingReplace.includes('android:appComponentFactory')) {
        application.$['tools:replace'] = existingReplace 
          ? `${existingReplace},android:appComponentFactory`
          : 'android:appComponentFactory';
      }
    }
    
    return config;
  });
};

module.exports = withAndroidManifestFix;
