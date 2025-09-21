const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking PayFast ITN logs...');
  
  const { data, error } = await supabase
    .from('payfast_itn_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} PayFast ITN log entries:`);
    data.forEach((log, index) => {
      console.log(`${index + 1}. ${log.created_at}: ${log.m_payment_id}`);
      console.log(`   Status: ${log.payment_status}, Valid: ${log.is_valid}`);
      console.log(`   Notes: ${log.processing_notes}`);
      console.log('');
    });
  }
})();
