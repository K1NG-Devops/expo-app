#!/usr/bin/env node

/**
 * Quick script to check if push_devices table has the required structure
 */

const fs = require('fs');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function checkDatabase() {
  try {
    console.log('🔍 Checking push_devices table structure...');

    // Check if table exists and get structure
    const response = await fetch(`${SUPABASE_URL}/rest/v1/push_devices?limit=0`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });

    if (response.ok) {
      console.log('✅ push_devices table exists and is accessible');
    } else {
      console.error('❌ push_devices table access failed:', response.status, response.statusText);
      return;
    }

    // Try to insert/upsert a test record to check if all columns exist
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      expo_push_token: 'ExponentPushToken[test-token-123]',
      platform: 'android',
      is_active: false,
      device_installation_id: 'test-device-123',
      device_metadata: { test: true },
      language: 'en',
      timezone: 'UTC',
      last_seen_at: new Date().toISOString(),
    };

    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/push_devices`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(testData),
    });

    if (testResponse.ok) {
      console.log('✅ All required columns exist');
      
      // Clean up test record
      await fetch(`${SUPABASE_URL}/rest/v1/push_devices?user_id=eq.00000000-0000-0000-0000-000000000000&device_installation_id=eq.test-device-123`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
      });
      console.log('🧹 Cleaned up test record');
    } else {
      const errorText = await testResponse.text();
      console.error('❌ Column structure issue:', testResponse.status, errorText);
      
      // If it's a column issue, run the migration
      if (errorText.includes('column') && errorText.includes('does not exist')) {
        console.log('🔧 Running migration...');
        await runMigration();
      }
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync('./db/20250917_enhance_push_devices.sql', 'utf8');
    console.log('📄 Loaded migration SQL');
    
    // Execute migration via Supabase SQL endpoint (if available)
    // Note: This might require additional setup in production
    console.log('⚠️  Please run the migration manually in Supabase dashboard:');
    console.log('   1. Go to SQL Editor in your Supabase dashboard');
    console.log('   2. Copy and run the contents of db/20250917_enhance_push_devices.sql');
    console.log('   3. Re-run this script to verify');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

checkDatabase().then(() => {
  console.log('✅ Database check complete');
}).catch(console.error);