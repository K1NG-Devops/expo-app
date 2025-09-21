const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Creating proper test payment transaction...');

  // Parse simple CLI args (e.g., --scope=school --school_id=UUID)
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const m = arg.match(/^--([^=]+)=(.*)$/);
      return m ? [m[1], m[2]] : [arg.replace(/^--/, ''), true];
    })
  );
  const scope = (args.scope === 'school' || args.scope === 'user') ? args.scope : 'user';
  const billing = (args.billing === 'annual') ? 'annual' : 'monthly';

  // First get the premium plan ID
  const { data: premiumPlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('tier', 'premium')
    .single();

  if (!premiumPlan) {
    console.error('Premium plan not found');
    return;
  }

  let schoolId = null;
  if (scope === 'school') {
    schoolId = args.school_id || process.env.TEST_SCHOOL_ID || null;
    if (!schoolId) {
      // Try to discover one school id
      const { data: school } = await supabase
        .from('preschools')
        .select('id')
        .limit(1)
        .maybeSingle();
      schoolId = school?.id || null;
    }
    if (!schoolId) {
      console.error('No school_id available for school-scoped test. Provide --school_id=UUID');
      return;
    }
  }

  const transactionId = `TEST_${Date.now()}`;

  const testTransaction = {
    id: transactionId,
    school_id: scope === 'school' ? schoolId : null,
    subscription_plan_id: premiumPlan.id,
    amount: 150.0,
    currency: 'ZAR',
    status: 'pending',
    payment_method: 'payfast',
    metadata: {
      scope,
      billing,
      seats: 1,
    },
  };

  const { data, error } = await supabase
    .from('payment_transactions')
    .insert([testTransaction])
    .select();

  if (error) {
    console.error('Error creating transaction:', error);
  } else {
    console.log('\nCreated transaction:', data[0]);
    console.log(`\nTransaction ID for webhook test: ${transactionId}`);

    // Generate new test command with this transaction ID
    const crypto = require('crypto');

    const testData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID || '10041710',
      merchant_key: process.env.PAYFAST_MERCHANT_KEY || 'fdqf15u93s7qi',
      m_payment_id: transactionId,
      pf_payment_id: `PF_${Date.now()}`,
      payment_status: 'COMPLETE',
      amount_gross: '150.00',
      item_name: 'Premium Plan',
      custom_str1: 'premium',
      custom_str2: scope,
      custom_str3: scope === 'school' ? schoolId : 'test-user-id',
      custom_str4: `{\"billing\":\"${billing}\",\"seats\":1}`,
    };

    // Generate signature (preserve order, RFC1738 encoding)
    const encodeRFC1738 = (v) =>
      encodeURIComponent(v)
        .replace(/%20/g, '+')
        .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
    const orderedQs = Object.keys(testData)
      .map((key) => `${key}=${encodeRFC1738(testData[key])}`)
      .join('&');
    const passphrase = process.env.PAYFAST_PASSPHRASE || 'SuperAdmin-EDU';
    const signatureString = orderedQs + '&passphrase=' + encodeRFC1738(passphrase);
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    testData.signature = signature;

    const formData = Object.keys(testData)
      .map((key) => `${key}=${encodeURIComponent(testData[key])}`)
      .join('&');

    console.log('\nWebhook test command:');
    console.log(
      `curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook \\\n  -H "Content-Type: application/x-www-form-urlencoded" \\\n  -d "${formData}" \\\n  -w "\\nStatus: %{http_code}\\n"`
    );
  }
})();
