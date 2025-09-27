const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSubscriptions() {
  console.log('🔍 Checking subscriptions directly...\n');

  try {
    // Check all subscriptions
    const { data: allSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*');

    if (subsError) {
      console.log('❌ Subscriptions error:', subsError);
      return;
    }

    console.log(`📊 Found ${allSubs.length} total subscriptions:`);
    allSubs.forEach((sub, index) => {
      console.log(`  ${index + 1}. School: ${sub.school_id}`);
      console.log(`     Plan: ${sub.plan_id}`);
      console.log(`     Status: ${sub.status}`);
      console.log(`     Seats: ${sub.seats_used}/${sub.seats_total}`);
      console.log('');
    });

    // Check preschools
    const { data: schools, error: schoolsError } = await supabase
      .from('preschools')
      .select('id, name');

    if (schoolsError) {
      console.log('❌ Schools error:', schoolsError);
    } else {
      console.log(`🏫 Found ${schools.length} schools:`);
      schools.forEach((school, index) => {
        console.log(`  ${index + 1}. ${school.name} (${school.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkSubscriptions();