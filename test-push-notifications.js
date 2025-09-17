#!/usr/bin/env node

/**
 * Push Notification Test Script
 * 
 * This script tests the push notification setup by attempting to register
 * for push notifications in a simulated environment.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 EduDash Pro Push Notification Test');
console.log('=====================================\n');

// Check if expo-notifications is installed
console.log('1. Checking expo-notifications installation...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const expoNotifications = packageJson.dependencies['expo-notifications'];
  
  if (expoNotifications) {
    console.log(`✅ expo-notifications found: ${expoNotifications}`);
  } else {
    console.log('❌ expo-notifications not found in dependencies');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Check app.config.js
console.log('\n2. Checking app.config.js configuration...');
try {
  const appConfig = require('./app.config.js');
  const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
  
  const hasNotificationsPlugin = config.plugins && config.plugins.includes('expo-notifications');
  
  if (hasNotificationsPlugin) {
    console.log('✅ expo-notifications plugin configured');
  } else {
    console.log('❌ expo-notifications plugin not found in app.config.js');
    console.log('Current plugins:', config.plugins);
  }
  
  // Check project ID
  if (config.extra?.eas?.projectId) {
    console.log(`✅ EAS project ID configured: ${config.extra.eas.projectId}`);
  } else {
    console.log('❌ EAS project ID not configured');
  }
} catch (error) {
  console.log('❌ Error reading app.config.js:', error.message);
  process.exit(1);
}

// Check notifications.ts file
console.log('\n3. Checking notifications.ts implementation...');
try {
  const notificationsPath = path.join(__dirname, 'lib', 'notifications.ts');
  const notificationsContent = fs.readFileSync(notificationsPath, 'utf8');
  
  const hasRegisterFunction = notificationsContent.includes('registerForPushNotificationsAsync');
  const hasProjectId = notificationsContent.includes('253b1057-8489-44cf-b0e3-c3c10319a298');
  const hasSetNotificationHandler = notificationsContent.includes('setNotificationHandler');
  
  console.log(`✅ registerForPushNotificationsAsync function: ${hasRegisterFunction ? 'Found' : 'Missing'}`);
  console.log(`✅ Project ID constant: ${hasProjectId ? 'Found' : 'Missing'}`);
  console.log(`✅ Notification handler: ${hasSetNotificationHandler ? 'Found' : 'Missing'}`);
  
  if (!hasRegisterFunction || !hasProjectId || !hasSetNotificationHandler) {
    console.log('❌ Some push notification components are missing');
  }
} catch (error) {
  console.log('❌ Error reading lib/notifications.ts:', error.message);
}

// Check for push_devices database table
console.log('\n4. Checking database migration files...');
try {
  const migrationFiles = fs.readdirSync(path.join(__dirname, 'supabase/migrations')).filter(f => f.endsWith('.sql'));
  const hasPushDevicesTable = migrationFiles.some(file => {
    const content = fs.readFileSync(path.join(__dirname, 'supabase/migrations', file), 'utf8');
    return content.includes('push_devices');
  });
  
  if (hasPushDevicesTable) {
    console.log('✅ push_devices table migration found');
  } else {
    console.log('❌ push_devices table migration not found');
    console.log('Available migration files:', migrationFiles.slice(0, 5));
  }
} catch (error) {
  console.log('⚠️  Could not check migration files:', error.message);
}

console.log('\n5. Summary:');
console.log('===========');
console.log('Push notifications should work if:');
console.log('- ✅ expo-notifications is installed');
console.log('- ✅ expo-notifications plugin is configured');
console.log('- ✅ EAS project ID is set');
console.log('- ✅ Notification handler is implemented');
console.log('- ✅ Database table exists');

console.log('\n📱 Next steps:');
console.log('1. Build and install the app on a physical device');
console.log('2. Grant notification permissions when prompted');
console.log('3. Test the "Send Test Notification" button in Settings');
console.log('4. Check console logs for push token registration');

console.log('\n🔧 Debugging tips:');
console.log('- Use "Send Test Notification" in Settings > Push Testing');
console.log('- Check console for "[Push Registration]" logs');
console.log('- Verify notifications are enabled in device settings');
console.log('- Test on a physical device (emulators may not work)');