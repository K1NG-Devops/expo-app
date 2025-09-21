const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking subscription setup...');
  
  // Check subscription plans
  const { data: plans, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true);
  
  if (planError) {
    console.error('Plan Error:', planError);
  } else {
    console.log(`Found ${plans.length} active subscription plans:`);
    plans.forEach(plan => {
      console.log(`- ${plan.tier}: ${plan.name} (Max teachers: ${plan.max_teachers})`);
    });
  }
  
  // Check if we can create a test transaction
  const testTransaction = {
    id: 'TEST_1758406950868',
    amount: 150.00,
    currency: 'ZAR',
    status: 'pending',
    payment_method: 'payfast',
    school_id: null, // For user subscription
    user_id: null,   // We'll need a test user
    metadata: {
      plan_tier: 'premium',
      billing: 'monthly'
    }
  };
  
  console.log('\\nTest transaction structure:', JSON.stringify(testTransaction, null, 2));
})();
