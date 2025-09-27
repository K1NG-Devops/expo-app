const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPlansDirectly() {
  console.log('🔍 Checking subscription plans directly...\n');

  try {
    // Get ALL subscription plans (including inactive)
    const { data: allPlans, error: allPlansError } = await supabase
      .from('subscription_plans')
      .select('*');

    if (allPlansError) {
      console.error('❌ Error fetching all plans:', allPlansError);
      return;
    }

    console.log(`📊 Total plans in database: ${allPlans.length}`);
    
    if (allPlans.length > 0) {
      console.log('\nAll plans:');
      allPlans.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan.name} (${plan.tier})`);
        console.log(`     Active: ${plan.is_active}`);
        console.log(`     Price: R${plan.price_monthly}/month`);
        console.log(`     Features: ${JSON.stringify(plan.features)}`);
        console.log(`     Created: ${plan.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No plans found in database!');
    }

    // Check subscriptions table structure
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);

    if (subsError) {
      console.log('❌ Subscriptions error:', subsError);
    } else {
      console.log('✅ Subscriptions table accessible');
      if (subs.length > 0) {
        console.log('Sample subscription columns:', Object.keys(subs[0]));
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkPlansDirectly();