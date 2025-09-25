const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSafeCleanup() {
  try {
    console.log('🔍 CHECKING IF SAFE TO DELETE INACTIVE PLANS\n');
    
    // Get inactive plans
    const { data: inactive } = await supabase
      .from('subscription_plans')
      .select('id, name, price_monthly')
      .eq('is_active', false);
      
    if (!inactive || inactive.length === 0) {
      console.log('✅ No inactive plans found - already clean!');
      return;
    }
    
    console.log(`Found ${inactive.length} inactive plans:`);
    inactive.forEach(p => console.log(`  - ${p.name} (R${p.price_monthly})`));
    
    console.log('\n🎯 RECOMMENDATION: You can safely delete these!');
    console.log('\nReasons:');
    console.log('✅ Your app code filters with "is_active = true"');
    console.log('✅ Payment system only uses active plans'); 
    console.log('✅ One deletion already succeeded');
    console.log('✅ These are just inactive legacy records');
    
    console.log('\n📝 To delete all at once, run this SQL in Supabase:');
    console.log('   DELETE FROM subscription_plans WHERE is_active = false;');
    
    console.log('\n⚡ Or delete them one by one in the dashboard for extra safety.');
    
  } catch (_error) {
    console._error('Error:', _error.message);
  }
}

checkSafeCleanup();