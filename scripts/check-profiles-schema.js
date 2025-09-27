const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProfilesSchema() {
  console.log('🔍 Checking profiles table structure...\n');

  try {
    // Get a sample record to see the columns
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.log('❌ Profiles error:', profilesError);
      return;
    }

    if (profiles && profiles.length > 0) {
      console.log('📋 Profiles table columns:');
      Object.keys(profiles[0]).forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });
    } else {
      console.log('📋 No profiles found, but table accessible');
    }

    // Check current user count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    console.log(`\n👥 Current profile count: ${count}`);

    // List current users
    const { data: users } = await supabase
      .from('profiles')
      .select('email, role, name');

    if (users) {
      console.log('\n👤 Current users:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.role}) - ${user.name || 'No Name'}`);
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkProfilesSchema();