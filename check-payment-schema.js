const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking payment_transactions table schema...');
  
  // Try to get a sample record to see the structure
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Sample record structure:');
      console.log(Object.keys(data[0]));
      console.log('Full sample:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('No existing records. Let\'s check what fields are required...');
      
      // Try to insert with minimal data to see what's required
      const { error: insertError } = await supabase
        .from('payment_transactions')
        .insert([{ id: 'SCHEMA_TEST' }])
        .select();
      
      if (insertError) {
        console.log('Insert error reveals required fields:', insertError.message);
      }
    }
  }
})();
