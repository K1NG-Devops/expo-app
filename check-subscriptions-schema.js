const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking subscriptions table schema...');
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Subscriptions table fields:', Object.keys(data[0]));
      console.log('Sample record:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('No subscriptions found. Trying to see what fields are available...');
      
      // Try a minimal insert to see schema
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert([{ status: 'test' }])
        .select();
      
      if (insertError) {
        console.log('Insert error reveals schema info:', insertError.message);
      }
    }
  }
})();
