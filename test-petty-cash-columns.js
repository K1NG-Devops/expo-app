/**
 * Test script to check which column names are used in petty_cash_transactions table
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testColumnNames() {
  console.log('🔍 Testing petty_cash_transactions table column names...\n')
  
  try {
    // Test with school_id
    console.log('1. Testing with school_id column...')
    const { data: schoolIdTest, error: schoolIdError } = await supabase
      .from('petty_cash_transactions')
      .select('id, school_id')
      .limit(1)
    
    if (schoolIdError) {
      console.log('❌ school_id column error:', schoolIdError.message)
    } else {
      console.log('✅ school_id column works')
      console.log('   Sample data:', schoolIdTest)
    }
    
    // Test with preschool_id
    console.log('\n2. Testing with preschool_id column...')
    const { data: preschoolIdTest, error: preschoolIdError } = await supabase
      .from('petty_cash_transactions')
      .select('id, preschool_id')
      .limit(1)
    
    if (preschoolIdError) {
      console.log('❌ preschool_id column error:', preschoolIdError.message)
    } else {
      console.log('✅ preschool_id column works')
      console.log('   Sample data:', preschoolIdTest)
    }
    
    // Get table schema info
    console.log('\n3. Checking table schema...')
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'petty_cash_transactions')
      .eq('table_schema', 'public')
      .in('column_name', ['school_id', 'preschool_id'])
    
    if (schemaError) {
      console.log('❌ Schema query error:', schemaError.message)
    } else {
      console.log('✅ Schema info:')
      schemaInfo.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testColumnNames().then(() => {
  console.log('\n✨ Column name test completed')
}).catch(console.error)