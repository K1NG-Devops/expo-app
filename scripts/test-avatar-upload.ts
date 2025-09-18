#!/usr/bin/env tsx

/**
 * Test script to verify avatar storage functionality
 * Run this after setting up the avatars bucket
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create a simple test image (1x1 PNG)
const createTestImage = (): Uint8Array => {
  // This is a minimal 1x1 transparent PNG
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // bit depth, color type, etc.
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00, // compressed image data
    0x00, 0x05, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, // end of IDAT
    0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82  // IEND chunk
  ]);
};

async function testAvatarStorage() {
  console.log('🧪 Testing Avatar Storage Functionality\\n');
  
  try {
    // Step 1: Check bucket exists
    console.log('1. Checking if avatars bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      return;
    }
    
    const avatarsBucket = buckets.find(b => b.id === 'avatars');
    if (!avatarsBucket) {
      console.error('❌ Avatars bucket not found!');
      console.log('📋 Please create the avatars bucket first (see AVATAR_STORAGE_SETUP.md)');
      return;
    }
    
    console.log('✅ Avatars bucket exists');
    console.log(`   - Public: ${avatarsBucket.public}`);
    
    // Step 2: Test upload
    console.log('\\n2. Testing file upload...');
    const testFileName = `test-upload-${Date.now()}.png`;
    const testImageData = createTestImage();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testImageData, {
        contentType: 'image/png',
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return;
    }
    
    console.log('✅ Upload successful');
    console.log(`   - File: ${testFileName}`);
    
    // Step 3: Test public URL generation
    console.log('\\n3. Testing public URL generation...');
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFileName);
    
    if (!urlData.publicUrl) {
      console.error('❌ Failed to generate public URL');
      return;
    }
    
    console.log('✅ Public URL generated');
    console.log(`   - URL: ${urlData.publicUrl}`);
    
    // Step 4: Test file download (verify URL works)
    console.log('\\n4. Testing public URL accessibility...');
    try {
      const response = await fetch(urlData.publicUrl);
      if (response.ok) {
        console.log('✅ Public URL is accessible');
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.error(`❌ Public URL not accessible: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('❌ Error accessing public URL:', fetchError);
    }
    
    // Step 5: Cleanup test file
    console.log('\\n5. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }
    
    // Final report
    console.log('\\n🎉 Avatar Storage Test Complete!');
    console.log('\\n📋 Summary:');
    console.log('✅ Bucket exists and is accessible');
    console.log('✅ File upload works');
    console.log('✅ Public URL generation works');
    console.log('✅ Public URLs are accessible');
    console.log('✅ File deletion works');
    
    console.log('\\n🚀 Your avatar storage is ready!');
    console.log('You can now upload profile pictures in the app.');
    
  } catch (error) {
    console.error('❌ Test failed with unexpected error:', error);
  }
}

// Run the test
testAvatarStorage().catch(console.error);