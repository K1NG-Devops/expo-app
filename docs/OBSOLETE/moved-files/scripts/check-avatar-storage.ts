#!/usr/bin/env tsx

/**
 * Diagnostic script to check Supabase storage bucket status and permissions
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
  console.error('Please check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatarStorage() {
  console.log('🔍 Checking Supabase Storage Configuration...\n');
  
  try {
    // Check if we can list buckets
    console.log('1. Listing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }
    
    console.log('✅ Buckets found:', buckets.map(b => b.id).join(', '));
    
    // Check if avatars bucket exists
    const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
    if (!avatarsBucket) {
      console.error('❌ Avatars bucket not found!');
      console.log('Available buckets:', buckets.map(b => `${b.id} (public: ${b.public})`));
      return;
    }
    
    console.log('✅ Avatars bucket exists');
    console.log(`   - Public: ${avatarsBucket.public}`);
    console.log(`   - Created: ${avatarsBucket.created_at}`);
    
    // Try to list files in avatars bucket
    console.log('\n2. Testing bucket access...');
    const { data: files, error: filesError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 5 });
    
    if (filesError) {
      console.error('❌ Error accessing avatars bucket:', filesError.message);
      return;
    }
    
    console.log('✅ Can access avatars bucket');
    console.log(`   - Files in bucket: ${files.length}`);
    
    if (files.length > 0) {
      console.log('   - Sample files:');
      files.slice(0, 3).forEach(file => {
        console.log(`     * ${file.name} (${file.metadata?.size || 'unknown size'})`);
      });
    }
    
    // Test public URL generation
    console.log('\n3. Testing public URL generation...');
    const testFilename = 'test-file.jpg';
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(testFilename);
    
    if (urlData.publicUrl) {
      console.log('✅ Can generate public URLs');
      console.log(`   - Sample URL pattern: ${urlData.publicUrl}`);
    } else {
      console.error('❌ Cannot generate public URLs');
    }
    
    // Test authentication
    console.log('\n4. Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️  No authenticated user (expected for diagnostic script)');
    } else if (user) {
      console.log('✅ User authenticated:', user.email);
    } else {
      console.log('ℹ️  No authenticated user');
    }
    
    console.log('\n🎉 Supabase Storage Check Complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkAvatarStorage().catch(console.error);