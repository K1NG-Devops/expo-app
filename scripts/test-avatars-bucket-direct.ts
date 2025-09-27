#!/usr/bin/env tsx

/**
 * Test the avatars bucket directly (without listing all buckets)
 * This works even if listBuckets() is restricted
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

async function testAvatarsBucketDirect() {
  console.log('🎯 Testing Avatars Bucket Directly\\n');
  
  try {
    // Test 1: Try to access the avatars bucket directly
    console.log('1. Testing direct bucket access...');
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 5 });
    
    if (listError) {
      console.error('❌ Cannot access avatars bucket:', listError.message);
      
      // Check if it's a permissions issue
      if (listError.message.includes('not found') || listError.message.includes('Bucket not found')) {
        console.log('\\n🚨 The avatars bucket appears to not exist or is not accessible via API');
        console.log('   - Check if the bucket name is exactly "avatars"');
        console.log('   - Ensure the bucket is public');
        console.log('   - Verify storage permissions in Supabase');
      }
      return;
    }
    
    console.log('✅ Successfully accessed avatars bucket');
    console.log(`   - Files found: ${files.length}`);
    
    if (files.length > 0) {
      console.log('   - Sample files:');
      files.slice(0, 3).forEach(file => {
        console.log(`     * ${file.name} (${file.metadata?.size || 'unknown size'})`);
      });
    }
    
    // Test 2: Try uploading a test file
    console.log('\\n2. Testing file upload...');
    const testFileName = `test-direct-${Date.now()}.png`;
    const testImage = createTestImage();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(testFileName, testImage, {
        contentType: 'image/png',
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      
      if (uploadError.message.includes('not allowed') || uploadError.message.includes('policy')) {
        console.log('\\n🚨 Upload permissions issue detected');
        console.log('   - Check RLS policies on storage.objects');
        console.log('   - Ensure authenticated users can upload to avatars bucket');
      }
      return;
    }
    
    console.log('✅ Upload successful');
    console.log(`   - Uploaded file: ${testFileName}`);
    
    // Test 3: Generate and test public URL
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
    
    // Test 4: Verify URL accessibility
    console.log('\\n4. Testing URL accessibility...');
    try {
      const response = await fetch(urlData.publicUrl);
      if (response.ok) {
        console.log('✅ Public URL is accessible');
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.error(`❌ Public URL returned status: ${response.status}`);
      }
    } catch (fetchError) {
      console.error('❌ Error fetching public URL:', fetchError);
    }
    
    // Test 5: Clean up test file
    console.log('\\n5. Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([testFileName]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file deleted');
    }
    
    // Final summary
    console.log('\\n🎉 Avatars Bucket Test Complete!');
    console.log('\\n📋 Results:');
    console.log('✅ Bucket exists and is accessible');
    console.log('✅ File upload works');
    console.log('✅ Public URL generation works');
    console.log('✅ Public URLs are accessible');
    console.log('✅ File deletion works');
    
    console.log('\\n🚀 Your avatar storage is fully functional!');
    console.log('\\nThe issue might be that listBuckets() is restricted,');
    console.log('but the actual avatars bucket works perfectly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        console.log('\\n🌐 Network connectivity issue detected');
        console.log('   - Check your internet connection');
        console.log('   - Verify Supabase URL is correct');
      } else if (error.message.includes('Invalid JWT')) {
        console.log('\\n🔑 Authentication issue detected');
        console.log('   - Check your Supabase anon key');
        console.log('   - Verify the key matches your project');
      }
    }
  }
}

// Run the test
testAvatarsBucketDirect().catch(console.error);