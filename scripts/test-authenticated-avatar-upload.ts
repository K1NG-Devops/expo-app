#!/usr/bin/env tsx

/**
 * Test avatar upload with authenticated user
 * This simulates what happens in the actual app
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a minimal test image (1x1 PNG)
const createTestImage = (): Uint8Array => {
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
    0x00, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
};

async function testAuthenticatedUpload() {
  console.log('🔐 Testing Authenticated Avatar Upload\\n');
  
  try {
    // Check current authentication status
    console.log('1. Checking authentication status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('\\n📋 To test authenticated upload:');
      console.log('1. Open your app and sign in');
      console.log('2. Try uploading a profile picture');
      console.log('3. Check the browser console for any errors');
      console.log('\\nOR manually run this with a valid session token');
      return;
    }
    
    console.log('✅ User authenticated');
    console.log(`   - User ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    
    // Test upload with proper filename pattern
    console.log('\\n2. Testing authenticated upload...');
    const testFileName = `profile_${user.id}_${Date.now()}.png`;
    const testImage = createTestImage();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testImage, {
        contentType: 'image/png',
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      
      if (uploadError.message.includes('policy')) {
        console.log('\\n🚨 RLS Policy issue:');
        console.log('   - The RLS policies need to be set up');
        console.log('   - Run the SQL from scripts/fix-avatar-storage-rls.sql');
        console.log('   - In your Supabase SQL Editor');
      }
      return;
    }
    
    console.log('✅ Upload successful');
    console.log(`   - File: ${testFileName}`);
    console.log(`   - Path: ${uploadData.path}`);
    
    // Generate public URL
    console.log('\\n3. Testing public URL...');
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);
    
    console.log('✅ Public URL generated');
    console.log(`   - URL: ${urlData.publicUrl}`);
    
    // Test URL accessibility
    console.log('\\n4. Testing URL accessibility...');
    try {
      const response = await fetch(urlData.publicUrl);
      if (response.ok) {
        console.log('✅ Public URL works');
        console.log(`   - Status: ${response.status}`);
      } else {
        console.error(`❌ URL returned: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
    }
    
    // Clean up
    console.log('\\n5. Cleaning up...');
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete:', deleteError.message);
    } else {
      console.log('✅ Test file deleted');
    }
    
    console.log('\\n🎉 Authenticated Upload Test Complete!');
    console.log('\\n✅ Your avatar storage should work in the app now');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkExistingFiles() {
  console.log('\\n📂 Checking existing files in avatars bucket...');
  
  try {
    const { data: files, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 10 });
    
    if (error) {
      console.error('❌ Error listing files:', error.message);
      return;
    }
    
    if (files.length === 0) {
      console.log('📭 No files found in avatars bucket');
    } else {
      console.log(`📁 Found ${files.length} files:`);
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the tests
async function runTests() {
  await checkExistingFiles();
  await testAuthenticatedUpload();
}

runTests().catch(console.error);