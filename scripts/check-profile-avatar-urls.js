#!/usr/bin/env node

/**
 * Check Profile Avatar URLs Script
 * 
 * This script checks the current avatar URLs stored in the profiles table
 * to identify any local file URIs that need to be cleaned up.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfileAvatars() {
  try {
    console.log('🔍 Checking profile avatar URLs...\n');

    // Fetch all profiles with avatar URLs
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .not('avatar_url', 'is', null);

    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('ℹ️ No profiles with avatar URLs found');
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles with avatar URLs:\n`);

    let localFileCount = 0;
    let supabaseUrlCount = 0;
    let otherUrlCount = 0;

    profiles.forEach((profile, index) => {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
      const avatar = profile.avatar_url;
      
      console.log(`${index + 1}. User: ${name}`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Avatar URL: ${avatar}`);
      
      if (avatar.startsWith('file:') || avatar.startsWith('blob:')) {
        console.log('   🚨 LOCAL FILE URI - NEEDS CLEANUP');
        localFileCount++;
      } else if (avatar.includes(supabaseUrl.replace('https://', '').replace('http://', ''))) {
        console.log('   ✅ Supabase Storage URL');
        supabaseUrlCount++;
      } else {
        console.log('   ⚠️ Other URL type');
        otherUrlCount++;
      }
      console.log('');
    });

    console.log('📈 Summary:');
    console.log(`   Local file URIs: ${localFileCount} ${localFileCount > 0 ? '⚠️' : ''}`);
    console.log(`   Supabase URLs: ${supabaseUrlCount} ✅`);
    console.log(`   Other URLs: ${otherUrlCount}`);

    if (localFileCount > 0) {
      console.log('\n🔧 Recommendation:');
      console.log('   Run cleanup script to remove local file URIs from the database.');
      console.log('   Users will need to re-upload their profile pictures.');
    } else {
      console.log('\n✅ All avatar URLs look good!');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkProfileAvatars();