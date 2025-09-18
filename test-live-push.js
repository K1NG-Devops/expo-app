#!/usr/bin/env node

/**
 * Live Push Notification Sender
 * 
 * This script sends actual push notifications to devices registered in your database.
 * Perfect for testing the notification system end-to-end.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Send push notification via Expo's push service
 */
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
    badge: 1
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get active push devices from database
 */
async function getActivePushDevices() {
  // First check if push_devices table exists and get devices
  const { data: devices, error: devicesError } = await supabase
    .from('push_devices')
    .select(`
      expo_push_token,
      user_id,
      platform,
      device_metadata,
      last_seen_at
    `)
    .eq('is_active', true)
    .not('expo_push_token', 'is', null);

  if (devicesError) {
    console.error('Database error fetching devices:', devicesError);
    return [];
  }

  if (!devices || devices.length === 0) {
    return [];
  }

  // Get user info for each device
  const devicePromises = devices.map(async (device) => {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('full_name, email, role')
      .eq('id', device.user_id)
      .single();

    if (userError) {
      console.warn(`Could not fetch user for device ${device.user_id}:`, userError.message);
      return null;
    }

    return {
      ...device,
      users: user
    };
  });

  const results = await Promise.all(devicePromises);
  return results.filter(device => device !== null);
}

/**
 * Main test function
 */
async function runPushNotificationTest() {
  console.log('🚀 EduDash Pro Live Push Notification Test');
  console.log('==========================================\n');

  // Get active devices
  console.log('1. Fetching active push devices...');
  const devices = await getActivePushDevices();
  
  if (devices.length === 0) {
    console.log('❌ No active push devices found');
    console.log('📱 To register a device:');
    console.log('   1. Install the EduDash Pro app on your phone');
    console.log('   2. Sign in and go to Settings');
    console.log('   3. Allow push notifications when prompted');
    console.log('   4. The device should auto-register');
    return;
  }

  console.log(`✅ Found ${devices.length} active device(s):`);
  devices.forEach((device, index) => {
    console.log(`   ${index + 1}. ${device.users.full_name} (${device.users.role}) - ${device.platform}`);
  });

  // Sample notifications for different roles
  const notifications = {
    parent: {
      title: '📚 Homework Assigned',
      body: 'Math worksheet due Friday. Your child can use AI Study Coach for help!',
      data: { type: 'homework', action: 'view_homework' }
    },
    teacher: {
      title: '🤖 AI Quota Update',
      body: 'You have 15 lesson generations remaining this month.',
      data: { type: 'ai_quota', action: 'view_usage' }
    },
    principal: {
      title: '📊 Weekly Report Ready',
      body: 'School performance report is now available in your dashboard.',
      data: { type: 'report', action: 'view_analytics' }
    },
    super_admin: {
      title: '🚨 System Alert',
      body: 'New school registration requires approval.',
      data: { type: 'admin', action: 'review_registration' }
    }
  };

  // Send notifications
  console.log('\n2. Sending test notifications...\n');
  
  for (const device of devices) {
    const userRole = device.users.role;
    const notification = notifications[userRole] || notifications.parent;
    
    console.log(`📱 Sending to ${device.users.full_name} (${userRole})...`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Body: ${notification.body}`);
    
    const result = await sendPushNotification(
      device.expo_push_token,
      notification.title,
      notification.body,
      notification.data
    );

    if (result.success) {
      console.log(`   ✅ Sent successfully`);
      if (result.result.data && result.result.data[0]) {
        const status = result.result.data[0].status;
        if (status === 'error') {
          console.log(`   ⚠️  Expo reported error: ${result.result.data[0].message}`);
        }
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    console.log(''); // blank line
  }

  console.log('3. Test complete! 🎉');
  console.log('\n📋 What to check:');
  console.log('- Look for notifications on your device');
  console.log('- Check notification sound/vibration');
  console.log('- Tap notifications to test deep linking');
  console.log('- Verify notifications appear while app is open/closed');

  console.log('\n🔧 Troubleshooting:');
  console.log('- Ensure device notifications are enabled');
  console.log('- Check device "Do Not Disturb" settings');
  console.log('- Verify the app has notification permissions');
  console.log('- Test on physical device (not emulator)');
}

// Run the test
runPushNotificationTest().catch(console.error);