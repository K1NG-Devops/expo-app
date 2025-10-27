const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test script to debug profile fetching
async function testProfileFetching() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('⚠️  This debug script should only be used in development!');
  console.log('🛡️  No sensitive data will be logged in production mode\n');

  console.log('1. Testing get_my_profile RPC (authenticated):');
  const { data: myProfile, error: myProfileError } = await supabase
    .rpc('get_my_profile')
    .single();
  
  if (myProfile) {
    console.log('✅ Profile fetch successful');
    console.log('   Role:', myProfile.role || 'none');
    console.log('   Has email:', !!myProfile.email);
  } else {
    console.log('❌ Profile fetch failed:', myProfileError?.message || 'Unknown error');
  }

  console.log('\n2. Testing profile table accessibility:');
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .limit(1);
  
  console.log('   Profile count accessible:', count || 0);

  console.log('\n3. Testing organization membership access:');
  const { data: orgTest } = await supabase
    .from('organization_members')
    .select('organization_id')
    .limit(1);
    
  console.log('   Can access org members:', !!orgTest && orgTest.length >= 0);
}

testProfileFetching().catch(console.error);
