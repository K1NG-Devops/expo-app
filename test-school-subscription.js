const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Creating test school subscription...');
  
  // Get premium plan
  const { data: premiumPlan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('tier', 'premium')
    .single();
  
  // Get an existing school (or create one for testing)
  const { data: existingSchools } = await supabase
    .from('preschools')
    .select('id, name')
    .limit(1);
  
  let testSchoolId;
  if (existingSchools && existingSchools.length > 0) {
    testSchoolId = existingSchools[0].id;
    console.log(`Using existing school: ${existingSchools[0].name} (${testSchoolId})`);
  } else {
    // Create a test school
    const testSchool = {
      name: 'Test Preschool for Payment',
      email: 'principal@testschool.com',
      phone: '+27123456789',
      address: '123 Test Street, Test City',
      subscription_tier: 'free',
      is_active: true,
      school_type: 'preschool',
      tenant_slug: `test-school-${Date.now()}`,
      subscription_status: 'trial',
      setup_completed: false,
      max_students: 50,
      max_teachers: 5
    };
    
    const { data: newSchool, error: schoolError } = await supabase
      .from('preschools')
      .insert([testSchool])
      .select('id, name')
      .single();
    
    if (schoolError) {
      console.error('Error creating test school:', schoolError);
      return;
    }
    
    testSchoolId = newSchool.id;
    console.log(`Created test school: ${newSchool.name} (${testSchoolId})`);
  }
  
  const transactionId = `TEST_SCHOOL_${Date.now()}`;
  
  // Create transaction for school subscription
  const testTransaction = {
    id: transactionId,
    school_id: testSchoolId,  // This is key - link to school
    subscription_plan_id: premiumPlan.id,
    amount: 295.00, // Premium plan price
    currency: 'ZAR',
    status: 'pending',
    payment_method: 'payfast',
    metadata: {
      scope: 'school',
      billing: 'monthly',
      seats: 15, // Premium plan allows 15 teachers
      invoice_number: `INV-${transactionId}`
    }
  };
  
  const { error: insertError } = await supabase
    .from('payment_transactions')
    .insert([testTransaction]);
  
  if (insertError) {
    console.error('Error creating transaction:', insertError);
    return;
  }
  
  console.log(`Created school payment transaction: ${transactionId}`);
  
  // Simulate PayFast webhook for SCHOOL subscription
  console.log('Simulating PayFast webhook for school subscription...');
  
  const webhookData = new URLSearchParams({
    merchant_id: '10041710',
    merchant_key: 'fdqf15u93s7qi',
    m_payment_id: transactionId,
    pf_payment_id: `PF_${Date.now()}`,
    payment_status: 'COMPLETE',
    amount_gross: '295.00',
    item_name: 'Premium Plan - Monthly',
    custom_str1: 'premium',         // Plan tier
    custom_str2: 'school',          // Scope - THIS IS THE KEY CHANGE
    custom_str3: 'principal-123',   // Principal/admin user ID
    custom_str4: '{"billing":"monthly","seats":15}',
    signature: 'test'
  });
  
  const response = await fetch('https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: webhookData
  });
  
  const result = await response.text();
  console.log(`Webhook response: ${response.status} - ${result}`);
  
  if (response.status === 200) {
    console.log('\n✅ School subscription webhook processed successfully!');
    
    // Check if school subscription was created/updated
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('school_id', testSchoolId)
      .order('created_at', { ascending: false });
    
    console.log(`\nFound ${subscriptions?.length || 0} subscriptions for school:`);
    if (subscriptions && subscriptions.length > 0) {
      const latest = subscriptions[0];
      console.log('Latest subscription:', JSON.stringify(latest, null, 2));
    }
    
    // Check if preschool tier was updated
    const { data: updatedSchool } = await supabase
      .from('preschools')
      .select('subscription_tier, subscription_status')
      .eq('id', testSchoolId)
      .single();
    
    if (updatedSchool) {
      console.log(`\nSchool updated - Tier: ${updatedSchool.subscription_tier}, Status: ${updatedSchool.subscription_status}`);
    }
  }
})();
