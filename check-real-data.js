const { createClient } = require('@supabase/supabase-js');

const client = createClient('https://lvvvjywrmpcqrpvuptdi.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRealData() {
  console.log('🔑 Checking real database with service role...\n');
  
  // Check preschools
  const { data: preschools, count: preschoolCount } = await client
    .from('preschools')
    .select('id, name, subscription_tier, subscription_plan', { count: 'exact' });
  
  console.log(`✅ Found ${preschoolCount} preschools:`);
  preschools.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`);
    console.log(`      ID: ${p.id}`);
    console.log(`      Tier: ${p.subscription_tier || 'none'}`);
  });
  
  // Check users for each preschool
  for (const preschool of preschools) {
    console.log(`\n👥 Users in ${preschool.name}:`);
    const { data: users, count: userCount } = await client
      .from('users')
      .select('id, email, role, first_name, last_name', { count: 'exact' })
      .eq('preschool_id', preschool.id);
    
    if (userCount > 0) {
      users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.first_name || 'Unknown'} ${u.last_name || ''} (${u.email})`);
        console.log(`      Role: ${u.role || 'none'}, ID: ${u.id}`);
      });
    } else {
      console.log('   No users found');
    }
  }
  
  // Check profiles
  console.log('\n👤 Profiles:');
  const { data: profiles, count: profileCount } = await client
    .from('profiles')
    .select('id, email, role, first_name, last_name, preschool_id', { count: 'exact' });
  
  console.log(`✅ Found ${profileCount} profiles:`);
  if (profiles && profiles.length > 0) {
    profiles.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.first_name || 'Unknown'} ${p.last_name || ''} (${p.email})`);
      console.log(`      Role: ${p.role || 'none'}, Preschool: ${p.preschool_id || 'none'}`);
    });
  }
}

checkRealData().catch(console.error);