#!/usr/bin/env node

/**
 * Check User Metadata Script
 * 
 * This script checks user metadata in Supabase Auth for any local file URIs
 * stored in avatar_url fields.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.log('\nℹ️ Service role key is needed to access user metadata in auth.users');
  console.log('You can find this in your Supabase project settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserMetadata() {
  try {
    console.log('🔍 Checking user metadata for avatar URLs...\n');

    // Use Supabase Admin API to get users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('ℹ️ No users found');
      return;
    }

    console.log(`📊 Found ${users.length} users, checking metadata...\n`);

    let localFileCount = 0;
    let supabaseUrlCount = 0;
    let otherUrlCount = 0;
    let usersWithAvatars = 0;

    users.forEach((user, index) => {
      const metadata = user.user_metadata || {};
      const avatarUrl = metadata.avatar_url;
      
      if (!avatarUrl) return;
      
      usersWithAvatars++;
      const email = user.email || 'Unknown';
      
      console.log(`${usersWithAvatars}. User: ${email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Avatar URL: ${avatarUrl}`);
      
      if (avatarUrl.startsWith('file:') || avatarUrl.startsWith('blob:')) {
        console.log('   🚨 LOCAL FILE URI - NEEDS CLEANUP');
        localFileCount++;
      } else if (avatarUrl.includes(supabaseUrl.replace('https://', '').replace('http://', ''))) {
        console.log('   ✅ Supabase Storage URL');
        supabaseUrlCount++;
      } else {
        console.log('   ⚠️ Other URL type');
        otherUrlCount++;
      }
      console.log('');
    });

    if (usersWithAvatars === 0) {
      console.log('ℹ️ No users with avatar URLs in metadata found');
      return;
    }

    console.log('📈 Summary:');
    console.log(`   Users with avatars: ${usersWithAvatars}`);
    console.log(`   Local file URIs: ${localFileCount} ${localFileCount > 0 ? '🚨' : ''}`);
    console.log(`   Supabase URLs: ${supabaseUrlCount} ✅`);
    console.log(`   Other URLs: ${otherUrlCount}`);

    if (localFileCount > 0) {
      console.log('\n🔧 Recommendation:');
      console.log('   Run cleanup script to remove local file URIs from user metadata.');
      console.log('   Users will need to re-upload their profile pictures.');
    } else {
      console.log('\n✅ All avatar URLs in user metadata look good!');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
    if (error.message?.includes('JWT')) {
      console.error('\nℹ️ Ensure SUPABASE_SERVICE_ROLE_KEY is set correctly');
    }
  }
}

checkUserMetadata();