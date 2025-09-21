const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking RevenueCat webhook integration...');
  
  // Check webhook events log
  const { data: events } = await supabase
    .from('revenuecat_webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log(`\n📋 RevenueCat Webhook Events (${events?.length || 0} recent):`);
  if (events && events.length > 0) {
    events.forEach(event => {
      console.log(`  - ${event.event_id}: ${event.type} (${event.app_user_id})`);
      console.log(`    Environment: ${event.environment}, Processed: ${event.processed}`);
    });
  }
  
  // Check school subscription status
  const schoolId = '2c37b53d-9092-46a2-955e-6f657368a756';
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('school_id', schoolId)
    .single();
  
  if (subscription) {
    console.log(`\n🏫 School Subscription Status:`);
    console.log(`  Status: ${subscription.status}`);
    console.log(`  Plan: ${subscription.metadata?.plan_name || 'Unknown'}`);
    console.log(`  Billing: ${subscription.billing_frequency}`);
    console.log(`  End Date: ${subscription.end_date}`);
    console.log(`  RevenueCat: ${subscription.metadata?.activated_by_revenuecat ? 'Yes' : 'No'}`);
  }
  
  // Check school tier
  const { data: school } = await supabase
    .from('preschools')
    .select('subscription_tier, subscription_status')
    .eq('id', schoolId)
    .single();
  
  if (school) {
    console.log(`\n🎯 School Tier: ${school.subscription_tier} (${school.subscription_status})`);
  }
  
  console.log('\n🎉 RevenueCat integration check complete!');
})();
